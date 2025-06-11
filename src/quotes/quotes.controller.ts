import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UsePipes,
  Req,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { QuotesService } from './quotes.service';
import { QuoteDto } from './dto/quote.dto';
import { EmailService } from '../common/services/email.service';
import { AntiSpamService } from '../common/services/antispam.service';

@Controller('api/quotes')
export class QuotesController {
  private readonly logger = new Logger(QuotesController.name);

  constructor(
    private readonly quotesService: QuotesService,
    private readonly emailService: EmailService,
    private readonly antiSpamService: AntiSpamService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async submitQuote(@Body() quoteDto: QuoteDto, @Req() req: Request) {
    try {
      const clientIP = this.getClientIP(req);

      this.logger.log(`Quote request from IP: ${clientIP}`);

      // Verificar spam y rate limiting
      const spamCheck = await this.antiSpamService.checkForSpam(
        quoteDto,
        clientIP,
      );

      if (spamCheck.isSpam) {
        this.logger.warn(`Spam detected in quote request:`, {
          ip: clientIP,
          score: spamCheck.score,
          reasons: spamCheck.reasons,
        });

        throw new HttpException(
          {
            error:
              'Your request has been flagged as suspicious. Please try again later or contact us directly.',
            code: 'SPAM_DETECTED',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Verificar reCAPTCHA si está presente
      if (quoteDto.recaptchaToken) {
        const recaptchaValid = await this.antiSpamService.verifyRecaptcha(
          quoteDto.recaptchaToken,
        );
        if (!recaptchaValid) {
          throw new HttpException(
            {
              error: 'reCAPTCHA verification failed. Please try again.',
              code: 'RECAPTCHA_FAILED',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Procesar la solicitud de cotización
      await this.quotesService.processQuoteRequest(quoteDto);

      // Enviar email
      const emailSent = await this.emailService.sendFormEmail({
        type: 'quote',
        data: quoteDto,
      });

      if (!emailSent) {
        this.logger.error('Failed to send quote request email');
        // No fallar la request por error de email, pero logear
      }

      this.logger.log(
        `Quote request processed successfully for ${quoteDto.email}`,
      );

      return {
        success: true,
        message:
          'Quote request submitted successfully. We will contact you within 24 hours.',
        data: {
          leadScore: spamCheck.score > 0 ? 100 - spamCheck.score : 95, // Invertir spam score para lead score
          estimatedValue: this.getBudgetValue(quoteDto.budget),
          priority: this.getLeadPriority(quoteDto),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error processing quote request:', error);
      throw new HttpException(
        {
          error: 'Failed to process quote request',
          code: 'INTERNAL_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getClientIP(req: Request): string {
    // Check various headers for the real IP
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip'];

    if (forwardedFor) {
      return Array.isArray(forwardedFor)
        ? forwardedFor[0].split(',')[0].trim()
        : forwardedFor.split(',')[0].trim();
    }

    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    if (cfConnectingIP) {
      return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP;
    }

    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private getBudgetValue(budget: string): string {
    const budgetMap: Record<string, string> = {
      'under-500': '$400',
      '500-1000': '$750',
      '1000-2000': '$1,500',
      '2000-5000': '$3,500',
      'over-5000': '$7,500+',
    };
    return budgetMap[budget] || 'Unknown';
  }

  private getLeadPriority(data: QuoteDto): string {
    let score = 0;

    // Budget-based priority
    if (data.budget === 'over-5000') score += 40;
    else if (data.budget === '2000-5000') score += 30;
    else if (data.budget === '1000-2000') score += 20;
    else score += 10;

    // Urgency-based priority
    if (data.urgency === 'asap') score += 30;
    else if (data.urgency === 'this-month') score += 20;
    else if (data.urgency === 'next-month') score += 10;

    // Completeness bonus
    if (data.preferredDate && data.preferredTime) score += 15;
    if (data.width && data.height) score += 10;
    if (data.installationType) score += 5;

    if (score >= 70) return '🔥 HIGH';
    if (score >= 40) return '🟡 MEDIUM';
    return '🔵 LOW';
  }
}

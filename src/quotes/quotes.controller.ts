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
  BadRequestException,
  InternalServerErrorException,
  Ip,
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
  async submitQuote(
    @Body() quoteDto: QuoteDto,
    @Req() req: Request,
    @Ip() ip?: string,
  ) {
    const startTime = Date.now();
    const requestId = `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`[${requestId}] 🔄 Quote request started`);
    this.logger.log(
      `[${requestId}] 📧 Name: ${quoteDto.name}, Product: ${quoteDto.product}, Budget: ${quoteDto.budget}`,
    );
    this.logger.log(
      `[${requestId}] 🏠 Location: ${quoteDto.city}, ${quoteDto.state} ${quoteDto.postcode}`,
    );
    this.logger.log(`[${requestId}] 🌐 IP: ${ip || 'unknown'}`);

    try {
      // Verificar spam y rate limiting
      const spamCheckStart = Date.now();
      // Temporarily disable spam check for testing
      const spamCheck = { isSpam: false, score: 0, reasons: [] };
      // const spamCheck = await this.antiSpamService.checkForSpam(
      //   quoteDto,
      //   ip || 'unknown',
      // );
      const spamCheckTime = Date.now() - spamCheckStart;
      this.logger.log(
        `[${requestId}] 🛡️  Spam check completed in ${spamCheckTime}ms - Result: ${spamCheck.isSpam ? '❌ SPAM' : '✅ CLEAN'} (DISABLED FOR TESTING)`,
      );

      if (spamCheck.isSpam) {
        this.logger.warn(
          `[${requestId}] 🚫 Quote request blocked as spam - Score: ${spamCheck.score}`,
        );
        throw new BadRequestException('Request blocked by spam filter');
      }

      // Verificar reCAPTCHA si está presente
      if (quoteDto.recaptchaToken) {
        const recaptchaValid = await this.antiSpamService.verifyRecaptcha(
          quoteDto.recaptchaToken,
        );
        if (!recaptchaValid) {
          throw new BadRequestException(
            'reCAPTCHA verification failed. Please try again.',
          );
        }
      }

      // Procesar la solicitud de cotización
      await this.quotesService.processQuoteRequest(quoteDto);

      // Enviar email
      const emailDataStart = Date.now();
      const emailData = {
        type: 'quote' as const,
        data: quoteDto,
      };
      const emailDataTime = Date.now() - emailDataStart;
      this.logger.debug(
        `[${requestId}] 📝 Email data prepared in ${emailDataTime}ms`,
      );

      this.logger.log(
        `[${requestId}] 📨 Sending quote email via EmailService...`,
      );
      const emailStart = Date.now();
      const success = await this.emailService.sendFormEmail(emailData);
      const emailTime = Date.now() - emailStart;
      const totalTime = Date.now() - startTime;

      if (success) {
        this.logger.log(
          `[${requestId}] ✅ Quote request processed successfully!`,
        );
        this.logger.log(
          `[${requestId}] 📊 Performance: SpamCheck=${spamCheckTime}ms, Email=${emailTime}ms, Total=${totalTime}ms`,
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
      } else {
        this.logger.error(
          `[${requestId}] ❌ Email sending failed after ${emailTime}ms`,
        );
        throw new InternalServerErrorException(
          'Failed to send quote request email',
        );
      }
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 💥 Quote request processing failed after ${totalTime}ms`,
      );
      this.logger.error(
        `[${requestId}] 🔥 Error: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to process quote request');
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

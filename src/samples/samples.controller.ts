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
import { SamplesService } from './samples.service';
import { SamplesDto } from './dto/samples.dto';
import { EmailService } from '../common/services/email.service';
import { AntiSpamService } from '../common/services/antispam.service';

interface SamplesRequest {
  success: boolean;
  message: string;
}

@Controller('api/samples')
export class SamplesController {
  private readonly logger = new Logger(SamplesController.name);

  constructor(
    private readonly samplesService: SamplesService,
    private readonly emailService: EmailService,
    private readonly antiSpamService: AntiSpamService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async submitSamples(
    @Body() samplesDto: SamplesDto,
    @Req() req: Request,
  ): Promise<SamplesRequest> {
    try {
      const clientIP = this.getClientIP(req);

      this.logger.log(`Samples request from IP: ${clientIP}`);

      // Verificar spam y rate limiting
      const spamCheck = await this.antiSpamService.checkForSpam(
        samplesDto,
        clientIP,
      );

      if (spamCheck.isSpam) {
        this.logger.warn(`Spam detected in samples request:`, {
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
      if (samplesDto.recaptchaToken) {
        const recaptchaValid = await this.antiSpamService.verifyRecaptcha(
          samplesDto.recaptchaToken,
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

      // Procesar la solicitud de muestras
      this.samplesService.processSampleRequest(samplesDto);

      // Enviar email
      const emailSent = await this.emailService.sendFormEmail({
        type: 'samples',
        data: samplesDto,
      });

      if (!emailSent) {
        this.logger.error('Failed to send samples request email');
        // No fallar la request por error de email, pero logear
      }

      this.logger.log(
        `Samples request processed successfully for ${samplesDto.email}`,
      );

      return {
        success: true,
        message:
          'Samples request submitted successfully! We will send your samples within 2-3 business days.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error processing samples request:', error);
      throw new HttpException(
        {
          error: 'Failed to process samples request',
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
}

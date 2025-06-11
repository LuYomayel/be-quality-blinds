import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UsePipes,
  UploadedFiles,
  UseInterceptors,
  Req,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';
import { EmailService } from '../common/services/email.service';
import { AntiSpamService } from '../common/services/antispam.service';

interface ContactRequest {
  success: boolean;
  message: string;
}

@Controller('api/contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly contactService: ContactService,
    private readonly emailService: EmailService,
    private readonly antiSpamService: AntiSpamService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @UseInterceptors(FilesInterceptor('images', 10))
  async submitContact(
    @Body() contactDto: ContactDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ): Promise<ContactRequest> {
    try {
      const clientIP = this.getClientIP(req);

      // Logging detallado para debug
      this.logger.log(`=== CONTACT FORM DEBUG ===`);
      this.logger.log(`IP: ${clientIP}`);
      this.logger.log(`Raw body received:`, JSON.stringify(req.body, null, 2));
      this.logger.log(`Parsed DTO:`, JSON.stringify(contactDto, null, 2));
      this.logger.log(`Files:`, files?.length || 0);
      this.logger.log(`=========================`);

      // Verificar spam y rate limiting
      const spamCheck = await this.antiSpamService.checkForSpam(
        contactDto,
        clientIP,
      );

      if (spamCheck.isSpam) {
        this.logger.warn(`Spam detected in contact form:`, {
          ip: clientIP,
          score: spamCheck.score,
          reasons: spamCheck.reasons,
        });

        throw new HttpException(
          {
            error:
              'Your submission has been flagged as suspicious. Please try again later or contact us directly at (02) 1234 5678.',
            code: 'SPAM_DETECTED',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Verificar reCAPTCHA si está presente
      if (contactDto.recaptchaToken) {
        const recaptchaValid = await this.antiSpamService.verifyRecaptcha(
          contactDto.recaptchaToken,
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

      // Procesar el formulario de contacto
      await this.contactService.processContactForm(contactDto);

      // Enviar email con archivos adjuntos
      const emailSent = await this.emailService.sendFormEmail({
        type: 'contact',
        data: contactDto,
        attachments: files?.map((file) => ({
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype,
        })),
      });

      if (!emailSent) {
        this.logger.error('Failed to send contact form email');
        // No fallar la request por error de email, pero logear
      }

      this.logger.log(
        `Contact form processed successfully for ${contactDto.email}`,
      );

      return {
        success: true,
        message:
          'Your message has been sent successfully! We will get back to you within 24 hours.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error processing contact form:', error);
      throw new HttpException(
        {
          error: 'Failed to process contact form',
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

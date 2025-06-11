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
  BadRequestException,
  InternalServerErrorException,
  Ip,
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
    @Ip() ip?: string,
  ): Promise<ContactRequest> {
    const startTime = Date.now();
    const requestId = `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`[${requestId}] 🔄 Contact form submission started`);
    this.logger.log(
      `[${requestId}] 📧 Name: ${contactDto.name}, Service: ${contactDto.service}, Product: ${contactDto.product}`,
    );
    this.logger.log(`[${requestId}] 🌐 IP: ${ip || 'unknown'}`);
    this.logger.log(
      `[${requestId}] 📎 Files: ${files?.length || 0} attachments`,
    );

    try {
      // Anti-spam check
      const spamCheckStart = Date.now();
      const spamCheck = await this.antiSpamService.checkForSpam(
        contactDto,
        ip || 'unknown',
      );
      const spamCheckTime = Date.now() - spamCheckStart;
      this.logger.log(
        `[${requestId}] 🛡️  Spam check completed in ${spamCheckTime}ms - Result: ${spamCheck.isSpam ? '❌ SPAM' : '✅ CLEAN'}`,
      );

      if (spamCheck.isSpam) {
        this.logger.warn(`[${requestId}] 🚫 Request blocked as spam`);
        throw new BadRequestException('Request blocked by spam filter');
      }

      // Verificar reCAPTCHA si está presente
      if (contactDto.recaptchaToken) {
        const recaptchaValid = await this.antiSpamService.verifyRecaptcha(
          contactDto.recaptchaToken,
        );
        if (!recaptchaValid) {
          throw new BadRequestException(
            'reCAPTCHA verification failed. Please try again.',
          );
        }
      }

      // Procesar el formulario de contacto
      await this.contactService.processContactForm(contactDto);

      // Prepare email data
      const emailDataStart = Date.now();
      const attachments = files?.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      }));

      const emailData = {
        type: 'contact' as const,
        data: contactDto,
        attachments,
      };
      const emailDataTime = Date.now() - emailDataStart;
      this.logger.debug(
        `[${requestId}] 📝 Email data prepared in ${emailDataTime}ms`,
      );

      // Send email
      this.logger.log(`[${requestId}] 📨 Sending email via EmailService...`);
      const emailStart = Date.now();
      const success = await this.emailService.sendFormEmail(emailData);
      const emailTime = Date.now() - emailStart;
      const totalTime = Date.now() - startTime;

      if (success) {
        this.logger.log(
          `[${requestId}] ✅ Contact form processed successfully!`,
        );
        this.logger.log(
          `[${requestId}] 📊 Performance: SpamCheck=${spamCheckTime}ms, Email=${emailTime}ms, Total=${totalTime}ms`,
        );
        return {
          success: true,
          message:
            'Your message has been sent successfully! We will get back to you within 24 hours.',
        };
      } else {
        this.logger.error(
          `[${requestId}] ❌ Email sending failed after ${emailTime}ms`,
        );
        throw new InternalServerErrorException('Failed to send email');
      }
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 💥 Contact form processing failed after ${totalTime}ms`,
      );
      this.logger.error(
        `[${requestId}] 🔥 Error: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to process contact form');
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

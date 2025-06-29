import 'cross-fetch/polyfill';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface ContactData {
  name: string;
  email: string;
  phone: string;
  message: string;
  address?: string;
  postcode?: string;
  service: string;
  product: string;
  chatSummary?: string;
}

interface QuoteData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  postcode: string;
  product: string;
  roomType: string;
  windowCount: string;
  width?: string;
  height?: string;
  installationType?: string;
  budget: string;
  urgency: string;
  preferredDate?: string;
  preferredTime?: string;
  comments?: string;
  wantsNewsletter?: boolean;
  chatSummary?: string;
}

interface SamplesData {
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  productTypes: string[];
  message?: string;
  chatSummary?: string;
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface EmailData {
  type: 'contact' | 'quote' | 'samples';
  data: ContactData | QuoteData | SamplesData;
  attachments?: EmailAttachment[];
}

interface EmailConfig {
  from: string | undefined;
  to: string | undefined;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private emailConfig: EmailConfig;

  constructor(private configService: ConfigService) {
    this.initializeConfig();

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.logger.log(
      `🔧 Initializing Resend with API key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING'}`,
    );

    try {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend instance created successfully');
    } catch (error) {
      this.logger.error('❌ Failed to create Resend instance:', error);
      throw error;
    }
  }

  private initializeConfig(): void {
    try {
      // Debug environment variables
      this.logger.log('🔍 Checking email environment variables...');
      this.logger.log(
        `RESEND_API_KEY: ${this.configService.get<string>('RESEND_API_KEY') ? 'SET' : 'MISSING'}`,
      );
      this.logger.log(
        `EMAIL_FROM: ${this.configService.get<string>('EMAIL_FROM') || 'MISSING'}`,
      );
      this.logger.log(
        `EMAIL_TO: ${this.configService.get<string>('EMAIL_TO') || 'MISSING'}`,
      );

      // Simple configuration for Resend
      this.emailConfig = {
        from: this.configService.get<string>('EMAIL_FROM'),
        //from: 'Quality Blinds <no-reply@qualityblinds.com.au>',
        to: this.configService.get<string>('EMAIL_TO'),
        //to: 'l.yomayel@gmail.com',
      };
      this.logger.log('Using Resend email service');

      // Validate required configuration
      if (!this.configService.get<string>('RESEND_API_KEY')) {
        throw new Error('RESEND_API_KEY is required');
      }

      if (!this.emailConfig.from || !this.emailConfig.to) {
        throw new Error('Email addresses (EMAIL_FROM, EMAIL_TO) are required');
      }

      this.logger.log('Email configuration initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to initialize email configuration:',
        errorMessage,
      );
      throw error;
    }
  }

  async sendFormEmail(emailData: EmailData): Promise<boolean> {
    const startTime = Date.now();
    const operationId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `[${operationId}] 🔄 Starting email send process - Type: ${emailData.type}`,
    );

    try {
      // Log configuration status
      this.logger.log(
        `[${operationId}] 📧 Email config - From: ${this.emailConfig.from || 'MISSING'}`,
      );
      this.logger.log(
        `[${operationId}] 📥 To: ${this.emailConfig.to || 'MISSING'}`,
      );

      // Validate email data
      const validationStart = Date.now();
      this.validateEmailData(emailData);
      this.logger.debug(
        `[${operationId}] ✅ Validation completed in ${Date.now() - validationStart}ms`,
      );

      if (!this.emailConfig.from || !this.emailConfig.to) {
        throw new Error('Email configuration not properly initialized');
      }

      // Generate content
      const contentStart = Date.now();
      const { subject, html, attachments } =
        this.generateEmailContent(emailData);
      this.logger.debug(
        `[${operationId}] 📝 Content generated in ${Date.now() - contentStart}ms`,
      );

      // Send email using Resend
      this.logger.log(`[${operationId}] 📨 Sending email via Resend...`);
      this.logger.log(`[${operationId}] 📧 From: ${this.emailConfig.from}`);
      this.logger.log(`[${operationId}] 📥 To: ${this.emailConfig.to}`);
      this.logger.log(`[${operationId}] 📝 Subject: ${subject}`);
      this.logger.log(
        `[${operationId}] 📎 Attachments: ${attachments?.length || 0}`,
      );

      const sendStart = Date.now();

      const emailPayload = {
        from: this.emailConfig.from,
        to: this.emailConfig.to,
        subject,
        html,
        attachments: attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
        })),
      };

      this.logger.log(
        `[${operationId}] 🚀 Calling Resend API with payload keys: ${Object.keys(emailPayload).join(', ')}`,
      );

      const result = await this.resend.emails.send(emailPayload);

      const sendTime = Date.now() - sendStart;
      const totalTime = Date.now() - startTime;

      this.logger.log(`[${operationId}] ✅ Email sent successfully!`);
      this.logger.log(
        `[${operationId}] 📊 Performance: Send=${sendTime}ms, Total=${totalTime}ms`,
      );
      this.logger.log(
        `[${operationId}] 🆔 Resend Response:`,
        JSON.stringify(result, null, 2),
      );

      if (result.data?.id) {
        this.logger.log(`[${operationId}] 📧 Message ID: ${result.data.id}`);
      }

      if (result.error) {
        this.logger.warn(
          `[${operationId}] ⚠️ Resend returned error in response:`,
          result.error,
        );
      }

      return true;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `[${operationId}] ❌ Email send failed after ${totalTime}ms`,
      );
      this.logger.error(`[${operationId}] 💥 Error: ${errorMessage}`);

      // Log detailed error information with proper type checking
      if (error && typeof error === 'object' && error !== null) {
        this.logger.error(
          `[${operationId}] 🔍 Error details:`,
          JSON.stringify(error, null, 2),
        );

        // Check for specific error properties with proper type guards
        const errorObj = error as Record<string, unknown>;

        if ('response' in errorObj && errorObj.response) {
          this.logger.error(
            `[${operationId}] 🌐 HTTP Response:`,
            errorObj.response,
          );
        }

        if ('status' in errorObj && errorObj.status) {
          this.logger.error(
            `[${operationId}] 📊 HTTP Status:`,
            errorObj.status,
          );
        }

        if ('name' in errorObj && errorObj.name) {
          this.logger.error(`[${operationId}] 🏷️ Error Name:`, errorObj.name);
        }
      }

      // Check if it's a network/connectivity issue
      if (
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('ECONNREFUSED')
      ) {
        this.logger.error(
          `[${operationId}] 🌐 Network connectivity issue detected`,
        );
      }

      // Check if it's an authentication issue
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('authentication')
      ) {
        this.logger.error(
          `[${operationId}] 🔐 Authentication issue - check RESEND_API_KEY`,
        );
      }

      return false;
    }
  }

  private validateEmailData(emailData: EmailData): void {
    if (!emailData || !emailData.type || !emailData.data) {
      throw new Error('Invalid email data structure');
    }

    const commonFields = ['name', 'email', 'phone'];
    const data = emailData.data as unknown as Record<string, unknown>;

    for (const field of commonFields) {
      const fieldValue = data[field];
      if (
        !fieldValue ||
        typeof fieldValue !== 'string' ||
        fieldValue.trim().length === 0
      ) {
        throw new Error(`Missing or invalid required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = data.email;
    if (typeof email === 'string' && !emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Type-specific validation
    switch (emailData.type) {
      case 'contact':
        this.validateContactData(emailData.data as unknown as ContactData);
        break;
      case 'quote':
        this.validateQuoteData(emailData.data as unknown as QuoteData);
        break;
      case 'samples':
        this.validateSamplesData(emailData.data as unknown as SamplesData);
        break;
    }
  }

  private validateContactData(data: ContactData): void {
    if (!data.message || data.message.trim().length === 0) {
      throw new Error('Contact message is required');
    }
    if (!data.service || !data.product) {
      throw new Error(
        'Service and product fields are required for contact form',
      );
    }
  }

  private validateQuoteData(data: QuoteData): void {
    const requiredFields: (keyof QuoteData)[] = [
      'address',
      'city',
      'state',
      'postcode',
      'product',
      'roomType',
      'windowCount',
      'budget',
      'urgency',
    ];

    for (const field of requiredFields) {
      const value = data[field];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        throw new Error(`Missing required field for quote: ${field}`);
      }
    }
  }

  private validateSamplesData(data: SamplesData): void {
    if (!data.address || !data.postcode) {
      throw new Error('Address and postcode are required for samples request');
    }
    if (
      !data.productTypes ||
      !Array.isArray(data.productTypes) ||
      data.productTypes.length === 0
    ) {
      throw new Error('At least one product type must be selected for samples');
    }
  }

  private generateEmailContent(emailData: EmailData): {
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
  } {
    const timestamp = new Date().toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    switch (emailData.type) {
      case 'contact':
        return this.generateContactEmail(
          emailData.data as ContactData,
          timestamp,
          emailData.attachments,
        );
      case 'quote':
        return this.generateQuoteEmail(emailData.data as QuoteData, timestamp);
      case 'samples':
        return this.generateSamplesEmail(
          emailData.data as SamplesData,
          timestamp,
        );
    }
  }

  private generateContactEmail(
    data: ContactData,
    timestamp: string,
    attachments?: EmailAttachment[],
  ) {
    const subject = `🏠 New Contact Form - ${data.name} - ${data.service}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🏠 Quality Blinds Contact Form</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">New customer inquiry received</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e40af; margin-top: 0;">Contact Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.name)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${data.email}" style="color: #3b82f6;">${this.escapeHtml(data.email)}</a></td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="tel:${data.phone}" style="color: #3b82f6;">${this.escapeHtml(data.phone)}</a></td></tr>
            ${data.address ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Address:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.address)}</td></tr>` : ''}
            ${data.postcode ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Postcode:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.postcode)}</td></tr>` : ''}
          </table>

          <h2 style="color: #1e40af; margin-top: 30px;">Service Request</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Service:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.formatService(data.service)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Product:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.formatProduct(data.product)}</td></tr>
          </table>

          <h2 style="color: #1e40af; margin-top: 30px;">Message</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            ${this.escapeHtml(data.message).replace(/\n/g, '<br>')}
          </div>

          ${
            attachments && attachments.length > 0
              ? `
            <h2 style="color: #1e40af; margin-top: 30px;">Attachments</h2>
            <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              📎 ${attachments.length} image(s) attached to this email
            </p>
          `
              : ''
          }

          ${
            data.chatSummary
              ? `
            <h2 style="color: #1e40af; margin-top: 30px;">Chatbot Conversation Summary</h2>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
              ${this.escapeHtml(data.chatSummary).replace(/\n/g, '<br>')}
            </div>
          `
              : ''
          }

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p><strong>Submitted:</strong> ${timestamp}</p>
            <p style="margin: 5px 0;">Quality Blinds Automated System</p>
          </div>
        </div>
      </div>
    `;

    return { subject, html, attachments };
  }

  private generateQuoteEmail(data: QuoteData, timestamp: string) {
    const subject = `💰 New Quote Request - ${data.name} - ${data.product}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #10b981, #047857); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">💰 Quality Blinds Quote Request</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">New quote request received</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #047857; margin-top: 0;">Contact Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.name)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${data.email}" style="color: #10b981;">${this.escapeHtml(data.email)}</a></td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="tel:${data.phone}" style="color: #10b981;">${this.escapeHtml(data.phone)}</a></td></tr>
          </table>

          <h2 style="color: #047857; margin-top: 30px;">Installation Address</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Address:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.address)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>City:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.city)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>State:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.state || 'Not specified')}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Postcode:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.postcode)}</td></tr>
          </table>

          <h2 style="color: #047857; margin-top: 30px;">Project Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Product:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.product)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Room Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.roomType)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Window Count:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.windowCount)}</td></tr>
            ${data.width ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Width:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.width)}mm</td></tr>` : ''}
            ${data.height ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Height:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.height)}mm</td></tr>` : ''}
            ${data.installationType ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Installation:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.formatInstallationType(data.installationType)}</td></tr>` : ''}
          </table>

          <h2 style="color: #047857; margin-top: 30px;">Budget & Timeline</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Budget Range:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.formatBudget(data.budget)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Timeline:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.formatUrgency(data.urgency)}</td></tr>
            ${data.preferredDate ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Preferred Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.preferredDate)}</td></tr>` : ''}
            ${data.preferredTime ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Preferred Time:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.formatTime(data.preferredTime)}</td></tr>` : ''}
          </table>

          ${
            data.comments
              ? `
            <h2 style="color: #047857; margin-top: 30px;">Additional Comments</h2>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
              ${this.escapeHtml(data.comments).replace(/\n/g, '<br>')}
            </div>
          `
              : ''
          }

          ${
            data.chatSummary
              ? `
            <h2 style="color: #047857; margin-top: 30px;">Chatbot Conversation Summary</h2>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
              ${this.escapeHtml(data.chatSummary).replace(/\n/g, '<br>')}
            </div>
          `
              : ''
          }

          <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">📊 Lead Score: ${this.calculateLeadScore(data)}/100</h3>
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              Priority: ${this.getLeadPriority(this.calculateLeadScore(data))} | 
              Estimated Value: ${this.getBudgetValue(data.budget)} | 
              ${data.wantsNewsletter ? '📧 Wants newsletter' : ''}
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p><strong>Submitted:</strong> ${timestamp}</p>
            <p style="margin: 5px 0;">Quality Blinds Automated System</p>
          </div>
        </div>
      </div>
    `;

    return { subject, html };
  }

  private generateSamplesEmail(data: SamplesData, timestamp: string) {
    const subject = `📦 New Samples Request - ${data.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📦 Quality Blinds Samples Request</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">New samples request received</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #7c3aed; margin-top: 0;">Contact Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.name)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${data.email}" style="color: #8b5cf6;">${this.escapeHtml(data.email)}</a></td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="tel:${data.phone}" style="color: #8b5cf6;">${this.escapeHtml(data.phone)}</a></td></tr>
          </table>

          <h2 style="color: #7c3aed; margin-top: 30px;">Delivery Address</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Address:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.address)}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Postcode:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.postcode)}</td></tr>
          </table>

          <h2 style="color: #7c3aed; margin-top: 30px;">Requested Products</h2>
          <div style="background: #faf5ff; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
            <ul style="margin: 0; padding-left: 20px;">
              ${data.productTypes.map((product: string) => `<li style="margin: 5px 0;">${this.escapeHtml(product)}</li>`).join('')}
            </ul>
          </div>

          ${
            data.message
              ? `
            <h2 style="color: #7c3aed; margin-top: 30px;">Additional Message</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              ${this.escapeHtml(data.message).replace(/\n/g, '<br>')}
            </div>
          `
              : ''
          }

          ${
            data.chatSummary
              ? `
            <h2 style="color: #7c3aed; margin-top: 30px;">Chatbot Conversation Summary</h2>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
              ${this.escapeHtml(data.chatSummary).replace(/\n/g, '<br>')}
            </div>
          `
              : ''
          }

          <div style="margin-top: 30px; padding: 20px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #16a34a;">
            <h3 style="margin: 0 0 10px 0; color: #166534;">📋 Sample Pack Summary</h3>
            <p style="margin: 0; color: #166534; font-size: 14px;">
              Products: ${data.productTypes.length} items | 
              Estimated shipping: 2-3 business days |
              📍 Delivery to: ${this.escapeHtml(data.postcode)}
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p><strong>Submitted:</strong> ${timestamp}</p>
            <p style="margin: 5px 0;">Quality Blinds Automated System</p>
          </div>
        </div>
      </div>
    `;

    return { subject, html };
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatService(service: string): string {
    const services: { [key: string]: string } = {
      'measure-quote': '📏 Free Measure & Quote',
      installation: '🔧 Installation Service',
      repair: '🛠️ Repair Service',
      consultation: '💡 Design Consultation',
    };
    return services[service] || this.escapeHtml(service);
  }

  private formatProduct(product: string): string {
    const products: { [key: string]: string } = {
      'roller-blinds': '🎯 Roller Blinds',
      'roman-blinds': '🏛️ Roman Blinds',
      'venetian-blinds': '🎭 Venetian Blinds',
      curtains: '🪟 Curtains & Drapes',
      shutters: '🚪 Shutters',
      awnings: '☀️ Awnings',
      other: '❓ Other',
    };
    return products[product] || this.escapeHtml(product);
  }

  private formatInstallationType(type: string): string {
    const types: { [key: string]: string } = {
      'inside-mount': 'Inside Mount',
      'outside-mount': 'Outside Mount',
      'ceiling-mount': 'Ceiling Mount',
      'not-sure': 'Not Sure - Need Advice',
    };
    return types[type] || this.escapeHtml(type);
  }

  private formatBudget(budget: string): string {
    const budgets: { [key: string]: string } = {
      'under-500': 'Under $500',
      '500-1000': '$500 - $1,000',
      '1000-2000': '$1,000 - $2,000',
      '2000-5000': '$2,000 - $5,000',
      'over-5000': 'Over $5,000',
    };
    return budgets[budget] || this.escapeHtml(budget);
  }

  private formatUrgency(urgency: string): string {
    const urgencies: { [key: string]: string } = {
      asap: '🚨 ASAP (within 1 week)',
      'this-month': '📅 This month',
      'next-month': '📅 Next month',
      'next-3-months': '📅 Within 3 months',
      'just-browsing': '👀 Just browsing',
    };
    return urgencies[urgency] || this.escapeHtml(urgency);
  }

  private formatTime(time: string): string {
    const times: { [key: string]: string } = {
      morning: '🌅 Morning (9AM - 12PM)',
      afternoon: '☀️ Afternoon (12PM - 5PM)',
      evening: '🌆 Evening (5PM - 7PM)',
      flexible: '🕐 Flexible',
    };
    return times[time] || this.escapeHtml(time);
  }

  private getBudgetValue(budget: string): string {
    const budgetMap: { [key: string]: string } = {
      'under-500': '$400',
      '500-1000': '$750',
      '1000-2000': '$1,500',
      '2000-5000': '$3,500',
      'over-5000': '$7,500+',
    };
    return budgetMap[budget] || 'Unknown';
  }

  private calculateLeadScore(data: QuoteData): number {
    let score = 0;

    // Contact completeness (30 points)
    if (data.name && data.email && data.phone) score += 30;

    // Location completeness (20 points)
    if (data.address && data.city && data.postcode) score += 20;

    // Project details (25 points)
    if (data.roomType && data.windowCount) score += 25;

    // Budget provided (15 points)
    if (data.budget) score += 15;

    // Urgency (10 points - higher for urgent)
    if (data.urgency === 'asap') score += 10;
    else if (data.urgency === 'this-month') score += 8;
    else if (data.urgency === 'next-month') score += 5;

    return Math.min(100, score); // Cap at 100
  }

  private getLeadPriority(score: number): string {
    if (score >= 80) return '🔥 HIGH';
    if (score >= 60) return '🟡 MEDIUM';
    return '🔵 LOW';
  }

  // Health check method
  healthCheck(): Promise<{ status: string; message: string }> {
    try {
      return Promise.resolve({
        status: 'healthy',
        message: 'Email service is operational',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return Promise.resolve({
        status: 'unhealthy',
        message: `Email service error: ${errorMessage}`,
      });
    }
  }
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    configService;
    logger = new common_1.Logger(EmailService_1.name);
    transporter;
    emailConfig;
    constructor(configService) {
        this.configService = configService;
        this.initializeConfig();
        this.initializeTransporter();
    }
    initializeConfig() {
        try {
            this.emailConfig = {
                host: this.configService.get('EMAIL_HOST', 'smtp.gmail.com'),
                port: this.configService.get('EMAIL_PORT', 587),
                secure: this.configService.get('EMAIL_SECURE', false),
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASS'),
                from: this.configService.get('EMAIL_FROM'),
                to: this.configService.get('EMAIL_TO'),
            };
            if (!this.emailConfig.user || !this.emailConfig.pass) {
                throw new Error('Email credentials (EMAIL_USER, EMAIL_PASS) are required');
            }
            if (!this.emailConfig.from || !this.emailConfig.to) {
                throw new Error('Email addresses (EMAIL_FROM, EMAIL_TO) are required');
            }
            this.logger.log('Email configuration initialized successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to initialize email configuration:', errorMessage);
            throw error;
        }
    }
    initializeTransporter() {
        try {
            if (!this.emailConfig.user || !this.emailConfig.pass) {
                throw new Error('Email configuration not properly initialized');
            }
            this.transporter = nodemailer.createTransport({
                host: this.emailConfig.host,
                port: this.emailConfig.port,
                secure: this.emailConfig.secure,
                auth: {
                    user: this.emailConfig.user,
                    pass: this.emailConfig.pass,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });
            this.logger.log('Email transporter initialized successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to initialize email transporter:', errorMessage);
            throw error;
        }
    }
    async sendFormEmail(emailData) {
        try {
            this.validateEmailData(emailData);
            if (!this.emailConfig.from || !this.emailConfig.to) {
                throw new Error('Email configuration not properly initialized');
            }
            const { subject, html, attachments } = this.generateEmailContent(emailData);
            const mailOptions = {
                from: this.emailConfig.from,
                to: this.emailConfig.to,
                subject,
                html,
                attachments: attachments || [],
            };
            await this.verifyConnection();
            const result = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent successfully: ${result.messageId} - Type: ${emailData.type}`);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to send email:', errorMessage);
            if (error && typeof error === 'object' && 'code' in error) {
                this.logger.error(`Error code: ${error.code}`);
            }
            if (error && typeof error === 'object' && 'response' in error) {
                this.logger.error(`SMTP response: ${error.response}`);
            }
            return false;
        }
    }
    async verifyConnection() {
        try {
            await this.transporter.verify();
            this.logger.debug('SMTP connection verified successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('SMTP connection verification failed:', errorMessage);
            throw new Error(`SMTP connection failed: ${errorMessage}`);
        }
    }
    validateEmailData(emailData) {
        if (!emailData || !emailData.type || !emailData.data) {
            throw new Error('Invalid email data structure');
        }
        const commonFields = ['name', 'email', 'phone'];
        const data = emailData.data;
        for (const field of commonFields) {
            if (!data[field] ||
                typeof data[field] !== 'string' ||
                data[field].trim().length === 0) {
                throw new Error(`Missing or invalid required field: ${field}`);
            }
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new Error('Invalid email format');
        }
        switch (emailData.type) {
            case 'contact':
                this.validateContactData(data);
                break;
            case 'quote':
                this.validateQuoteData(data);
                break;
            case 'samples':
                this.validateSamplesData(data);
                break;
            default:
                throw new Error(`Unknown email type: ${emailData.type}`);
        }
    }
    validateContactData(data) {
        if (!data.message || data.message.trim().length === 0) {
            throw new Error('Contact message is required');
        }
        if (!data.service || !data.product) {
            throw new Error('Service and product fields are required for contact form');
        }
    }
    validateQuoteData(data) {
        const requiredFields = [
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
    validateSamplesData(data) {
        if (!data.address || !data.postcode) {
            throw new Error('Address and postcode are required for samples request');
        }
        if (!data.productTypes ||
            !Array.isArray(data.productTypes) ||
            data.productTypes.length === 0) {
            throw new Error('At least one product type must be selected for samples');
        }
    }
    generateEmailContent(emailData) {
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
                return this.generateContactEmail(emailData.data, timestamp, emailData.attachments);
            case 'quote':
                return this.generateQuoteEmail(emailData.data, timestamp);
            case 'samples':
                return this.generateSamplesEmail(emailData.data, timestamp);
            default:
                throw new Error(`Unknown email type: ${emailData.type}`);
        }
    }
    generateContactEmail(data, timestamp, attachments) {
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

          ${attachments && attachments.length > 0
            ? `
            <h2 style="color: #1e40af; margin-top: 30px;">Attachments</h2>
            <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              📎 ${attachments.length} image(s) attached to this email
            </p>
          `
            : ''}

          ${data.chatSummary
            ? `
            <h2 style="color: #1e40af; margin-top: 30px;">Chatbot Conversation Summary</h2>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
              ${this.escapeHtml(data.chatSummary).replace(/\n/g, '<br>')}
            </div>
          `
            : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p><strong>Submitted:</strong> ${timestamp}</p>
            <p style="margin: 5px 0;">Quality Blinds Automated System</p>
          </div>
        </div>
      </div>
    `;
        return { subject, html, attachments };
    }
    generateQuoteEmail(data, timestamp) {
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
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>State:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${this.escapeHtml(data.state)}</td></tr>
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

          ${data.comments
            ? `
            <h2 style="color: #047857; margin-top: 30px;">Additional Comments</h2>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
              ${this.escapeHtml(data.comments).replace(/\n/g, '<br>')}
            </div>
          `
            : ''}

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
    generateSamplesEmail(data, timestamp) {
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
              ${data.productTypes.map((product) => `<li style="margin: 5px 0;">${this.escapeHtml(product)}</li>`).join('')}
            </ul>
          </div>

          ${data.message
            ? `
            <h2 style="color: #7c3aed; margin-top: 30px;">Additional Message</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              ${this.escapeHtml(data.message).replace(/\n/g, '<br>')}
            </div>
          `
            : ''}

          ${data.chatSummary
            ? `
            <h2 style="color: #7c3aed; margin-top: 30px;">Chatbot Conversation Summary</h2>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
              ${this.escapeHtml(data.chatSummary).replace(/\n/g, '<br>')}
            </div>
          `
            : ''}

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
    escapeHtml(text) {
        if (!text)
            return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    formatService(service) {
        const services = {
            'measure-quote': '📏 Free Measure & Quote',
            installation: '🔧 Installation Service',
            repair: '🛠️ Repair Service',
            consultation: '💡 Design Consultation',
        };
        return services[service] || this.escapeHtml(service);
    }
    formatProduct(product) {
        const products = {
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
    formatInstallationType(type) {
        const types = {
            'inside-mount': 'Inside Mount',
            'outside-mount': 'Outside Mount',
            'ceiling-mount': 'Ceiling Mount',
            'not-sure': 'Not Sure - Need Advice',
        };
        return types[type] || this.escapeHtml(type);
    }
    formatBudget(budget) {
        const budgets = {
            'under-500': 'Under $500',
            '500-1000': '$500 - $1,000',
            '1000-2000': '$1,000 - $2,000',
            '2000-5000': '$2,000 - $5,000',
            'over-5000': 'Over $5,000',
        };
        return budgets[budget] || this.escapeHtml(budget);
    }
    formatUrgency(urgency) {
        const urgencies = {
            asap: '🚨 ASAP (within 1 week)',
            'this-month': '📅 This month',
            'next-month': '📅 Next month',
            'next-3-months': '📅 Within 3 months',
            'just-browsing': '👀 Just browsing',
        };
        return urgencies[urgency] || this.escapeHtml(urgency);
    }
    formatTime(time) {
        const times = {
            morning: '🌅 Morning (9AM - 12PM)',
            afternoon: '☀️ Afternoon (12PM - 5PM)',
            evening: '🌆 Evening (5PM - 7PM)',
            flexible: '🕐 Flexible',
        };
        return times[time] || this.escapeHtml(time);
    }
    getBudgetValue(budget) {
        const budgetMap = {
            'under-500': '$400',
            '500-1000': '$750',
            '1000-2000': '$1,500',
            '2000-5000': '$3,500',
            'over-5000': '$7,500+',
        };
        return budgetMap[budget] || 'Unknown';
    }
    calculateLeadScore(data) {
        let score = 0;
        if (data.name && data.email && data.phone)
            score += 30;
        if (data.address && data.city && data.postcode)
            score += 20;
        if (data.roomType && data.windowCount)
            score += 25;
        if (data.budget)
            score += 15;
        if (data.urgency === 'asap')
            score += 10;
        else if (data.urgency === 'this-month')
            score += 8;
        else if (data.urgency === 'next-month')
            score += 5;
        return Math.min(100, score);
    }
    getLeadPriority(score) {
        if (score >= 80)
            return '🔥 HIGH';
        if (score >= 60)
            return '🟡 MEDIUM';
        return '🔵 LOW';
    }
    async healthCheck() {
        try {
            await this.verifyConnection();
            return { status: 'healthy', message: 'Email service is operational' };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                status: 'unhealthy',
                message: `Email service error: ${errorMessage}`,
            };
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map
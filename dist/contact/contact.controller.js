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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ContactController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const contact_service_1 = require("./contact.service");
const contact_dto_1 = require("./dto/contact.dto");
const email_service_1 = require("../common/services/email.service");
const antispam_service_1 = require("../common/services/antispam.service");
let ContactController = ContactController_1 = class ContactController {
    contactService;
    emailService;
    antiSpamService;
    logger = new common_1.Logger(ContactController_1.name);
    constructor(contactService, emailService, antiSpamService) {
        this.contactService = contactService;
        this.emailService = emailService;
        this.antiSpamService = antiSpamService;
    }
    async submitContact(contactDto, files, req, ip) {
        const startTime = Date.now();
        const requestId = `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.logger.log(`[${requestId}] 🔄 Contact form submission started`);
        this.logger.log(`[${requestId}] 📧 Name: ${contactDto.name}, Service: ${contactDto.service}, Product: ${contactDto.product}`);
        this.logger.log(`[${requestId}] 🌐 IP: ${ip || 'unknown'}`);
        this.logger.log(`[${requestId}] 📎 Files: ${files?.length || 0} attachments`);
        try {
            const spamCheckStart = Date.now();
            const spamCheck = { isSpam: false, score: 0, reasons: [] };
            const spamCheckTime = Date.now() - spamCheckStart;
            this.logger.log(`[${requestId}] 🛡️  Spam check completed in ${spamCheckTime}ms - Result: ${spamCheck.isSpam ? '❌ SPAM' : '✅ CLEAN'} (DISABLED FOR TESTING)`);
            if (spamCheck.isSpam) {
                this.logger.warn(`[${requestId}] 🚫 Request blocked as spam`);
                throw new common_1.BadRequestException('Request blocked by spam filter');
            }
            if (contactDto.recaptchaToken) {
                const recaptchaValid = await this.antiSpamService.verifyRecaptcha(contactDto.recaptchaToken);
                if (!recaptchaValid) {
                    throw new common_1.BadRequestException('reCAPTCHA verification failed. Please try again.');
                }
            }
            await this.contactService.processContactForm(contactDto);
            const emailDataStart = Date.now();
            const attachments = files?.map((file) => ({
                filename: file.originalname,
                content: file.buffer,
                contentType: file.mimetype,
            }));
            const emailData = {
                type: 'contact',
                data: contactDto,
                attachments,
            };
            const emailDataTime = Date.now() - emailDataStart;
            this.logger.debug(`[${requestId}] 📝 Email data prepared in ${emailDataTime}ms`);
            this.logger.log(`[${requestId}] 📨 Sending email via EmailService...`);
            const emailStart = Date.now();
            const success = await this.emailService.sendFormEmail(emailData);
            const emailTime = Date.now() - emailStart;
            const totalTime = Date.now() - startTime;
            if (success) {
                this.logger.log(`[${requestId}] ✅ Contact form processed successfully!`);
                this.logger.log(`[${requestId}] 📊 Performance: SpamCheck=${spamCheckTime}ms, Email=${emailTime}ms, Total=${totalTime}ms`);
                return {
                    success: true,
                    message: 'Your message has been sent successfully! We will get back to you within 24 hours.',
                };
            }
            else {
                this.logger.error(`[${requestId}] ❌ Email sending failed after ${emailTime}ms`);
                throw new common_1.InternalServerErrorException('Failed to send email');
            }
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            this.logger.error(`[${requestId}] 💥 Contact form processing failed after ${totalTime}ms`);
            this.logger.error(`[${requestId}] 🔥 Error: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to process contact form');
        }
    }
    getClientIP(req) {
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
};
exports.ContactController = ContactController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10)),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [contact_dto_1.ContactDto, Array, Object, String]),
    __metadata("design:returntype", Promise)
], ContactController.prototype, "submitContact", null);
exports.ContactController = ContactController = ContactController_1 = __decorate([
    (0, common_1.Controller)('api/contact'),
    __metadata("design:paramtypes", [contact_service_1.ContactService,
        email_service_1.EmailService,
        antispam_service_1.AntiSpamService])
], ContactController);
//# sourceMappingURL=contact.controller.js.map
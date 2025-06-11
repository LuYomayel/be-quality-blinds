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
    async submitContact(contactDto, files, req) {
        try {
            const clientIP = this.getClientIP(req);
            this.logger.log(`=== CONTACT FORM DEBUG ===`);
            this.logger.log(`IP: ${clientIP}`);
            this.logger.log(`Raw body received:`, JSON.stringify(req.body, null, 2));
            this.logger.log(`Parsed DTO:`, JSON.stringify(contactDto, null, 2));
            this.logger.log(`Files:`, files?.length || 0);
            this.logger.log(`=========================`);
            const spamCheck = await this.antiSpamService.checkForSpam(contactDto, clientIP);
            if (spamCheck.isSpam) {
                this.logger.warn(`Spam detected in contact form:`, {
                    ip: clientIP,
                    score: spamCheck.score,
                    reasons: spamCheck.reasons,
                });
                throw new common_1.HttpException({
                    error: 'Your submission has been flagged as suspicious. Please try again later or contact us directly at (02) 1234 5678.',
                    code: 'SPAM_DETECTED',
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            if (contactDto.recaptchaToken) {
                const recaptchaValid = await this.antiSpamService.verifyRecaptcha(contactDto.recaptchaToken);
                if (!recaptchaValid) {
                    throw new common_1.HttpException({
                        error: 'reCAPTCHA verification failed. Please try again.',
                        code: 'RECAPTCHA_FAILED',
                    }, common_1.HttpStatus.BAD_REQUEST);
                }
            }
            await this.contactService.processContactForm(contactDto);
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
            }
            this.logger.log(`Contact form processed successfully for ${contactDto.email}`);
            return {
                success: true,
                message: 'Your message has been sent successfully! We will get back to you within 24 hours.',
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error('Error processing contact form:', error);
            throw new common_1.HttpException({
                error: 'Failed to process contact form',
                code: 'INTERNAL_ERROR',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [contact_dto_1.ContactDto, Array, Object]),
    __metadata("design:returntype", Promise)
], ContactController.prototype, "submitContact", null);
exports.ContactController = ContactController = ContactController_1 = __decorate([
    (0, common_1.Controller)('api/contact'),
    __metadata("design:paramtypes", [contact_service_1.ContactService,
        email_service_1.EmailService,
        antispam_service_1.AntiSpamService])
], ContactController);
//# sourceMappingURL=contact.controller.js.map
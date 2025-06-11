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
var QuotesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotesController = void 0;
const common_1 = require("@nestjs/common");
const quotes_service_1 = require("./quotes.service");
const quote_dto_1 = require("./dto/quote.dto");
const email_service_1 = require("../common/services/email.service");
const antispam_service_1 = require("../common/services/antispam.service");
let QuotesController = QuotesController_1 = class QuotesController {
    quotesService;
    emailService;
    antiSpamService;
    logger = new common_1.Logger(QuotesController_1.name);
    constructor(quotesService, emailService, antiSpamService) {
        this.quotesService = quotesService;
        this.emailService = emailService;
        this.antiSpamService = antiSpamService;
    }
    async submitQuote(quoteDto, req, ip) {
        const startTime = Date.now();
        const requestId = `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.logger.log(`[${requestId}] 🔄 Quote request started`);
        this.logger.log(`[${requestId}] 📧 Name: ${quoteDto.name}, Product: ${quoteDto.product}, Budget: ${quoteDto.budget}`);
        this.logger.log(`[${requestId}] 🏠 Location: ${quoteDto.city}, ${quoteDto.state} ${quoteDto.postcode}`);
        this.logger.log(`[${requestId}] 🌐 IP: ${ip || 'unknown'}`);
        try {
            const spamCheckStart = Date.now();
            const spamCheck = { isSpam: false, score: 0, reasons: [] };
            const spamCheckTime = Date.now() - spamCheckStart;
            this.logger.log(`[${requestId}] 🛡️  Spam check completed in ${spamCheckTime}ms - Result: ${spamCheck.isSpam ? '❌ SPAM' : '✅ CLEAN'} (DISABLED FOR TESTING)`);
            if (spamCheck.isSpam) {
                this.logger.warn(`[${requestId}] 🚫 Quote request blocked as spam - Score: ${spamCheck.score}`);
                throw new common_1.BadRequestException('Request blocked by spam filter');
            }
            if (quoteDto.recaptchaToken) {
                const recaptchaValid = await this.antiSpamService.verifyRecaptcha(quoteDto.recaptchaToken);
                if (!recaptchaValid) {
                    throw new common_1.BadRequestException('reCAPTCHA verification failed. Please try again.');
                }
            }
            await this.quotesService.processQuoteRequest(quoteDto);
            const emailDataStart = Date.now();
            const emailData = {
                type: 'quote',
                data: quoteDto,
            };
            const emailDataTime = Date.now() - emailDataStart;
            this.logger.debug(`[${requestId}] 📝 Email data prepared in ${emailDataTime}ms`);
            this.logger.log(`[${requestId}] 📨 Sending quote email via EmailService...`);
            const emailStart = Date.now();
            const success = await this.emailService.sendFormEmail(emailData);
            const emailTime = Date.now() - emailStart;
            const totalTime = Date.now() - startTime;
            if (success) {
                this.logger.log(`[${requestId}] ✅ Quote request processed successfully!`);
                this.logger.log(`[${requestId}] 📊 Performance: SpamCheck=${spamCheckTime}ms, Email=${emailTime}ms, Total=${totalTime}ms`);
                return {
                    success: true,
                    message: 'Quote request submitted successfully. We will contact you within 24 hours.',
                    data: {
                        leadScore: spamCheck.score > 0 ? 100 - spamCheck.score : 95,
                        estimatedValue: this.getBudgetValue(quoteDto.budget),
                        priority: this.getLeadPriority(quoteDto),
                    },
                };
            }
            else {
                this.logger.error(`[${requestId}] ❌ Email sending failed after ${emailTime}ms`);
                throw new common_1.InternalServerErrorException('Failed to send quote request email');
            }
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            this.logger.error(`[${requestId}] 💥 Quote request processing failed after ${totalTime}ms`);
            this.logger.error(`[${requestId}] 🔥 Error: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to process quote request');
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
    getLeadPriority(data) {
        let score = 0;
        if (data.budget === 'over-5000')
            score += 40;
        else if (data.budget === '2000-5000')
            score += 30;
        else if (data.budget === '1000-2000')
            score += 20;
        else
            score += 10;
        if (data.urgency === 'asap')
            score += 30;
        else if (data.urgency === 'this-month')
            score += 20;
        else if (data.urgency === 'next-month')
            score += 10;
        if (data.preferredDate && data.preferredTime)
            score += 15;
        if (data.width && data.height)
            score += 10;
        if (data.installationType)
            score += 5;
        if (score >= 70)
            return '🔥 HIGH';
        if (score >= 40)
            return '🟡 MEDIUM';
        return '🔵 LOW';
    }
};
exports.QuotesController = QuotesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [quote_dto_1.QuoteDto, Object, String]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "submitQuote", null);
exports.QuotesController = QuotesController = QuotesController_1 = __decorate([
    (0, common_1.Controller)('api/quotes'),
    __metadata("design:paramtypes", [quotes_service_1.QuotesService,
        email_service_1.EmailService,
        antispam_service_1.AntiSpamService])
], QuotesController);
//# sourceMappingURL=quotes.controller.js.map
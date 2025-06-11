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
    async submitQuote(quoteDto, req) {
        try {
            const clientIP = this.getClientIP(req);
            this.logger.log(`Quote request from IP: ${clientIP}`);
            const spamCheck = await this.antiSpamService.checkForSpam(quoteDto, clientIP);
            if (spamCheck.isSpam) {
                this.logger.warn(`Spam detected in quote request:`, {
                    ip: clientIP,
                    score: spamCheck.score,
                    reasons: spamCheck.reasons,
                });
                throw new common_1.HttpException({
                    error: 'Your request has been flagged as suspicious. Please try again later or contact us directly.',
                    code: 'SPAM_DETECTED',
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            if (quoteDto.recaptchaToken) {
                const recaptchaValid = await this.antiSpamService.verifyRecaptcha(quoteDto.recaptchaToken);
                if (!recaptchaValid) {
                    throw new common_1.HttpException({
                        error: 'reCAPTCHA verification failed. Please try again.',
                        code: 'RECAPTCHA_FAILED',
                    }, common_1.HttpStatus.BAD_REQUEST);
                }
            }
            await this.quotesService.processQuoteRequest(quoteDto);
            const emailSent = await this.emailService.sendFormEmail({
                type: 'quote',
                data: quoteDto,
            });
            if (!emailSent) {
                this.logger.error('Failed to send quote request email');
            }
            this.logger.log(`Quote request processed successfully for ${quoteDto.email}`);
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
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error('Error processing quote request:', error);
            throw new common_1.HttpException({
                error: 'Failed to process quote request',
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [quote_dto_1.QuoteDto, Object]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "submitQuote", null);
exports.QuotesController = QuotesController = QuotesController_1 = __decorate([
    (0, common_1.Controller)('api/quotes'),
    __metadata("design:paramtypes", [quotes_service_1.QuotesService,
        email_service_1.EmailService,
        antispam_service_1.AntiSpamService])
], QuotesController);
//# sourceMappingURL=quotes.controller.js.map
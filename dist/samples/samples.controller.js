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
var SamplesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamplesController = void 0;
const common_1 = require("@nestjs/common");
const samples_service_1 = require("./samples.service");
const samples_dto_1 = require("./dto/samples.dto");
const email_service_1 = require("../common/services/email.service");
const antispam_service_1 = require("../common/services/antispam.service");
let SamplesController = SamplesController_1 = class SamplesController {
    samplesService;
    emailService;
    antiSpamService;
    logger = new common_1.Logger(SamplesController_1.name);
    constructor(samplesService, emailService, antiSpamService) {
        this.samplesService = samplesService;
        this.emailService = emailService;
        this.antiSpamService = antiSpamService;
    }
    async submitSamples(samplesDto, req) {
        try {
            const clientIP = this.getClientIP(req);
            this.logger.log(`Samples request from IP: ${clientIP}`);
            const spamCheck = await this.antiSpamService.checkForSpam(samplesDto, clientIP);
            if (spamCheck.isSpam) {
                this.logger.warn(`Spam detected in samples request:`, {
                    ip: clientIP,
                    score: spamCheck.score,
                    reasons: spamCheck.reasons,
                });
                throw new common_1.HttpException({
                    error: 'Your request has been flagged as suspicious. Please try again later or contact us directly.',
                    code: 'SPAM_DETECTED',
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            if (samplesDto.recaptchaToken) {
                const recaptchaValid = await this.antiSpamService.verifyRecaptcha(samplesDto.recaptchaToken);
                if (!recaptchaValid) {
                    throw new common_1.HttpException({
                        error: 'reCAPTCHA verification failed. Please try again.',
                        code: 'RECAPTCHA_FAILED',
                    }, common_1.HttpStatus.BAD_REQUEST);
                }
            }
            this.samplesService.processSampleRequest(samplesDto);
            const emailSent = await this.emailService.sendFormEmail({
                type: 'samples',
                data: samplesDto,
            });
            if (!emailSent) {
                this.logger.error('Failed to send samples request email');
            }
            this.logger.log(`Samples request processed successfully for ${samplesDto.email}`);
            return {
                success: true,
                message: 'Samples request submitted successfully! We will send your samples within 2-3 business days.',
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error('Error processing samples request:', error);
            throw new common_1.HttpException({
                error: 'Failed to process samples request',
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
exports.SamplesController = SamplesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [samples_dto_1.SamplesDto, Object]),
    __metadata("design:returntype", Promise)
], SamplesController.prototype, "submitSamples", null);
exports.SamplesController = SamplesController = SamplesController_1 = __decorate([
    (0, common_1.Controller)('api/samples'),
    __metadata("design:paramtypes", [samples_service_1.SamplesService,
        email_service_1.EmailService,
        antispam_service_1.AntiSpamService])
], SamplesController);
//# sourceMappingURL=samples.controller.js.map
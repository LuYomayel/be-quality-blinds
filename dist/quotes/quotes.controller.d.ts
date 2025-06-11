import { Request } from 'express';
import { QuotesService } from './quotes.service';
import { QuoteDto } from './dto/quote.dto';
import { EmailService } from '../common/services/email.service';
import { AntiSpamService } from '../common/services/antispam.service';
export declare class QuotesController {
    private readonly quotesService;
    private readonly emailService;
    private readonly antiSpamService;
    private readonly logger;
    constructor(quotesService: QuotesService, emailService: EmailService, antiSpamService: AntiSpamService);
    submitQuote(quoteDto: QuoteDto, req: Request): Promise<{
        success: boolean;
        message: string;
        data: {
            leadScore: number;
            estimatedValue: string;
            priority: string;
        };
    }>;
    private getClientIP;
    private getBudgetValue;
    private getLeadPriority;
}

import { ConfigService } from '@nestjs/config';
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
    state: string;
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
export declare class EmailService {
    private configService;
    private readonly logger;
    private transporter;
    private emailConfig;
    constructor(configService: ConfigService);
    private initializeConfig;
    private initializeTransporter;
    sendFormEmail(emailData: EmailData): Promise<boolean>;
    private verifyConnection;
    private validateEmailData;
    private validateContactData;
    private validateQuoteData;
    private validateSamplesData;
    private generateEmailContent;
    private generateContactEmail;
    private generateQuoteEmail;
    private generateSamplesEmail;
    private escapeHtml;
    private formatService;
    private formatProduct;
    private formatInstallationType;
    private formatBudget;
    private formatUrgency;
    private formatTime;
    private getBudgetValue;
    private calculateLeadScore;
    private getLeadPriority;
    healthCheck(): Promise<{
        status: string;
        message: string;
    }>;
}
export {};

import { Request } from 'express';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';
import { EmailService } from '../common/services/email.service';
import { AntiSpamService } from '../common/services/antispam.service';
interface ContactRequest {
    success: boolean;
    message: string;
}
export declare class ContactController {
    private readonly contactService;
    private readonly emailService;
    private readonly antiSpamService;
    private readonly logger;
    constructor(contactService: ContactService, emailService: EmailService, antiSpamService: AntiSpamService);
    submitContact(contactDto: ContactDto, files: Express.Multer.File[], req: Request): Promise<ContactRequest>;
    private getClientIP;
}
export {};

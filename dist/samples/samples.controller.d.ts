import { Request } from 'express';
import { SamplesService } from './samples.service';
import { SamplesDto } from './dto/samples.dto';
import { EmailService } from '../common/services/email.service';
import { AntiSpamService } from '../common/services/antispam.service';
interface SamplesRequest {
    success: boolean;
    message: string;
}
export declare class SamplesController {
    private readonly samplesService;
    private readonly emailService;
    private readonly antiSpamService;
    private readonly logger;
    constructor(samplesService: SamplesService, emailService: EmailService, antiSpamService: AntiSpamService);
    submitSamples(samplesDto: SamplesDto, req: Request): Promise<SamplesRequest>;
    private getClientIP;
}
export {};

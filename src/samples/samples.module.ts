import { Module } from '@nestjs/common';
import { SamplesController } from './samples.controller';
import { SamplesService } from './samples.service';
import { EmailService } from '../common/services/email.service';
import { AntiSpamService } from '../common/services/antispam.service';

@Module({
  controllers: [SamplesController],
  providers: [SamplesService, EmailService, AntiSpamService],
})
export class SamplesModule {}

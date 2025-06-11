import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { EmailService } from '../common/services/email.service';
import { AntiSpamService } from '../common/services/antispam.service';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, EmailService, AntiSpamService],
})
export class QuotesModule {}

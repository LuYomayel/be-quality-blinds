import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { GoogleReviewsService } from './google-reviews.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, GoogleReviewsService],
  exports: [ReviewsService, GoogleReviewsService],
})
export class ReviewsModule {}

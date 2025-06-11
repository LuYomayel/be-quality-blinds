import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ReviewsService, GoogleReview, UserReview } from './reviews.service';

interface SubmitReviewRequest {
  productId: string;
  name: string;
  email: string;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
}

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('google')
  async getGoogleReviews(): Promise<{
    success: boolean;
    data: { rating: number; totalReviews: number; reviews: GoogleReview[] };
  }> {
    return this.reviewsService.getGoogleReviews();
  }

  @Get('user')
  async getUserReviews(@Query('productId') productId: string): Promise<{
    success: boolean;
    data?: {
      reviews: UserReview[];
      totalReviews: number;
      averageRating: number;
    };
    error?: string;
  }> {
    if (!productId) {
      return {
        success: false,
        error: 'Product ID is required',
      };
    }
    return this.reviewsService.getUserReviews(productId);
  }

  @Post('user')
  async submitUserReview(
    @Body() reviewData: SubmitReviewRequest,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.reviewsService.submitUserReview(reviewData);
    } catch {
      return {
        success: false,
        error: 'Failed to submit review',
      };
    }
  }
}

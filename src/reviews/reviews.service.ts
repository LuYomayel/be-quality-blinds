import { Injectable } from '@nestjs/common';

export interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

export interface UserReview {
  id: string;
  productId: string;
  name: string;
  email: string;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  isApproved: boolean;
  timestamp: number;
  helpful: number;
  flagged: number;
}

@Injectable()
export class ReviewsService {
  private userReviews: UserReview[] = [];

  // Mock Google Reviews data
  private mockGoogleReviews: GoogleReview[] = [
    {
      author_name: 'James Wilson',
      rating: 5,
      relative_time_description: '2 days ago',
      text: 'Exceptional service from Quality Blinds! They installed beautiful roller blinds throughout our home. Professional installation team and the quality is outstanding. Highly recommend for anyone looking for premium window treatments.',
      time: Date.now() - 2 * 24 * 60 * 60 * 1000,
      language: 'en',
      profile_photo_url:
        'https://lh3.googleusercontent.com/a/default-user=s40-c',
    },
    {
      author_name: 'Sophie Martinez',
      rating: 5,
      relative_time_description: '5 days ago',
      text: 'Amazing experience with Quality Blinds Australia! From the initial consultation to installation, everything was seamless. The Roman blinds we ordered are absolutely gorgeous and the quality is top-notch.',
      time: Date.now() - 5 * 24 * 60 * 60 * 1000,
      language: 'en',
      profile_photo_url:
        'https://lh3.googleusercontent.com/a/default-user=s40-c',
    },
    // Más reviews...
  ];

  getGoogleReviews() {
    const recentReviews = this.mockGoogleReviews
      .sort((a, b) => b.time - a.time)
      .slice(0, 10);

    return Promise.resolve({
      success: true,
      data: {
        rating: 4.9,
        totalReviews: 147,
        reviews: recentReviews,
      },
    });
  }

  getUserReviews(productId: string) {
    const productReviews = this.userReviews
      .filter((review) => review.productId === productId && review.isApproved)
      .sort((a, b) => b.timestamp - a.timestamp);

    const averageRating =
      productReviews.length > 0
        ? productReviews.reduce((sum, review) => sum + review.rating, 0) /
          productReviews.length
        : 0;

    return Promise.resolve({
      success: true,
      data: {
        reviews: productReviews,
        totalReviews: productReviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
      },
    });
  }

  submitUserReview(
    reviewData: Omit<
      UserReview,
      'id' | 'timestamp' | 'helpful' | 'flagged' | 'isApproved'
    >,
  ) {
    const newReview: UserReview = {
      ...reviewData,
      id: Date.now().toString(),
      timestamp: Date.now(),
      helpful: 0,
      flagged: 0,
      isApproved: false, // Reviews need approval
    };

    this.userReviews.push(newReview);

    return Promise.resolve({
      success: true,
      message:
        'Review submitted successfully and will be reviewed before publishing',
    });
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGoogleReviews', () => {
    it('should return Google reviews with rating and total count', async () => {
      const result = await service.getGoogleReviews();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('rating', 4.9);
      expect(result.data).toHaveProperty('totalReviews', 147);
      expect(result.data.reviews).toBeInstanceOf(Array);
      expect(result.data.reviews.length).toBeLessThanOrEqual(10);
    });

    it('should return reviews sorted by time (newest first)', async () => {
      const result = await service.getGoogleReviews();
      const reviews = result.data.reviews;

      if (reviews.length > 1) {
        for (let i = 0; i < reviews.length - 1; i++) {
          expect(reviews[i].time).toBeGreaterThanOrEqual(reviews[i + 1].time);
        }
      }
    });

    it('should return reviews with required properties', async () => {
      const result = await service.getGoogleReviews();
      const review = result.data.reviews[0];

      expect(review).toHaveProperty('author_name');
      expect(review).toHaveProperty('rating');
      expect(review).toHaveProperty('relative_time_description');
      expect(review).toHaveProperty('text');
      expect(review).toHaveProperty('time');
      expect(review).toHaveProperty('language');
      expect(review).toHaveProperty('profile_photo_url');
    });
  });

  describe('getUserReviews', () => {
    it('should return empty results for product with no reviews', async () => {
      const result = await service.getUserReviews('non-existent-product');

      expect(result.success).toBe(true);
      expect(result.data.reviews).toEqual([]);
      expect(result.data.totalReviews).toBe(0);
      expect(result.data.averageRating).toBe(0);
    });

    it('should return filtered reviews for specific product', async () => {
      // First, add a review
      await service.submitUserReview({
        productId: 'test-product',
        name: 'Test User',
        email: 'test@example.com',
        rating: 5,
        title: 'Great product',
        comment: 'Very satisfied',
        isVerified: true,
      });

      // Manually approve the review for testing
      (service as any).userReviews[0].isApproved = true;

      const result = await service.getUserReviews('test-product');

      expect(result.success).toBe(true);
      expect(result.data.reviews).toHaveLength(1);
      expect(result.data.totalReviews).toBe(1);
      expect(result.data.averageRating).toBe(5);
    });

    it('should calculate correct average rating', async () => {
      // Add multiple reviews
      const reviews = [
        { rating: 5, productId: 'test-product-2' },
        { rating: 4, productId: 'test-product-2' },
        { rating: 3, productId: 'test-product-2' },
      ];

      for (const review of reviews) {
        await service.submitUserReview({
          ...review,
          name: 'Test User',
          email: 'test@example.com',
          title: 'Test',
          comment: 'Test comment',
          isVerified: true,
        });
      }

      // Approve all reviews for testing
      const userReviews = (service as any).userReviews;
      userReviews.forEach((review: any) => {
        if (review.productId === 'test-product-2') {
          review.isApproved = true;
        }
      });

      const result = await service.getUserReviews('test-product-2');

      expect(result.data.averageRating).toBe(4); // (5+4+3)/3 = 4
    });

    it('should only return approved reviews', async () => {
      await service.submitUserReview({
        productId: 'test-product-3',
        name: 'Test User',
        email: 'test@example.com',
        rating: 5,
        title: 'Unapproved review',
        comment: 'This should not appear',
        isVerified: true,
      });

      const result = await service.getUserReviews('test-product-3');

      expect(result.data.reviews).toHaveLength(0);
      expect(result.data.totalReviews).toBe(0);
    });
  });

  describe('submitUserReview', () => {
    it('should submit review successfully', async () => {
      const reviewData = {
        productId: 'roller-blinds',
        name: 'John Doe',
        email: 'john@example.com',
        rating: 5,
        title: 'Excellent product',
        comment: 'Very happy with the quality of the roller blinds',
        isVerified: true,
      };

      const result = await service.submitUserReview(reviewData);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Review submitted successfully and will be reviewed before publishing',
      );
    });

    it('should create review with correct properties', async () => {
      const reviewData = {
        productId: 'roman-blinds',
        name: 'Jane Smith',
        email: 'jane@example.com',
        rating: 4,
        title: 'Good quality',
        comment: 'Nice Roman blinds, good value for money',
        isVerified: false,
      };

      await service.submitUserReview(reviewData);

      const userReviews = (service as any).userReviews;
      const addedReview = userReviews[userReviews.length - 1];

      expect(addedReview).toMatchObject({
        productId: 'roman-blinds',
        name: 'Jane Smith',
        email: 'jane@example.com',
        rating: 4,
        title: 'Good quality',
        comment: 'Nice Roman blinds, good value for money',
        isVerified: false,
        isApproved: false,
        helpful: 0,
        flagged: 0,
      });

      expect(addedReview.id).toBeDefined();
      expect(addedReview.timestamp).toBeDefined();
    });

    it('should set isApproved to false by default', async () => {
      const reviewData = {
        productId: 'shutters',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        rating: 3,
        title: 'Average',
        comment: 'Shutters are okay',
        isVerified: true,
      };

      await service.submitUserReview(reviewData);

      const userReviews = (service as any).userReviews;
      const addedReview = userReviews[userReviews.length - 1];

      expect(addedReview.isApproved).toBe(false);
    });
  });
});

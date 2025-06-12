import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { GoogleReviewsService } from './google-reviews.service';

// Mock del GoogleReviewsService
const mockGoogleReviewsService = {
  getReviews: jest.fn(),
};

describe('ReviewsService', () => {
  let service: ReviewsService;
  let googleReviewsService: GoogleReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: GoogleReviewsService,
          useValue: mockGoogleReviewsService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    googleReviewsService =
      module.get<GoogleReviewsService>(GoogleReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGoogleReviews', () => {
    it('should return Google reviews when API call is successful', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          rating: 4.9,
          totalReviews: 147,
          reviews: [
            {
              author_name: 'Test User',
              rating: 5,
              relative_time_description: 'hace 2 días',
              text: 'Excelente servicio',
              time: Date.now(),
              language: 'es',
              profile_photo_url: 'https://example.com/photo.jpg',
            },
          ],
        },
      };

      mockGoogleReviewsService.getReviews.mockResolvedValue(mockApiResponse);

      const result = await service.getGoogleReviews();

      expect(result.success).toBe(true);
      expect(result.data.rating).toBe(4.9);
      expect(result.data.totalReviews).toBe(147);
      expect(result.data.reviews).toHaveLength(1);
      expect(googleReviewsService.getReviews).toHaveBeenCalled();
    });

    it('should return fallback reviews when API call fails', async () => {
      mockGoogleReviewsService.getReviews.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const result = await service.getGoogleReviews();

      expect(result.success).toBe(true);
      expect(result.data.totalReviews).toBe(0); // Indica fallback
      expect(result.data.reviews).toHaveLength(1);
      expect(result.data.reviews[0].author_name).toBe('Cliente Verificado');
    });

    it('should handle exceptions and return fallback', async () => {
      mockGoogleReviewsService.getReviews.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.getGoogleReviews();

      expect(result.success).toBe(true);
      expect(result.data.totalReviews).toBe(0); // Indica fallback
      expect(result.data.reviews).toBeDefined();
    });

    it('should limit reviews to 10 items', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          rating: 4.9,
          totalReviews: 50,
          reviews: Array.from({ length: 15 }, (_, i) => ({
            author_name: `User ${i}`,
            rating: 5,
            relative_time_description: 'hace 1 día',
            text: `Review ${i}`,
            time: Date.now(),
            language: 'es',
            profile_photo_url: 'https://example.com/photo.jpg',
          })),
        },
      };

      mockGoogleReviewsService.getReviews.mockResolvedValue(mockApiResponse);

      const result = await service.getGoogleReviews();

      expect(result.data.reviews.length).toBeLessThanOrEqual(10);
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
        comment: 'Love it!',
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

    it('should calculate average rating correctly', async () => {
      // Add multiple reviews
      const reviews = [
        { rating: 5, title: 'Excellent', comment: 'Perfect!' },
        { rating: 4, title: 'Good', comment: 'Nice product' },
        { rating: 3, title: 'Average', comment: "It's okay" },
      ];

      for (const review of reviews) {
        await service.submitUserReview({
          ...review,
          productId: 'test-product-2',
          name: 'Test User',
          email: 'test@example.com',
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

      expect(result.success).toBe(true);
      expect(result.data.reviews).toHaveLength(3);
      expect(result.data.averageRating).toBe(4); // (5+4+3)/3 = 4
    });

    it('should only return approved reviews', async () => {
      await service.submitUserReview({
        productId: 'test-product-3',
        name: 'Test User',
        email: 'test@example.com',
        rating: 5,
        title: 'Great product',
        comment: 'Love it!',
        isVerified: true,
      });

      const result = await service.getUserReviews('test-product-3');

      expect(result.success).toBe(true);
      expect(result.data.reviews).toHaveLength(0); // No approved reviews
      expect(result.data.totalReviews).toBe(0);
    });
  });

  describe('submitUserReview', () => {
    it('should submit a review successfully', async () => {
      const reviewData = {
        productId: 'test-product',
        name: 'John Doe',
        email: 'john@example.com',
        rating: 5,
        title: 'Amazing product',
        comment: 'Really satisfied with the quality',
        isVerified: true,
      };

      const result = await service.submitUserReview(reviewData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Review submitted successfully');
    });

    it('should set review as not approved by default', async () => {
      const reviewData = {
        productId: 'test-product',
        name: 'John Doe',
        email: 'john@example.com',
        rating: 5,
        title: 'Amazing product',
        comment: 'Really satisfied with the quality',
        isVerified: true,
      };

      await service.submitUserReview(reviewData);

      const userReviews = (service as any).userReviews;
      const submittedReview = userReviews.find(
        (r: any) => r.email === 'john@example.com',
      );

      expect(submittedReview).toBeDefined();
      expect(submittedReview.isApproved).toBe(false);
      expect(submittedReview.helpful).toBe(0);
      expect(submittedReview.flagged).toBe(0);
    });

    it('should generate unique IDs and timestamps', async () => {
      const reviewData = {
        productId: 'test-product',
        name: 'Jane Doe',
        email: 'jane@example.com',
        rating: 4,
        title: 'Good product',
        comment: 'Happy with purchase',
        isVerified: false,
      };

      await service.submitUserReview(reviewData);

      const userReviews = (service as any).userReviews;
      const submittedReview = userReviews.find(
        (r: any) => r.email === 'jane@example.com',
      );

      expect(submittedReview.id).toBeDefined();
      expect(submittedReview.timestamp).toBeDefined();
      expect(typeof submittedReview.id).toBe('string');
      expect(typeof submittedReview.timestamp).toBe('number');
    });
  });
});

import { Injectable } from '@nestjs/common';
import { GoogleReviewsService } from './google-reviews.service';

export interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  isReal?: boolean; // Marcador opcional para distinguir reviews reales de sintéticas
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

  constructor(private readonly googleReviewsService: GoogleReviewsService) {}

  // Método actualizado para usar la API real de Google
  async getGoogleReviews() {
    try {
      // Intentar obtener reviews reales de Google
      const realReviews = await this.googleReviewsService.getReviews();

      if (realReviews.success && realReviews.data) {
        return {
          success: true,
          data: {
            rating: realReviews.data.rating,
            totalReviews: realReviews.data.totalReviews,
            reviews: realReviews.data.reviews, // Sin límite artificial
          },
        };
      }

      // Si falla la API real, usar datos de fallback (opcional)
      return this.getFallbackReviews();
    } catch (error) {
      console.error('Error fetching Google reviews:', error);
      return this.getFallbackReviews();
    }
  }

  // Método de fallback con algunas reviews de ejemplo (solo en caso de emergencia)
  private getFallbackReviews() {
    const fallbackReviews: GoogleReview[] = [
      {
        author_name: 'Cliente Verificado',
        rating: 5,
        relative_time_description: 'Hace 1 semana',
        text: 'Excelente servicio de Quality Blinds. Instalación profesional y productos de alta calidad.',
        time: Date.now() - 7 * 24 * 60 * 60 * 1000,
        language: 'es',
        profile_photo_url:
          'https://lh3.googleusercontent.com/a/default-user=s40-c',
      },
    ];

    return {
      success: true,
      data: {
        rating: 4.8,
        totalReviews: 0, // Indica que son datos de fallback
        reviews: fallbackReviews,
      },
    };
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

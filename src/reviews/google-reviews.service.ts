import { Injectable, Logger } from '@nestjs/common';
import { GoogleReview } from './reviews.service';

@Injectable()
export class GoogleReviewsService {
  private readonly logger = new Logger(GoogleReviewsService.name);

  constructor() {
    this.logger.log('Google Reviews API service initialized');
  }

  /**
   * Método principal que obtiene SOLO reviews reales de Google Places API
   */
  async getReviews(): Promise<{
    success: boolean;
    data?: { rating: number; totalReviews: number; reviews: GoogleReview[] };
    error?: string;
  }> {
    return this.getGooglePlacesReviews();
  }

  /**
   * Google Places API - SOLO reviews reales (limitado por Google a 5 máximo)
   */
  private async getGooglePlacesReviews(): Promise<{
    success: boolean;
    data?: { rating: number; totalReviews: number; reviews: GoogleReview[] };
    error?: string;
  }> {
    try {
      const placeId = process.env.GOOGLE_PLACE_ID;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!placeId || !apiKey) {
        this.logger.error(
          'GOOGLE_PLACE_ID or GOOGLE_PLACES_API_KEY not configured',
        );
        throw new Error('Google Places API not configured');
      }

      this.logger.log('Fetching REAL reviews from Google Places API ONLY');

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        this.logger.error(`Google Places API error: ${data.status}`);
        throw new Error(`Google Places API error: ${data.status}`);
      }

      const place = data.result;
      const reviews = place.reviews || [];

      this.logger.log(`Found ${reviews.length} REAL reviews for ${place.name}`);

      // Formatear SOLO las reviews reales de Google
      const formattedReviews: GoogleReview[] = reviews.map((review: any) => ({
        author_name: review.author_name || 'Anonymous',
        author_url: review.author_url,
        language: review.language || 'en',
        profile_photo_url: review.profile_photo_url,
        rating: review.rating || 0,
        relative_time_description:
          review.relative_time_description || 'Unknown time',
        text: review.text || '',
        time: review.time ? review.time * 1000 : Date.now(),
      }));

      // Ordenar por fecha (más reciente primero)
      const sortedReviews = formattedReviews.sort((a, b) => b.time - a.time);

      // Estadísticas REALES
      const ratingCounts = {
        5: sortedReviews.filter((r) => r.rating === 5).length,
        4: sortedReviews.filter((r) => r.rating === 4).length,
        3: sortedReviews.filter((r) => r.rating === 3).length,
        2: sortedReviews.filter((r) => r.rating === 2).length,
        1: sortedReviews.filter((r) => r.rating === 1).length,
      };

      this.logger
        .log(`🔍 REAL Google Reviews ONLY (${sortedReviews.length} total):
        - ⭐⭐⭐⭐⭐ 5 stars: ${ratingCounts[5]}
        - ⭐⭐⭐⭐ 4 stars: ${ratingCounts[4]}
        - ⭐⭐⭐ 3 stars: ${ratingCounts[3]}
        - ⭐⭐ 2 stars: ${ratingCounts[2]}
        - ⭐ 1 star: ${ratingCounts[1]}
        - 🚨 LIMITATION: Google Places API only returns max 5 reviews
        - 📊 Your business has ${place.user_ratings_total} total reviews on Google`);

      return {
        success: true,
        data: {
          rating: place.rating || 0,
          totalReviews: place.user_ratings_total || 0,
          reviews: sortedReviews,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching Google Places reviews:', error.message);
      return {
        success: false,
        error: `Failed to fetch Google reviews: ${error.message}`,
      };
    }
  }

  /**
   * Método para probar la conexión con la API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const placeId = process.env.GOOGLE_PLACE_ID;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!placeId || !apiKey) {
        return {
          success: false,
          message: 'Google Places API credentials not configured',
        };
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total&key=${apiKey}`,
      );

      const data = await response.json();

      if (data.status === 'OK') {
        return {
          success: true,
          message: `Successfully connected to Google Places API for ${data.result.name}`,
          data: {
            name: data.result.name,
            rating: data.result.rating,
            totalReviews: data.result.user_ratings_total,
          },
        };
      } else {
        return {
          success: false,
          message: `Google Places API error: ${data.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  }
}

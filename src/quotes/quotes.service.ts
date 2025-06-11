import { Injectable } from '@nestjs/common';

@Injectable()
export class QuotesService {
  async processQuoteRequest(data: any): Promise<{
    success: boolean;
    message: string;
  }> {
    // Procesamos la solicitud de cotización
    console.log('Quote request received:', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      postcode: data.postcode,
      product: data.product,
      roomType: data.roomType,
      windowCount: data.windowCount,
      budget: data.budget,
      urgency: data.urgency,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      estimatedValue: this.getBudgetValue(data.budget),
      leadScore: this.calculateLeadScore(data),
    });

    return {
      success: true,
      message: 'Quote request submitted successfully',
    };
  }

  private getBudgetValue(budget: string): number {
    const budgetMap: Record<string, number> = {
      'under-500': 400,
      '500-1000': 750,
      '1000-2000': 1500,
      '2000-5000': 3500,
      'over-5000': 7500,
    };
    return budgetMap[budget] || 0;
  }

  private calculateLeadScore(data: any): number {
    let score = 0;

    // Contact completeness (30 points)
    if (data.name && data.email && data.phone) score += 30;

    // Location completeness (20 points)
    if (data.address && data.city && data.postcode) score += 20;

    // Project details (25 points)
    if (data.roomType && data.windowCount) score += 25;

    // Budget provided (15 points)
    if (data.budget) score += 15;

    // Urgency (10 points - higher for urgent)
    if (data.urgency === 'asap') score += 10;
    else if (data.urgency === 'this-month') score += 8;
    else if (data.urgency === 'next-month') score += 5;

    return score;
  }
}

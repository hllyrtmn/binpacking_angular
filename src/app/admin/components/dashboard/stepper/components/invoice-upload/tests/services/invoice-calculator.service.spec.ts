// services/invoice-calculator.service.ts (Complete Fix)

import { Injectable } from '@angular/core';
import { OrderDetail } from '../../../../../../../../models/order-detail.interface';
import { WeightType, CalculationResult } from '../../models/invoice-upload-interfaces';
@Injectable({
  providedIn: 'root'
})
export class InvoiceCalculatorService {

  calculateTotalWeight(orderDetails: OrderDetail[], weightType: WeightType): CalculationResult {
    try {
      // Handle null/undefined inputs
      if (!orderDetails || !Array.isArray(orderDetails)) {
        return { totalWeight: 0 };
      }

      const totalWeight = orderDetails.reduce((sum, detail) => {
        if (!detail || !detail.product) {
          return sum;
        }

        const productWeight = detail.product?.weight_type?.[weightType];
        const count = detail.count;

        // Handle NaN, null, undefined values
        const safeWeight = (productWeight != null && !isNaN(productWeight) && isFinite(productWeight)) ? productWeight : 0;
        const safeCount = (count != null && !isNaN(count) && isFinite(count)) ? count : 0;

        return sum + (safeWeight * safeCount);
      }, 0);

      // Ensure result is safe
      return {
        totalWeight: (totalWeight != null && !isNaN(totalWeight) && isFinite(totalWeight)) ? totalWeight : 0
      };
    } catch (error) {
      console.error('Weight calculation error:', error);
      return { totalWeight: 0 };
    }
  }

  calculateDetailWeight(detail: OrderDetail, weightType: WeightType): number {
    try {
      if (!detail || !detail.product) {
        return 0;
      }

      const productWeight = detail.product?.weight_type?.[weightType];
      const count = detail.count;

      // Handle NaN, null, undefined values
      const safeWeight = (productWeight != null && !isNaN(productWeight) && isFinite(productWeight)) ? productWeight : 0;
      const safeCount = (count != null && !isNaN(count) && isFinite(count)) ? count : 0;

      const result = safeWeight * safeCount;

      // Ensure result is safe
      return (result != null && !isNaN(result) && isFinite(result)) ? result : 0;
    } catch (error) {
      console.error('Detail weight calculation error:', error);
      return 0;
    }
  }

  validateWeightType(weightType: string): weightType is WeightType {
    return ['std', 'pre', 'eco'].includes(weightType);
  }

  getAvailableWeightTypes(): WeightType[] {
    return ['std', 'pre', 'eco'];
  }

  formatWeight(weight: number, precision: number = 2): string {
    if (!isFinite(weight) || isNaN(weight)) {
      return '0.00';
    }
    return weight.toFixed(precision);
  }

  calculateWeightPercentage(partialWeight: number, totalWeight: number): number {
    if (!isFinite(totalWeight) || isNaN(totalWeight) || totalWeight === 0) {
      return 0;
    }

    if (!isFinite(partialWeight) || isNaN(partialWeight)) {
      return 0;
    }

    const result = (partialWeight / totalWeight) * 100;
    return isFinite(result) ? result : 0;
  }
}

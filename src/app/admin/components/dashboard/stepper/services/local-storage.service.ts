import { Injectable } from '@angular/core';
import { Order } from '../../../../../models/order.interface';
import { OrderDetail } from '../../../../../models/order-detail.interface';
import { UiPackage } from '../components/ui-models/ui-package.model';

interface StepperStorageData {
  // Step 1 verileri
  step1: {
    order: Order | null;
    orderDetails: OrderDetail[];
    hasFile: boolean;
    fileName?: string;
    isCompleted: boolean;
  };

  // Step 2 verileri
  step2: {
    packages: any[];
    isCompleted: boolean;
  };

  // Step 3 verileri
  step3: {
    optimizationResult: any;
    reportFiles: any[];
    isCompleted: boolean;
  };

  // Meta bilgiler
  currentStep: number;
  lastSaved: string;
  version: string; // Breaking change'ler için
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  private readonly STORAGE_KEY = 'stepper_draft_data';
  private readonly STORAGE_VERSION = '1.0.0';
  private readonly EXPIRY_DAYS = 30; // 30 gün sonra expire et

  constructor() {
    this.cleanupExpiredData();
  }

  /**
   * ✅ Data'yı localStorage'a kaydet
   */
  saveStepperData(data: Partial<StepperStorageData>): void {
    try {
      const existingData = this.getStepperData();
      const updatedData: StepperStorageData = {
        ...existingData,
        ...data,
        lastSaved: new Date().toISOString(),
        version: this.STORAGE_VERSION
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));

    } catch (error) {

      this.handleStorageError();
    }
  }

  /**
   * ✅ Data'yı localStorage'dan oku
   */
  getStepperData(): StepperStorageData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        // Version check
        if (parsed.version !== this.STORAGE_VERSION) {

          this.clearStorage();
          return this.getDefaultData();
        }

        // Expiry check
        if (this.isDataExpired(parsed.lastSaved)) {

          this.clearStorage();
          return this.getDefaultData();
        }

        return parsed;
      }
    } catch (error) {

      this.clearStorage();
    }

    return this.getDefaultData();
  }

  /**
   * ✅ Expiry kontrolü
   */
  private isDataExpired(lastSaved: string): boolean {
    try {
      const lastSavedDate = new Date(lastSaved);
      const now = new Date();
      const daysDiff = (now.getTime() - lastSavedDate.getTime()) / (1000 * 3600 * 24);

      return daysDiff > this.EXPIRY_DAYS;
    } catch (error) {
      return true; // Hata durumunda expired say
    }
  }

  /**
   * ✅ Expired data cleanup
   */
  private cleanupExpiredData(): void {
    try {
      const data = this.getStepperData();
      // getStepperData zaten expiry check yapıyor
    } catch (error) {

      this.clearStorage();
    }
  }

  /**
   * ✅ Storage error handling
   */
  private handleStorageError(): void {
    // Storage quota exceeded veya başka hata durumları
    try {
      // Eski verileri temizle
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('stepper_') && key !== this.STORAGE_KEY) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {

    }
  }

  /**
   * ✅ Step 1 verilerini kaydet
   */
  saveStep1Data(order: Order | null, orderDetails: OrderDetail[], hasFile: boolean = false, fileName?: string): void {
    this.saveStepperData({
      step1: {
        order,
        orderDetails,
        hasFile,
        fileName,
        isCompleted: order !== null && orderDetails.length > 0
      },
      currentStep: 1
    });
  }

  /**
   * ✅ Step 2 verilerini kaydet
   */
  saveStep2Data(packages: UiPackage[]): void {
    const serializedPackages = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      pallet: pkg.pallet,
      products: pkg.products,
      order: pkg.order
    }));

    this.saveStepperData({
      step2: {
        packages: serializedPackages,
        isCompleted: packages.length > 0
      },
      currentStep: 2
    });
  }

  /**
   * ✅ Step 3 verilerini kaydet
   */
  saveStep3Data(optimizationResult: any, reportFiles: any[] = []): void {
    this.saveStepperData({
      step3: {
        optimizationResult,
        reportFiles,
        isCompleted: true
      },
      currentStep: 3
    });
  }

  /**
   * ✅ Step completion status
   */
  isStepCompleted(stepNumber: number): boolean {
    const data = this.getStepperData();

    switch (stepNumber) {
      case 1: return data.step1?.isCompleted || false;
      case 2: return data.step2?.isCompleted || false;
      case 3: return data.step3?.isCompleted || false;
      default: return false;
    }
  }

  /**
   * ✅ Data restore metodları
   */
  restoreStep1Data(): { order: Order | null, orderDetails: OrderDetail[], hasFile: boolean, fileName?: string } | null {
    const data = this.getStepperData();

    if (data.step1?.isCompleted) {
      return {
        order: data.step1.order,
        orderDetails: data.step1.orderDetails,
        hasFile: data.step1.hasFile,
        fileName: data.step1.fileName
      };
    }
    return null;
  }

  restoreStep2Data(): any[] | null {
    const data = this.getStepperData();
    return data.step2?.isCompleted ? data.step2.packages : null;
  }

  restoreStep3Data(): { optimizationResult: any, reportFiles: any[] } | null {
    const data = this.getStepperData();

    if (data.step3?.isCompleted) {
      return {
        optimizationResult: data.step3.optimizationResult,
        reportFiles: data.step3.reportFiles
      };
    }
    return null;
  }

  /**
   * ✅ Utility metodlar
   */
  getCurrentStep(): number {
    const data = this.getStepperData();
    return data.currentStep || 1;
  }

  hasExistingData(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored !== null;
    } catch {
      return false;
    }
  }

  clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);

    } catch (error) {

    }
  }

  /**
   * ✅ Storage bilgileri
   */
  getStorageInfo(): {
    hasData: boolean;
    lastSaved: Date | null;
    daysOld: number;
    isExpiringSoon: boolean;
  } {
    try {
      const data = this.getStepperData();

      if (!data.lastSaved) {
        return { hasData: false, lastSaved: null, daysOld: 0, isExpiringSoon: false };
      }

      const lastSaved = new Date(data.lastSaved);
      const now = new Date();
      const daysOld = (now.getTime() - lastSaved.getTime()) / (1000 * 3600 * 24);
      const isExpiringSoon = daysOld > (this.EXPIRY_DAYS - 7); // Son 7 gün

      return {
        hasData: true,
        lastSaved,
        daysOld: Math.round(daysOld * 10) / 10,
        isExpiringSoon
      };
    } catch {
      return { hasData: false, lastSaved: null, daysOld: 0, isExpiringSoon: false };
    }
  }

  /**
   * ✅ Default data structure
   */
  private getDefaultData(): StepperStorageData {
    return {
      step1: {
        order: null,
        orderDetails: [],
        hasFile: false,
        isCompleted: false
      },
      step2: {
        packages: [],
        isCompleted: false
      },
      step3: {
        optimizationResult: null,
        reportFiles: [],
        isCompleted: false
      },
      currentStep: 1,
      lastSaved: new Date().toISOString(),
      version: this.STORAGE_VERSION
    };
  }
}

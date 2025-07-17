// session-storage.service.ts
import { Injectable } from '@angular/core';
import { Order } from '../../../../../models/order.interface';
import { OrderDetail } from '../../../../../models/order-detail.interface';
import { UiPackage } from '../components/ui-models/ui-package.model';

interface StepperSessionData {
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
    packages: any[]; // UiPackage array olarak serialize edilecek
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
  lastSaved: string; // ISO date string
}

@Injectable({
  providedIn: 'root'
})
export class SessionStorageService {

  private readonly STORAGE_KEY = 'stepper_session_data';
  private readonly SESSION_TIMEOUT_HOURS = 24; // 24 saat sonra expire et

  constructor() {
    this.cleanupExpiredSessions();
   }

  /**
   * Session data'yı kaydet
   */
  saveSessionData(data: Partial<StepperSessionData>): void {
    try {
      const existingData = this.getSessionData();
      const updatedData = { ...existingData, ...data };
      updatedData.lastSaved = new Date().toISOString();

      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
      console.log('✅ Session data kaydedildi:', updatedData);
    } catch (error) {
      console.error('❌ Session data kaydedilemedi:', error);
    }
  }

   /**
   * Session'ın expire olup olmadığını kontrol et
   */
  private isSessionExpired(lastSaved: string): boolean {
    try {
      const lastSavedDate = new Date(lastSaved);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastSavedDate.getTime()) / (1000 * 3600);

      return hoursDiff > this.SESSION_TIMEOUT_HOURS;
    } catch (error) {
      console.error('Session expire kontrolü hatası:', error);
      return true; // Hata durumunda expired say
    }
  }

  /**
   * Expired session'ları temizle
   */
  private cleanupExpiredSessions(): void {
    try {
      const existingData = this.getSessionData();

      if (existingData.lastSaved && this.isSessionExpired(existingData.lastSaved)) {
        console.log('🧹 Expired session temizleniyor...');
        this.clearSession();
      }
    } catch (error) {
      console.error('Session cleanup hatası:', error);
      this.clearSession(); // Hata durumunda temizle
    }
  }

  /**
   * Session data'yı oku (expire kontrolü ile)
   */
  getSessionData(): StepperSessionData {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Expire kontrolü
        if (parsed.lastSaved && this.isSessionExpired(parsed.lastSaved)) {
          console.log('⏰ Session expired, temizleniyor...');
          this.clearSession();
          return this.getDefaultSessionData();
        }
        return parsed;
      }
    } catch (error) {
      console.error('❌ Session data okunamadı:', error);
      this.clearSession(); // Corrupted data'yı temizle
    }

    return this.getDefaultSessionData();
  }

  /**
   * Session süresi bilgisini al
   */
  getSessionAge(): { hours: number, isExpiringSoon: boolean } {
    try {
      const data = this.getSessionData();
      if (!data.lastSaved) {
        return { hours: 0, isExpiringSoon: false };
      }

      const lastSavedDate = new Date(data.lastSaved);
      const now = new Date();
      const hours = (now.getTime() - lastSavedDate.getTime()) / (1000 * 3600);
      const isExpiringSoon = hours > (this.SESSION_TIMEOUT_HOURS - 2); // Son 2 saat

      return { hours: Math.round(hours * 10) / 10, isExpiringSoon };
    } catch (error) {
      return { hours: 0, isExpiringSoon: false };
    }
  }

  /**
   * Session'ı manuel olarak refresh et (kullanıcı aktif olduğunda)
   */
  refreshSession(): void {
    try {
      const existingData = this.getSessionData();
      existingData.lastSaved = new Date().toISOString();
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));
      console.log('🔄 Session refreshed');
    } catch (error) {
      console.error('Session refresh hatası:', error);
    }
  }

  /**
   * Session warning (expire olmadan önce uyarı)
   */
  shouldShowExpiryWarning(): boolean {
    const { isExpiringSoon } = this.getSessionAge();
    return isExpiringSoon;
  }

  /**
   * Step 1 verilerini kaydet
   */
  saveStep1Data(order: Order | null, orderDetails: OrderDetail[], hasFile: boolean = false, fileName?: string): void {
    this.saveSessionData({
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
   * Step 2 verilerini kaydet
   */
  saveStep2Data(packages: UiPackage[]): void {
    // UiPackage'ları basit obje array'e çevir (serialize etmek için)
    const serializedPackages = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      pallet: pkg.pallet,
      products: pkg.products,
      order: pkg.order
    }));

    this.saveSessionData({
      step2: {
        packages: serializedPackages,
        isCompleted: packages.length > 0
      },
      currentStep: 2
    });
  }

  /**
   * Step 3 verilerini kaydet
   */
  saveStep3Data(optimizationResult: any, reportFiles: any[] = []): void {
    this.saveSessionData({
      step3: {
        optimizationResult,
        reportFiles,
        isCompleted: true
      },
      currentStep: 3
    });
  }

  /**
   * Step 1 verilerini restore et
   */
  restoreStep1Data(): { order: Order | null, orderDetails: OrderDetail[], hasFile: boolean, fileName?: string } | null {
    const data = this.getSessionData();

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

  /**
   * Step 2 verilerini restore et
   */
  restoreStep2Data(): any[] | null {
    const data = this.getSessionData();

    if (data.step2?.isCompleted) {
      return data.step2.packages;
    }

    return null;
  }

  /**
   * Step 3 verilerini restore et
   */
  restoreStep3Data(): { optimizationResult: any, reportFiles: any[] } | null {
    const data = this.getSessionData();

    if (data.step3?.isCompleted) {
      return {
        optimizationResult: data.step3.optimizationResult,
        reportFiles: data.step3.reportFiles
      };
    }

    return null;
  }

  /**
   * Step'in tamamlanıp tamamlanmadığını kontrol et
   */
  isStepCompleted(stepNumber: number): boolean {
    const data = this.getSessionData();

    switch (stepNumber) {
      case 1:
        return data.step1?.isCompleted || false;
      case 2:
        return data.step2?.isCompleted || false;
      case 3:
        return data.step3?.isCompleted || false;
      default:
        return false;
    }
  }

  /**
   * Current step'i al
   */
  getCurrentStep(): number {
    const data = this.getSessionData();
    return data.currentStep || 1;
  }

  /**
   * Session'ı temizle
   */
  clearSession(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Session temizlendi');
  }

  /**
   * Session var mı kontrol et
   */
  hasExistingSession(): boolean {
    const data = this.getSessionData();
    return data.lastSaved !== undefined;
  }

  /**
   * Default boş session data
   */
  private getDefaultSessionData(): StepperSessionData {
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
      lastSaved: new Date().toISOString()
    };
  }
}

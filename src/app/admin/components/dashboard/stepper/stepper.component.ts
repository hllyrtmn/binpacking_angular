// stepper.component.ts - İYİLEŞTİRİLMİŞ VERSİYON

import { Component, inject, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { StepperOrientation, MatStepperModule, MatStepper } from '@angular/material/stepper';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { InvoiceUploadComponent } from './components/invoice-upload/invoice-upload.component';
import { PalletControlComponent } from './components/pallet-control/pallet-control.component';
import { LoadingComponent } from "../../../../components/loading/loading.component";
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { ResultStepComponent } from './components/result-step/result-step.component';
import { StepperStore, STATUSES } from './services/stepper.store';
import { LocalStorageService } from './services/local-storage.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-stepper',
  imports: [
    MatStepperModule,
    FormsModule,
    LoadingComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncPipe,
    InvoiceUploadComponent,
    PalletControlComponent,
    LoadingComponent,
    ResultStepComponent
  ],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss'
})
export class StepperComponent implements OnInit, OnDestroy {
  @ViewChild('stepper') stepper!: MatStepper;
  @ViewChild('invoiceUploadComponent') invoiceUploadComponent!: InvoiceUploadComponent;
  @ViewChild('palletControlComponent') palletControlComponent!: PalletControlComponent;
  @ViewChild('resultStepComponent') resultStepComponent!: ResultStepComponent;

  private localStorageService = inject(LocalStorageService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>(); // ✅ Memory leak prevention

  stepperService = inject(StepperStore);
  selectedIndex: number = 0;
  order_id: string = '';

  // ✅ Activity tracking variables
  private activityRefreshInterval?: number;
  private readonly ACTIVITY_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 dakika

  stepperOrientation: Observable<StepperOrientation>;

  constructor() {
    const breakpointObserver = inject(BreakpointObserver);

    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(
        map(({ matches }) => matches ? 'horizontal' : 'vertical'),
        takeUntil(this.destroy$) // ✅ Subscription'ı temizle
      );
  }

  ngOnInit(): void {
    console.log('🚀 Stepper component başlatılıyor...');

    this.checkForExistingData();
    this.setupActivityTracking();
    this.checkServiceHealth();

    console.log('✅ Stepper component hazır');
  }

  ngOnDestroy(): void {
    console.log('🔄 Stepper component temizleniyor...');

    // ✅ Tüm subscription'ları temizle
    this.destroy$.next();
    this.destroy$.complete();

    // ✅ Activity tracking'i temizle
    this.cleanupActivityTracking();

    console.log('✅ Stepper component temizlendi');
  }

  private checkServiceHealth(): void {
    try {
      if (!this.stepperService) {
        console.error('❌ StepperService injection failed');
        this.handleInitializationError();
        return;
      }

      if (!this.localStorageService) {
        console.error('❌ LocalStorageService injection failed');
        this.handleInitializationError();
        return;
      }

      // StepperService health check
      if (typeof this.stepperService.isHealthy === 'function' && !this.stepperService.isHealthy()) {
        console.error('❌ StepperService is not healthy');
        this.handleInitializationError();
        return;
      }

      console.log('✅ All services are healthy');

    } catch (error) {
      console.error('❌ Service health check failed:', error);
      this.handleInitializationError();
    }
  }

  private handleInitializationError(): void {
    try {
      // Fallback initialization
      console.log('🔄 Attempting fallback initialization...');

      // Reset step service if possible
      if (this.stepperService?.resetStepper) {
        this.stepperService.resetStepper();
      }

      // Clear storage if possible
      if (this.localStorageService?.clearStorage) {
        this.localStorageService.clearStorage();
      }

      // Show user notification
      setTimeout(() => {
        if (this.toastService?.warning) {
          this.toastService.warning('Sistem başlatılırken bir sorun oluştu. Sayfa yeniden yüklenecek.');
        }

        // Reload page as last resort
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }, 1000);

    } catch (error) {
      console.error('❌ Fallback initialization failed:', error);
      // Force page reload
      window.location.reload();
    }
  }

  getStepCompleted(stepIndex: number): boolean {
    try {
      // Validate service
      if (!this.stepperService || !this.stepperService.steps) {
        console.warn('⚠️ StepperService or steps not available');
        return false;
      }

      // Validate index
      if (stepIndex < 0 || stepIndex >= this.stepperService.steps.length) {
        console.warn(`⚠️ Invalid step index: ${stepIndex}`);
        return false;
      }

      // Get step safely
      const step = this.stepperService.steps[stepIndex];
      if (!step || typeof step.completed !== 'function') {
        console.warn(`⚠️ Step ${stepIndex} or completed function not available`);
        return false;
      }

      // Execute completed function safely
      return step.completed() || false;

    } catch (error) {
      console.error(`❌ Error getting step ${stepIndex} completed status:`, error);
      return false;
    }
  }

  getStepEditable(stepIndex: number): boolean {
    try {
      // Validate service
      if (!this.stepperService || !this.stepperService.steps) {
        console.warn('⚠️ StepperService or steps not available');
        return stepIndex === 0; // Default: only first step editable
      }

      // Validate index
      if (stepIndex < 0 || stepIndex >= this.stepperService.steps.length) {
        console.warn(`⚠️ Invalid step index: ${stepIndex}`);
        return stepIndex === 0;
      }

      // Get step safely
      const step = this.stepperService.steps[stepIndex];
      if (!step || !step.editable || typeof step.editable !== 'function') {
        console.warn(`⚠️ Step ${stepIndex} or editable function not available`);
        return stepIndex === 0;
      }

      // Execute editable function safely
      return step.editable() || false;

    } catch (error) {
      console.error(`❌ Error getting step ${stepIndex} editable status:`, error);
      return stepIndex === 0; // Safe default
    }
  }

  getStepDirty(stepIndex: number): boolean {
    try {
      if (!this.stepperService || !this.stepperService.steps) {
        return false;
      }

      if (stepIndex < 0 || stepIndex >= this.stepperService.steps.length) {
        return false;
      }

      const step = this.stepperService.steps[stepIndex];
      if (!step || !step.is_dirty || typeof step.is_dirty !== 'function') {
        return false;
      }

      return step.is_dirty() || false;

    } catch (error) {
      console.error(`❌ Error getting step ${stepIndex} dirty status:`, error);
      return false;
    }
  }

  /**
   * ✅ Mevcut kaydedilmiş veri kontrolü
   */
  private checkForExistingData(): void {
    try {
      if (!this.localStorageService || typeof this.localStorageService.getStorageInfo !== 'function') {
        console.warn('⚠️ LocalStorageService not available for data check');
        return;
      }

      const storageInfo = this.localStorageService.getStorageInfo();

      if (storageInfo && storageInfo.hasData) {
        console.log('📂 Mevcut draft verisi bulundu:', storageInfo);

        if (storageInfo.isExpiringSoon) {
          console.warn('⚠️ Draft verisi yakında expire olacak');

          // User'a uyarı göster
          if (this.toastService?.warning) {
            this.toastService.warning('Kaydedilmiş verileriniz yakında silinecek. Lütfen işleminizi tamamlayın.');
          }
        }

        this.initializeStepsFromStorage();
      }
    } catch (error) {
      console.error('❌ Existing data check error:', error);
    }
  }

  /**
   * ✅ Storage'dan step durumlarını başlat
   */
  private initializeStepsFromStorage(): void {
    try {
      if (!this.localStorageService || typeof this.localStorageService.getCurrentStep !== 'function') {
        console.warn('⚠️ Cannot initialize from storage - service not available');
        return;
      }

      const currentStep = this.localStorageService.getCurrentStep();

      // Validate current step
      if (typeof currentStep !== 'number' || currentStep < 1 || currentStep > 3) {
        console.warn(`⚠️ Invalid current step: ${currentStep}`);
        return;
      }

      // Set completed steps
      for (let i = 1; i <= Math.min(currentStep + 1, 3); i++) {
        try {
          if (this.localStorageService.isStepCompleted(i)) {
            if (this.stepperService && typeof this.stepperService.setStepStatus === 'function') {
              this.stepperService.setStepStatus(i, STATUSES.completed, true);
            }
          }
        } catch (error) {
          console.error(`❌ Error setting step ${i} status:`, error);
        }
      }

      // Navigate to current step
      if (this.stepper && currentStep > 1) {
        setTimeout(() => {
          try {
            if (this.stepper) {
              this.stepper.selectedIndex = currentStep - 1;
            }
          } catch (error) {
            console.error('❌ Navigation error:', error);
          }
        }, 100);
      }

    } catch (error) {
      console.error('❌ Storage initialization error:', error);
    }
  }

  /**
   * ✅ Activity tracking setup (memory safe)
   */
  private setupActivityTracking(): void {
    // Interval setup
    try {
      // Safe interval setup
      this.activityRefreshInterval = window.setInterval(() => {
        try {
          if (this.localStorageService &&
              typeof this.localStorageService.hasExistingData === 'function' &&
              this.localStorageService.hasExistingData()) {
            console.log('🔄 Draft data activity refresh');
          }
        } catch (error) {
          console.error('❌ Activity refresh error:', error);
        }
      }, this.ACTIVITY_REFRESH_INTERVAL);

      // Safe event listeners
      const activityHandler = () => {
        try {
          if (this.localStorageService &&
              typeof this.localStorageService.hasExistingData === 'function' &&
              this.localStorageService.hasExistingData()) {
            // Activity detected
          }
        } catch (error) {
          console.error('❌ Activity handler error:', error);
        }
      };

      const eventOptions = { passive: true };
      const events = ['click', 'keypress', 'scroll'];

      events.forEach(eventType => {
        try {
          document.addEventListener(eventType, activityHandler, eventOptions);
        } catch (error) {
          console.error(`❌ Event listener setup error for ${eventType}:`, error);
        }
      });

      // Cleanup subscription
      this.destroy$.subscribe(() => {
        events.forEach(eventType => {
          try {
            document.removeEventListener(eventType, activityHandler);
          } catch (error) {
            console.error(`❌ Event listener cleanup error for ${eventType}:`, error);
          }
        });
      });

    } catch (error) {
      console.error('❌ Activity tracking setup error:', error);
    }
  }

  debugStepperState(): void {
    try {
      console.log('🐛 === STEPPER DEBUG INFO ===');
      console.log('StepperService available:', !!this.stepperService);
      console.log('LocalStorageService available:', !!this.localStorageService);

      if (this.stepperService) {
        console.log('StepperService healthy:', this.stepperService.isHealthy?.() || 'unknown');
        console.log('Steps length:', this.stepperService.steps?.length || 'unknown');

        // Log each step status
        for (let i = 0; i < 3; i++) {
          console.log(`Step ${i + 1}:`, {
            completed: this.getStepCompleted(i),
            editable: this.getStepEditable(i),
            dirty: this.getStepDirty(i),
          });
        }
      }

      if (this.localStorageService) {
        console.log('Storage info:', this.localStorageService.getStorageInfo?.() || 'unknown');
      }

      console.log('=== END DEBUG INFO ===');
    } catch (error) {
      console.error('❌ Debug method error:', error);
    }
  }

  /**
   * ✅ Activity tracking cleanup
   */
  private cleanupActivityTracking(): void {
    if (this.activityRefreshInterval) {
      clearInterval(this.activityRefreshInterval);
      this.activityRefreshInterval = undefined;
    }
  }

  /**
   * ✅ Shipment completed - tam reset
   */
  onShipmentCompleted(): void {
    console.log('🔄 Shipment completed, full reset başlıyor...');

    try {
      // Step 1: Reset components
      this.resetAllComponents();

      // Step 2: Clear storage
      if (this.localStorageService && typeof this.localStorageService.clearStorage === 'function') {
        this.localStorageService.clearStorage();
      }

      // Step 3: Reset stepper
      if (this.stepperService && typeof this.stepperService.resetStepper === 'function') {
        this.stepperService.resetStepper();
      }

      // Step 4: Reset navigation
      this.resetStepperNavigation();

      console.log('✅ Full reset tamamlandı');

    } catch (error) {
      console.error('❌ Reset hatası:', error);

      // Fallback: force page reload
      if (this.toastService?.error) {
        this.toastService.error('Reset sırasında hata oluştu. Sayfa yeniden yüklenecek.');
      }

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  /**
   * ✅ Stepper navigation reset
   */
  private resetStepperNavigation(): void {
    if (this.stepper) {
      // Linear mode'u geçici olarak kapat
      this.stepper.linear = false;

      // Step 1'e git
      this.stepper.selectedIndex = 0;
      this.selectedIndex = 0;

      // Kısa bir delay sonra linear mode'u tekrar aç
      setTimeout(() => {
        if (this.stepper) {
          this.stepper.linear = true;
        }
      }, 500);
    }
  }

  /**
   * ✅ Component reset
   */
  private resetAllComponents(): void {
    console.log('🔄 Componentler reset ediliyor...');

    try {
      if (this.invoiceUploadComponent) {
        this.invoiceUploadComponent.resetComponentState();
      }

      if (this.palletControlComponent) {
        this.palletControlComponent.resetComponentState();
      }

      // Order ID'yi de reset et
      this.order_id = '';

      console.log('✅ Componentler reset edildi');

    } catch (error) {
      console.error('❌ Component reset hatası:', error);
    }
  }

  /**
   * ✅ Step event handler'lar
   */
  orderIdComeOn(id: string): void {
    this.order_id = id;
    console.log('📋 Order ID alındı:', this.order_id);
    this.selectedIndex = 1;
  }

  configurePalletComponent(): void {
    if (this.palletControlComponent) {
      this.palletControlComponent.configureComponent();
    }
  }

  invoiceUploaded(): void {
    this.configurePalletComponent();
    this.stepperService.setStepStatus(1, STATUSES.completed, true);
  }

  onStepChange(event: StepperSelectionEvent): void {
    console.log('📍 Step değişti:', {
      previousIndex: event.previouslySelectedIndex,
      selectedIndex: event.selectedIndex
    });

    this.selectedIndex = event.selectedIndex;
  }

  /**
   * ✅ Debug ve utility metodlar
   */
  logStorageInfo(): void {
    const info = this.localStorageService.getStorageInfo();
    console.log('📊 Storage Info:', info);
    this.stepperService.logStatus();
  }

  // Manuel olarak storage'ı temizleme (development için)
  clearDraftData(): void {
    if (confirm('Draft verilerini silmek istediğinizden emin misiniz?')) {
      this.localStorageService.clearStorage();
      this.stepperService.resetStepper();
      console.log('🗑️ Draft veriler temizlendi');
    }
  }
}

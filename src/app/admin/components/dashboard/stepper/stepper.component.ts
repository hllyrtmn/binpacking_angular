// ==========================================
// FIXED: SOLID Stepper Component with Providers
// ==========================================

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
import { StepperSelectionEvent } from '@angular/cdk/stepper';

// Components
import { InvoiceUploadComponent } from './components/invoice-upload/invoice-upload.component';
import { PalletControlComponent } from './components/pallet-control/pallet-control.component';
import { LoadingComponent } from "../../../../components/loading/loading.component";
import { ResultStepComponent } from './components/result-step/result-step.component';

// SOLID Dependencies
import {
  IStepValidator, IStorageManager, IActivityTracker, IErrorHandler,
  IStepManager, INotificationService, IStepperConfig, IStepChangeEvent,
  ComponentType, STEPPER_CONFIG, StepStatus,
  STEP_VALIDATOR_TOKEN, STORAGE_MANAGER_TOKEN, ACTIVITY_TRACKER_TOKEN,
  ERROR_HANDLER_TOKEN, STEP_MANAGER_TOKEN, NOTIFICATION_SERVICE_TOKEN,
  isResettableComponent, isConfigurableComponent
} from './interfaces/stepper.interface';

import {
  StepValidationHandler, StorageHandler, ActivityTrackingHandler,
  ErrorHandler, ComponentManager, ServiceHealthChecker
} from './handlers/stepper.handlers';

// Legacy services (akan modernize edilecek)
import { StepperStore, STATUSES } from './services/stepper.store';
import { LocalStorageService } from './services/local-storage.service';
import { ToastService } from '../../../../services/toast.service';

/**
 * ✅ SOLID Principles Applied:
 * - SRP: Component sadece UI koordinasyonu yapar
 * - OCP: Yeni özellikler handler'lar üzerinden eklenir
 * - LSP: Interface'ler doğru implement edilir
 * - ISP: Küçük, spesifik interface'ler kullanılır
 * - DIP: Abstract interface'lere bağımlıdır, concrete class'lara değil
 */
@Component({
  selector: 'app-stepper',
  imports: [
    MatStepperModule, FormsModule, LoadingComponent, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, AsyncPipe,
    InvoiceUploadComponent, PalletControlComponent, LoadingComponent,
    ResultStepComponent
  ],
  providers: [
    // ✅ FIXED: Injection Token Providers
    { provide: STEP_VALIDATOR_TOKEN, useClass: StepValidationHandler },
    { provide: STORAGE_MANAGER_TOKEN, useClass: StorageHandler },
    { provide: ACTIVITY_TRACKER_TOKEN, useClass: ActivityTrackingHandler },
    { provide: ERROR_HANDLER_TOKEN, useClass: ErrorHandler },

    // ✅ Legacy Service Providers (geçici - modernize edilecek)
    { provide: STEP_MANAGER_TOKEN, useExisting: StepperStore },
    { provide: NOTIFICATION_SERVICE_TOKEN, useExisting: ToastService },
    { provide: 'LocalStorageService', useExisting: LocalStorageService },

    // ✅ Configuration Provider
    {
      provide: 'StepperConfig',
      useValue: {
        enableActivityTracking: true,
        activityRefreshInterval: STEPPER_CONFIG.DEFAULT_ACTIVITY_INTERVAL,
        enableAutoSave: true,
        enableLinearMode: true
      } as IStepperConfig
    },

    // ✅ Other Handlers
    ComponentManager,
    ServiceHealthChecker
  ],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss'
})
export class StepperComponent implements OnInit, OnDestroy {

  // ✅ View References (UI katmanı)
  @ViewChild('stepper') stepper!: MatStepper;
  @ViewChild('invoiceUploadComponent') invoiceUploadComponent!: InvoiceUploadComponent;
  @ViewChild('palletControlComponent') palletControlComponent!: PalletControlComponent;
  @ViewChild('resultStepComponent') resultStepComponent!: ResultStepComponent;

  // ✅ FIXED: Dependency Injection with Tokens (DIP uygulanıyor)
  private readonly stepValidator = inject(STEP_VALIDATOR_TOKEN);
  private readonly storageManager = inject(STORAGE_MANAGER_TOKEN);
  private readonly activityTracker = inject(ACTIVITY_TRACKER_TOKEN);
  private readonly errorHandler = inject(ERROR_HANDLER_TOKEN);
  private readonly componentManager = inject(ComponentManager);
  private readonly serviceHealthChecker = inject(ServiceHealthChecker);

  // Legacy services (geçici - modernize edilecek)
  private readonly legacyStepperService = inject(StepperStore);
  private readonly legacyLocalStorage = inject(LocalStorageService);
  private readonly legacyToastService = inject(ToastService);

  // ✅ Component State (SRP - sadece UI state)
  public selectedIndex: number = 0;
  public order_id: string = '';
  public stepperOrientation: Observable<StepperOrientation>;

  // ✅ Lifecycle Management
  private readonly destroy$ = new Subject<void>();

  // ✅ Configuration (Injection token olarak gelecek)
  private readonly config: IStepperConfig = {
    enableActivityTracking: true,
    activityRefreshInterval: STEPPER_CONFIG.DEFAULT_ACTIVITY_INTERVAL,
    enableAutoSave: true,
    enableLinearMode: true
  };

  constructor() {
    const breakpointObserver = inject(BreakpointObserver);

    // ✅ Responsive orientation setup
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(
        map(({ matches }) => matches ? 'horizontal' : 'vertical'),
        takeUntil(this.destroy$)
      );
  }

  // ==========================================
  // ✅ LIFECYCLE HOOKS (Clean & SOLID)
  // ==========================================

  async ngOnInit(): Promise<void> {
    console.log('🚀 SOLID Stepper component initializing...');

    try {
      await this.initializeComponent();
      console.log('✅ SOLID Stepper component ready');
    } catch (error) {
      this.errorHandler.handleErrors(error, 'ngOnInit');
      this.errorHandler.handleInitializationError();
    }
  }

  ngOnDestroy(): void {
    console.log('🔄 SOLID Stepper component cleaning up...');

    try {
      this.cleanupComponent();
      console.log('✅ SOLID Stepper component cleaned up');
    } catch (error) {
      this.errorHandler.handleErrors(error, 'ngOnDestroy');
    }
  }

  // ==========================================
  // ✅ INITIALIZATION (DIP + SRP)
  // ==========================================

  private async initializeComponent(): Promise<void> {
    // Step 1: Health check all services
    if (!this.performHealthCheck()) {
      throw new Error('Service health check failed');
    }

    // Step 2: Register components (after ViewInit)
    setTimeout(() => this.registerComponents(), 100);

    // Step 3: Initialize from storage
    await this.initializeFromStorage();

    // Step 4: Start activity tracking
    if (this.config.enableActivityTracking) {
      this.activityTracker.startTracking();
    }
  }

  private performHealthCheck(): boolean {
    const services = [
      { name: 'StepperStore', service: this.legacyStepperService },
      { name: 'LocalStorageService', service: this.legacyLocalStorage },
      { name: 'ToastService', service: this.legacyToastService }
    ];

    return this.serviceHealthChecker.checkAllServices(services);
  }

  // ✅ FIXED: Güvenli component registration
  private registerComponents(): void {
    try {
      if (this.invoiceUploadComponent) {
        this.componentManager.registerComponent(ComponentType.INVOICE_UPLOAD, this.invoiceUploadComponent);
      }
      if (this.palletControlComponent) {
        this.componentManager.registerComponent(ComponentType.PALLET_CONTROL, this.palletControlComponent);
      }
      if (this.resultStepComponent) {
        this.componentManager.registerComponent(ComponentType.RESULT_STEP, this.resultStepComponent);
      }
    } catch (error) {
      this.errorHandler.handleErrors(error, 'registerComponents');
    }
  }

  private async initializeFromStorage(): Promise<void> {
    try {
      if (!this.storageManager.hasExistingData()) {
        return;
      }

      const storageInfo = this.storageManager.getStorageInfo();
      console.log('📂 Existing data found:', storageInfo);

      if (storageInfo.isExpiringSoon) {
        this.showExpirationWarning();
      }

      await this.restoreStepStates();
      this.navigateToCurrentStep();

    } catch (error) {
      this.errorHandler.handleErrors(error, 'initializeFromStorage');
    }
  }

  private async restoreStepStates(): Promise<void> {
    const currentStep = this.storageManager.getCurrentStep();

    for (let i = 1; i <= Math.min(currentStep + 1, STEPPER_CONFIG.MAX_STEPS); i++) {
      if (this.storageManager.isStepCompleted(i)) {
        // Legacy service call - akan modernize edilecek
        if (this.legacyStepperService?.setStepStatus) {
          this.legacyStepperService.setStepStatus(i, STATUSES.completed, true);
        }
      }
    }
  }

  private navigateToCurrentStep(): void {
    const currentStep = this.storageManager.getCurrentStep();

    if (this.stepper && currentStep > 1) {
      setTimeout(() => {
        try {
          this.stepper.selectedIndex = currentStep - 1;
          this.selectedIndex = currentStep - 1;
        } catch (error) {
          this.errorHandler.handleErrors(error, 'navigateToCurrentStep');
        }
      }, STEPPER_CONFIG.NAVIGATION_DELAY);
    }
  }

  // ==========================================
  // ✅ STEP VALIDATION (Delegated to Handler)
  // ==========================================

  getStepCompleted(stepIndex: number): boolean {
    return this.stepValidator.isCompleted(stepIndex);
  }

  getStepEditable(stepIndex: number): boolean {
    return this.stepValidator.isEditable(stepIndex);
  }

  getStepDirty(stepIndex: number): boolean {
    return this.stepValidator.isDirty(stepIndex);
  }

  // ==========================================
  // ✅ EVENT HANDLERS (SRP - UI Events Only)
  // ==========================================

  onStepChange(event: StepperSelectionEvent): void {
    const stepChangeEvent: IStepChangeEvent = {
      previousIndex: event.previouslySelectedIndex,
      selectedIndex: event.selectedIndex,
      timestamp: new Date()
    };

    console.log('📍 Step changed:', stepChangeEvent);
    this.selectedIndex = event.selectedIndex;
  }

  orderIdComeOn(id: string): void {
    this.order_id = id;
    console.log('📋 Order ID received:', this.order_id);
    this.selectedIndex = 1;
  }

  invoiceUploaded(): void {
    this.configurePalletComponent();

    // Legacy service call - akan modernize edilecek
    if (this.legacyStepperService?.setStepStatus) {
      this.legacyStepperService.setStepStatus(1, STATUSES.completed, true);
    }
  }

  onShipmentCompleted(): void {
    console.log('🔄 Shipment completed, starting full reset...');

    try {
      this.performFullReset();
      console.log('✅ Full reset completed');
    } catch (error) {
      this.errorHandler.handleErrors(error, 'onShipmentCompleted');
      this.handleResetFailure();
    }
  }

  // ==========================================
  // ✅ COMPONENT OPERATIONS (Delegated)
  // ==========================================

  private configurePalletComponent(): void {
    this.componentManager.configureComponent(ComponentType.PALLET_CONTROL);
  }

  private performFullReset(): void {
    // Step 1: Reset all components
    this.componentManager.resetAllComponents();

    // Step 2: Clear storage
    this.storageManager.clearStorage();

    // Step 3: Reset stepper service
    if (this.legacyStepperService?.resetStepper) {
      this.legacyStepperService.resetStepper();
    }

    // Step 4: Reset navigation
    this.resetStepperNavigation();

    // Step 5: Reset component state
    this.order_id = '';
  }

  private resetStepperNavigation(): void {
    if (!this.stepper) return;

    // Temporarily disable linear mode
    this.stepper.linear = false;

    // Navigate to first step
    this.stepper.selectedIndex = 0;
    this.selectedIndex = 0;

    // Re-enable linear mode after delay
    setTimeout(() => {
      if (this.stepper && this.config.enableLinearMode) {
        this.stepper.linear = true;
      }
    }, STEPPER_CONFIG.RESET_DELAY);
  }

  private handleResetFailure(): void {
    if (this.legacyToastService?.error) {
      this.legacyToastService.error('Reset sırasında hata oluştu. Sayfa yeniden yüklenecek.');
    }

    setTimeout(() => {
      window.location.reload();
    }, STEPPER_CONFIG.RELOAD_DELAY);
  }

  // ==========================================
  // ✅ UTILITY METHODS (Clean & Simple)
  // ==========================================

  private showExpirationWarning(): void {
    if (this.legacyToastService?.warning) {
      this.legacyToastService.warning(
        'Kaydedilmiş verileriniz yakında silinecek. Lütfen işleminizi tamamlayın.'
      );
    }
  }

  private cleanupComponent(): void {
    // Stop activity tracking
    this.activityTracker.stopTracking();

    // Complete RxJS subjects
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================================
  // ✅ DEBUG METHODS (Development Only)
  // ==========================================

  debugStepperState(): void {
    try {
      console.log('🐛 === SOLID STEPPER DEBUG ===');
      console.log('Services available:', {
        stepValidator: !!this.stepValidator,
        storageManager: !!this.storageManager,
        activityTracker: !!this.activityTracker,
        errorHandler: !!this.errorHandler,
        componentManager: !!this.componentManager
      });

      console.log('Storage info:', this.storageManager.getStorageInfo());

      for (let i = 0; i < STEPPER_CONFIG.MAX_STEPS; i++) {
        console.log(`Step ${i + 1}:`, {
          completed: this.getStepCompleted(i),
          editable: this.getStepEditable(i),
          dirty: this.getStepDirty(i)
        });
      }

      console.log('=== END SOLID DEBUG ===');
    } catch (error) {
      this.errorHandler.handleErrors(error, 'debugStepperState');
    }
  }

  logStorageInfo(): void {
    const info = this.storageManager.getStorageInfo();
    console.log('📊 Storage Info:', info);

    if (this.legacyStepperService?.logStatus) {
      this.legacyStepperService.logStatus();
    }
  }

  clearDraftData(): void {
    if (confirm('Draft verilerini silmek istediğinizden emin misiniz?')) {
      this.storageManager.clearStorage();

      if (this.legacyStepperService?.resetStepper) {
        this.legacyStepperService.resetStepper();
      }

      console.log('🗑️ Draft data cleared');
    }
  }
}

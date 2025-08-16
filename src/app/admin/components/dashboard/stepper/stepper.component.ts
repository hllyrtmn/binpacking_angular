// ==========================================
// FIXED: SOLID Stepper Component with Providers
// ==========================================

import { Component, inject, ViewChild, OnDestroy, OnInit, effect, AfterViewInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { StepperOrientation, MatStepperModule, MatStepper } from '@angular/material/stepper';
import { Observable, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
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

import { Store } from '@ngrx/store';
import { AppState } from '../../../../store';
import * as StepperActions from '../../../../store/stepper/stepper.actions';
import * as StepperSelectors from '../../../../store/stepper/stepper.selectors';

// SOLID Dependencies
import {IStepperConfig,
  ComponentType, STEPPER_CONFIG,
  STEP_VALIDATOR_TOKEN, STORAGE_MANAGER_TOKEN, ACTIVITY_TRACKER_TOKEN,
  ERROR_HANDLER_TOKEN, STEP_MANAGER_TOKEN, NOTIFICATION_SERVICE_TOKEN
} from './interfaces/stepper.interface';

import {
  StepValidationHandler, StorageHandler, ActivityTrackingHandler,
  ErrorHandler, ComponentManager, ServiceHealthChecker
} from './handlers/stepper.handlers';

// Legacy services (akan modernize edilecek)
import { StepperStore, STATUSES } from './services/stepper.store';
import { LocalStorageService } from './services/local-storage.service';
import { ToastService } from '../../../../services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { UIStateManager } from './components/invoice-upload/managers/ui-state.manager';
import { RepositoryService } from './services/repository.service';
import { StateManager } from './services/state-manager.service';
import { OrderService } from '../../services/order.service';
import { OrderDetailManager } from './components/invoice-upload/managers/order-detail.manager';
import { Router } from '@angular/router';

// Constructor'a inject edin:


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
export class StepperComponent implements OnInit, OnDestroy,AfterViewInit {

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

  //Active Route injected
  private readonly route = inject(ActivatedRoute);
  private readonly uiStateManager = inject(UIStateManager)
  private readonly stateManager = inject(StateManager)
  private readonly repositoryService = inject(RepositoryService)
  private readonly orderService = inject(OrderService)
  private readonly orderDetailManager = inject(OrderDetailManager)

  // NgRx Store
  private readonly store = inject(Store<AppState>);

  // NgRx Observables (mevcut properties'lerin yanına ekleyin)
  public currentStep$ = this.store.select(StepperSelectors.selectCurrentStep);
  public isEditMode$ = this.store.select(StepperSelectors.selectIsEditMode);
  public editOrderId$ = this.store.select(StepperSelectors.selectEditOrderId);
  public stepperSummary$ = this.store.select(StepperSelectors.selectStepperSummary);
  private router = inject(Router);

  // ✅ Component State (SRP - sadece UI state)
  public selectedIndex: number = 0;
  public order_id: string = '';
  public stepperOrientation: Observable<StepperOrientation>;

  // ✅ Lifecycle Management
  private readonly destroy$ = new Subject<void>();

  private pendingEditData: { orderId: string; order: any; orderDetails: any[] } | null = null;
  editMode = false;
  editOrderId: string | null = null;

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

  ngAfterViewInit(): void {
    // ViewChild'lar hazır olduktan sonra pending edit data'yı işle
    if (this.pendingEditData) {
      console.log('🔄 ViewChild hazır, pending edit data işleniyor...');
      setTimeout(() => {
        this.loadDataToInvoiceUploadComponent(
          this.pendingEditData!.order,
          this.pendingEditData!.orderDetails
        );
        this.pendingEditData = null;
      }, 100);
    }
  }
  // ==========================================
  // ✅ LIFECYCLE HOOKS (Clean & SOLID)
  // ==========================================

  async ngOnInit(): Promise<void> {
    try {
      // NgRx state dinleme
      this.currentStep$.subscribe(step => {
        this.selectedIndex = step;
        console.log('🎯 NgRx Current Step:', step);
      });

      // Query params'ları hemen dinle (timeout olmadan)
      this.route.queryParams.subscribe(async (params) => {
        console.log('🔍 Route Query Params:', params);

        const editOrderId = params['orderId'];
        const editMode = params['mode'] === 'edit';

        if (editMode && editOrderId) {
          console.log('🔄 Edit mode detect edildi:', editOrderId);
          this.store.dispatch(StepperActions.enableEditMode({ orderId: editOrderId }));
          await this.loadOrderForEdit(editOrderId);
        } else {
          console.log('🆕 Normal mode');
          this.store.dispatch(StepperActions.initializeStepper({}));
          await this.initializeComponent();
        }
      });

    } catch (error) {
      this.errorHandler.handleErrors(error, 'ngOnInit');
    }
  }

  private async loadOrderForEdit(orderId: string): Promise<void> {
    try {
      // Loading durumunu göster
      this.uiStateManager.setLoading(true);

      // RepositoryService'i kullanarak order verilerini çek
      this.repositoryService.setOrderId(orderId);

      // Order details'i çek
      const orderDetailsResponse = await this.repositoryService.orderDetailsOriginal(orderId).toPromise();
      this.orderDetailManager.setOrderDetails(orderDetailsResponse)

      if (orderDetailsResponse && orderDetailsResponse.length > 0) {
        // İlk order detail'den order bilgisini al
        const order = await this.orderService.getById(orderId).toPromise()
        if (order) {

          // Order ve OrderDetails'i InvoiceUpload component'e aktar
          this.loadDataToInvoiceUploadComponent(order, orderDetailsResponse);


          this.syncEditModeDataToNgRx(orderId);

          // Step 1'i completed olarak işaretle
          this.legacyStepperService?.setStepStatus(1, STATUSES.completed, true);

          // Stepper'ı Step 2'ye yönlendir (edit mode'da kullanıcı istediği step'e gidebilsin)
          setTimeout(() => {
            this.selectedIndex = 1;
          }, 500);
        }
      }

    } catch (error) {
      this.legacyToastService?.error('Order verileri yüklenirken hata oluştu');
    } finally {
      this.uiStateManager.setLoading(false);
    }
  }

// Bu helper metodu ekleyin:
  private loadDataToInvoiceUploadComponent(order: any, orderDetails: any[]): void {
    console.log('📤 StateManager\'a data yükleniyor:', { order, orderDetails });

    // ViewChild check - eğer component henüz hazır değilse pending'e al
    if (!this.invoiceUploadComponent) {
      console.log('⏳ InvoiceUpload component henüz hazır değil, pending...');
      this.pendingEditData = { orderId: order.id, order, orderDetails };
      return;
    }

    // StateManager'a verileri yükle
    this.stateManager.initializeStep1(order, orderDetails, false, 'Mevcut Order');

    console.log('✅ StateManager Step 1 initialize tamamlandı');

    // Change detection'ı manual trigger et
    setTimeout(() => {
      console.log('🔄 Change detection trigger...');
      if (this.invoiceUploadComponent) {
        // InvoiceUpload component'inin restoreFromSession metodunu manuel çağır
        (this.invoiceUploadComponent as any).restoreFromSession?.();
        console.log('🔄 InvoiceUpload restoreFromSession çağrıldı');
      }
    }, 200);
  }

  ngOnDestroy(): void {
    try {
      this.cleanupComponent();

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
    // NgRx'den veri al
    let isCompleted = false;
    this.store.select(StepperSelectors.selectIsStepCompleted(stepIndex))
      .pipe(take(1))
      .subscribe(completed => isCompleted = completed);

    // Fallback: mevcut legacy logic
    return isCompleted || this.stepValidator.isCompleted(stepIndex);
  }

  getStepEditable(stepIndex: number): boolean {
    // NgRx'den edit mode kontrol et
    let isEditMode = false;
    this.store.select(StepperSelectors.selectIsEditMode)
      .pipe(take(1))
      .subscribe(editMode => isEditMode = editMode);

    // Edit mode'daysa tüm step'ler editable
    if (isEditMode) return true;

    // Fallback: mevcut legacy logic
    return this.stepValidator.isEditable(stepIndex);
  }

  getStepDirty(stepIndex: number): boolean {
    return this.stepValidator.isDirty(stepIndex);
  }

  private syncEditModeDataToNgRx(orderId: string): void {
    console.log('🔄 Edit mode: One-time sync to NgRx');

    // StateManager'dan mevcut verileri al ve NgRx'e aktar
    const step1State = this.stateManager.step1.state();
    const order = this.stateManager.step1.order();

    if (step1State.current.length > 0 && order) {
      this.store.dispatch(StepperActions.setStepData({
        stepNumber: 0,
        data: {
          order: order,
          orderDetails: step1State.current,
          hasFile: this.stateManager.step1.hasFile(),
          fileName: this.stateManager.step1.fileName()
        }
      }));
      this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 0, isValid: true }));
    }
  }

  // ==========================================
  // ✅ EVENT HANDLERS (SRP - UI Events Only)
  // ==========================================

  onStepChange(event: StepperSelectionEvent): void {
    const previousStep = event.previouslySelectedIndex;
    const currentStep = event.selectedIndex;

    console.log('🔄 Step Navigation:', previousStep, '→', currentStep);

    // NgRx'e step değişikliğini bildir
    this.store.dispatch(StepperActions.navigateToStep({ stepIndex: currentStep }));

    // Önceki step'i completed olarak işaretle (eğer ileri gidiyorsa)
    if (previousStep < currentStep && previousStep >= 0) {
      this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: previousStep }));
    }

  }



  private async loadPackageDataForStep2(): Promise<void> {
    console.log('🔍 loadPackageDataForStep2 çağrıldı');

    this.route.queryParams.pipe(take(1)).subscribe(async (params) => {
      const editMode = params['mode'] === 'edit';
      const orderId = params['orderId'];

      console.log('🔍 Step 2 params:', { editMode, orderId });

      if (editMode && orderId) {
        console.log('🔄 Step 2 için paket verileri yükleniyor...');

        try {
          // Package detail verilerini çek
          const packageResponse = await this.repositoryService.calculatePackageDetail(orderId).toPromise();

          console.log('📦 Package response:', packageResponse);

          if (packageResponse?.packages) {
            console.log('✅ Paket verileri alındı, StateManager\'a yükleniyor...');

            // StateManager'a Step 2 verilerini yükle
            this.stateManager.initializeStep2(packageResponse.packages);

            console.log('✅ Step 2 StateManager güncellendi');

            // PalletControl component'inin data'yı alması için trigger
            setTimeout(() => {
              if (this.palletControlComponent) {
                console.log('🔄 PalletControl component\'ine data aktarımı...');
                // PalletControl'un restoreFromSession metodunu çağır
                (this.palletControlComponent as any).restoreFromSession?.();
              } else {
                console.log('⚠️ PalletControl component henüz hazır değil');
              }
            }, 300);
          }

        } catch (error) {
          console.error('❌ Step 2 paket yükleme hatası:', error);
        }
      }
    });
  }

  invoiceUploaded(): void {
    this.configurePalletComponent();

    // NgRx'e Step 1'in tamamlandığını bildir
    this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 0 }));
    this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 0, isValid: true }));

    // Legacy service call
    if (this.legacyStepperService?.setStepStatus) {
      this.legacyStepperService.setStepStatus(1, STATUSES.completed, true);
    }

    console.log('🔄 invoiceUploaded - Step 2 data loading başlatılıyor...');

    // Edit mode'daysa Step 2 için paket verilerini yükle
    this.loadPackageDataForStep2();
  }

  configureEditModeInPalletComponent(): void{
    this.loadPackageDataForStep2();
  }

  onPalletControlCompleted(): void {
    // Step 2'yi completed olarak işaretle
    if (this.legacyStepperService?.setStepStatus) {
      this.legacyStepperService.setStepStatus(2, STATUSES.completed, true);
    }
  }


  onShipmentCompleted(): void {
    console.log('🔄 Shipment completed, performing full reset...');

    try {
      // 1. NgRx reset
      this.store.dispatch(StepperActions.resetStepper());

      // 2. Component reset
      this.performFullReset();

      // 3. URL temizle
      this.router.navigate(['/'], {
        replaceUrl: true,
        queryParams: {}
      });

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

  clearDraftData(): void {
    if (confirm('Draft verilerini silmek istediğinizden emin misiniz?')) {
      this.storageManager.clearStorage();

      if (this.legacyStepperService?.resetStepper) {
        this.legacyStepperService.resetStepper();
      }


    }
  }

  public resetStepper(): void {
    console.log('🔄 NgRx Stepper Reset');
    this.store.dispatch(StepperActions.resetStepper());

    // Legacy reset de çalıştır
    if (this.legacyStepperService?.resetStepper) {
      this.legacyStepperService.resetStepper();
    }
  }
}

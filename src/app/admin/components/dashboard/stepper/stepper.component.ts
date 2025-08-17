import {
  Component, inject, ViewChild, OnDestroy, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { StepperOrientation, MatStepperModule, MatStepper } from '@angular/material/stepper';
import { Observable, Subject, combineLatest } from 'rxjs';
import { map, take, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AsyncPipe, CommonModule } from '@angular/common';
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

// Legacy services
import { StepperStore, STATUSES } from './services/stepper.store';
import { LocalStorageService } from './services/local-storage.service';
import { ToastService } from '../../../../services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UIStateManager } from './components/invoice-upload/managers/ui-state.manager';
import { RepositoryService } from './services/repository.service';
import { StateManager } from './services/state-manager.service';
import { OrderService } from '../../services/order.service';
import { OrderDetailManager } from './components/invoice-upload/managers/order-detail.manager';

@Component({
  selector: 'app-stepper',
  imports: [
    MatStepperModule, FormsModule, LoadingComponent, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, AsyncPipe,
    InvoiceUploadComponent, PalletControlComponent, LoadingComponent,
    ResultStepComponent,CommonModule
  ],
  providers: [
    // Existing providers...
    { provide: STEP_VALIDATOR_TOKEN, useClass: StepValidationHandler },
    { provide: STORAGE_MANAGER_TOKEN, useClass: StorageHandler },
    { provide: ACTIVITY_TRACKER_TOKEN, useClass: ActivityTrackingHandler },
    { provide: ERROR_HANDLER_TOKEN, useClass: ErrorHandler },
    { provide: STEP_MANAGER_TOKEN, useExisting: StepperStore },
    { provide: NOTIFICATION_SERVICE_TOKEN, useExisting: ToastService },
    { provide: 'LocalStorageService', useExisting: LocalStorageService },
    {
      provide: 'StepperConfig',
      useValue: {
        enableActivityTracking: true,
        activityRefreshInterval: STEPPER_CONFIG.DEFAULT_ACTIVITY_INTERVAL,
        enableAutoSave: true,
        enableLinearMode: true
      } as IStepperConfig
    },
    ComponentManager,
    ServiceHealthChecker
  ],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
  // ✅ PERFORMANCE: OnPush Change Detection
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepperComponent implements OnInit, OnDestroy, AfterViewInit {

  // View References
  @ViewChild('stepper') stepper!: MatStepper;
  @ViewChild('invoiceUploadComponent') invoiceUploadComponent!: InvoiceUploadComponent;
  @ViewChild('palletControlComponent') palletControlComponent!: PalletControlComponent;
  @ViewChild('resultStepComponent') resultStepComponent!: ResultStepComponent;

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly stepValidator = inject(STEP_VALIDATOR_TOKEN);
  private readonly storageManager = inject(STORAGE_MANAGER_TOKEN);
  private readonly activityTracker = inject(ACTIVITY_TRACKER_TOKEN);
  private readonly errorHandler = inject(ERROR_HANDLER_TOKEN);
  private readonly componentManager = inject(ComponentManager);
  private readonly serviceHealthChecker = inject(ServiceHealthChecker);

  private readonly legacyStepperService = inject(StepperStore);
  private readonly legacyLocalStorage = inject(LocalStorageService);
  private readonly legacyToastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly uiStateManager = inject(UIStateManager);
  private readonly stateManager = inject(StateManager);
  private readonly repositoryService = inject(RepositoryService);
  private readonly orderService = inject(OrderService);
  private readonly orderDetailManager = inject(OrderDetailManager);
  private readonly store = inject(Store<AppState>);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();
  private pendingEditData: { orderId: string; order: any; orderDetails: any[] } | null = null;

  public readonly currentStep$ = this.store.select(StepperSelectors.selectCurrentStep)
    .pipe(
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

  public readonly isEditMode$ = this.store.select(StepperSelectors.selectIsEditMode)
    .pipe(
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

  public readonly editOrderId$ = this.store.select(StepperSelectors.selectEditOrderId)
    .pipe(
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

  public readonly stepperSummary$ = this.store.select(StepperSelectors.selectStepperSummary)
    .pipe(
      distinctUntilChanged((prev, curr) =>
        prev.currentStep === curr.currentStep &&
        prev.completedSteps.length === curr.completedSteps.length &&
        prev.isEditMode === curr.isEditMode
      ),
      takeUntil(this.destroy$)
    );

  public readonly vm$ = combineLatest({
    currentStep: this.currentStep$,
    isEditMode: this.isEditMode$,
    editOrderId: this.editOrderId$,
    stepperSummary: this.stepperSummary$
  }).pipe(
    takeUntil(this.destroy$)
  );

  public selectedIndex: number = 0;
  public order_id: string = '';
  public stepperOrientation: Observable<StepperOrientation>;

  private stepCompletedCache = new Map<number, boolean>();
  private stepEditableCache = new Map<number, boolean>();

  private readonly config: IStepperConfig = {
    enableActivityTracking: true,
    activityRefreshInterval: STEPPER_CONFIG.DEFAULT_ACTIVITY_INTERVAL,
    enableAutoSave: true,
    enableLinearMode: true
  };

  constructor() {
    const breakpointObserver = inject(BreakpointObserver);

    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(
        map(({ matches }) => matches ? 'horizontal' : 'vertical'),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      );

    this.setupOptimizedChangeDetection();
  }

  private setupOptimizedChangeDetection(): void {
    this.currentStep$.subscribe(() => {
      this.clearStepCaches();
      this.cdr.markForCheck();
    });

    this.isEditMode$.subscribe(() => {
      this.clearStepCaches();
      this.cdr.markForCheck();
    });

    this.store.select(StepperSelectors.selectAutoSaveSummary)
      .pipe(
        distinctUntilChanged((prev, curr) =>
          prev.isAnySaving === curr.isAnySaving &&
          prev.hasErrors === curr.hasErrors
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        setTimeout(() => this.cdr.markForCheck(), 100);
      });
  }

  private clearStepCaches(): void {
    this.stepCompletedCache.clear();
    this.stepEditableCache.clear();
  }

  getStepCompleted(stepIndex: number): boolean {
    if (this.stepCompletedCache.has(stepIndex)) {
      return this.stepCompletedCache.get(stepIndex)!;
    }

    let isCompleted = false;
    this.store.select(StepperSelectors.selectIsStepCompleted(stepIndex))
      .pipe(take(1))
      .subscribe(completed => isCompleted = completed);

    const result = isCompleted || this.stepValidator.isCompleted(stepIndex);

    this.stepCompletedCache.set(stepIndex, result);
    return result;
  }

  getStepEditable(stepIndex: number): boolean {
    if (this.stepEditableCache.has(stepIndex)) {
      return this.stepEditableCache.get(stepIndex)!;
    }

    let isEditMode = false;
    this.store.select(StepperSelectors.selectIsEditMode)
      .pipe(take(1))
      .subscribe(editMode => isEditMode = editMode);

    if (isEditMode) {
      this.stepEditableCache.set(stepIndex, true);
      return true;
    }

    const result = this.stepValidator.isEditable(stepIndex);
    this.stepEditableCache.set(stepIndex, result);
    return result;
  }

  onStepChange = (event: StepperSelectionEvent): void => {
    const previousStep = event.previouslySelectedIndex;
    const currentStep = event.selectedIndex;

    console.log('🔄 Step Navigation:', previousStep, '→', currentStep);

    this.clearStepCaches();

    this.store.dispatch(StepperActions.navigateToStep({ stepIndex: currentStep }));

    if (previousStep < currentStep && previousStep >= 0) {
      this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: previousStep }));
    }

    this.cdr.markForCheck();
  };

  invoiceUploaded = (): void => {
    this.configurePalletComponent();

    this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 0 }));
    this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 0, isValid: true }));

    if (this.legacyStepperService?.setStepStatus) {
      this.legacyStepperService.setStepStatus(1, STATUSES.completed, true);
    }

    console.log('🔄 invoiceUploaded - Step 2 data loading başlatılıyor...');

    this.loadPackageDataForStep2();

    this.cdr.markForCheck();
  };

  configureEditModeInPalletComponent = (): void => {
    this.loadPackageDataForStep2();
    this.cdr.markForCheck();
  };

  onPalletControlCompleted = (): void => {
    if (this.legacyStepperService?.setStepStatus) {
      this.legacyStepperService.setStepStatus(2, STATUSES.completed, true);
    }
    this.cdr.markForCheck();
  };

  onShipmentCompleted = (): void => {
    console.log('🔄 Shipment completed, performing full reset...');

    try {
      this.store.dispatch(StepperActions.resetStepper());

      this.performFullReset();

      this.router.navigate(['/'], {
        replaceUrl: true,
        queryParams: {}
      });

      console.log('✅ Full reset completed');

    } catch (error) {
      this.errorHandler.handleErrors(error, 'onShipmentCompleted');
      this.handleResetFailure();
    }
  };

  clearDraftData = (): void => {
    if (confirm('Draft verilerini silmek istediğinizden emin misiniz?')) {
      this.storageManager.clearStorage();

      if (this.legacyStepperService?.resetStepper) {
        this.legacyStepperService.resetStepper();
      }

      this.cdr.markForCheck();
    }
  };

  resetStepper = (): void => {
    console.log('🔄 NgRx Stepper Reset');
    this.store.dispatch(StepperActions.resetStepper());

    if (this.legacyStepperService?.resetStepper) {
      this.legacyStepperService.resetStepper();
    }

    this.clearStepCaches();
    this.cdr.markForCheck();
  };

  ngOnInit(): Promise<void> {
    return this.initializeComponentOptimized();
  }

  ngAfterViewInit(): void {
    if (this.pendingEditData) {
      console.log('🔄 ViewChild hazır, pending edit data işleniyor...');
      setTimeout(() => {
        this.loadDataToInvoiceUploadComponent(
          this.pendingEditData!.order,
          this.pendingEditData!.orderDetails
        );
        this.pendingEditData = null;
        this.cdr.markForCheck();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    try {
      this.cleanupComponent();
    } catch (error) {
      this.errorHandler.handleErrors(error, 'ngOnDestroy');
    }
  }

  private async initializeComponentOptimized(): Promise<void> {
    try {
      this.currentStep$.subscribe(step => {
        this.selectedIndex = step;
        console.log('🎯 NgRx Current Step:', step);
        this.cdr.markForCheck();
      });

      this.route.queryParams.pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(async (params) => {
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

        this.cdr.markForCheck();
      });

    } catch (error) {
      this.errorHandler.handleErrors(error, 'ngOnInit');
    }
  }

  private async loadOrderForEdit(orderId: string): Promise<void> {
    try {
      this.uiStateManager.setLoading(true);
      this.cdr.markForCheck();

      this.repositoryService.setOrderId(orderId);
      const orderDetailsResponse = await this.repositoryService.orderDetailsOriginal(orderId).toPromise();
      this.orderDetailManager.setOrderDetails(orderDetailsResponse);

      if (orderDetailsResponse && orderDetailsResponse.length > 0) {
        const order = await this.orderService.getById(orderId).toPromise();
        if (order) {
          this.loadDataToInvoiceUploadComponent(order, orderDetailsResponse);
          this.syncEditModeDataToNgRx(orderId);
          this.legacyStepperService?.setStepStatus(1, STATUSES.completed, true);

          setTimeout(() => {
            this.selectedIndex = 1;
            this.cdr.markForCheck();
          }, 500);
        }
      }

    } catch (error) {
      this.legacyToastService?.error('Order verileri yüklenirken hata oluştu');
    } finally {
      this.uiStateManager.setLoading(false);
      this.cdr.markForCheck();
    }
  }

  private cleanupComponent(): void {
    this.activityTracker.stopTracking();
    this.destroy$.next();
    this.destroy$.complete();

    this.clearStepCaches();
  }

  private loadDataToInvoiceUploadComponent(order: any, orderDetails: any[]): void {
    console.log('📤 StateManager\'a data yükleniyor:', { order, orderDetails });

    this.store.dispatch(StepperActions.initializeStep1State({
      order: order,
      orderDetails: orderDetails,
      hasFile: false,
      fileName: 'Edit Mode Data'
    }));

    if (!this.invoiceUploadComponent) {
      console.log('⏳ InvoiceUpload component henüz hazır değil, pending...');
      this.pendingEditData = { orderId: order.id, order, orderDetails };
      return;
    }

    this.stateManager.initializeStep1(order, orderDetails, false, 'Mevcut Order');
    console.log('✅ StateManager Step 1 initialize tamamlandı');

    setTimeout(() => {
      console.log('🔄 Change detection trigger...');
      if (this.invoiceUploadComponent) {
        (this.invoiceUploadComponent as any).restoreFromSession?.();
        console.log('🔄 InvoiceUpload restoreFromSession çağrıldı');
      }
      this.cdr.markForCheck();
    }, 200);
  }

  private syncEditModeDataToNgRx(orderId: string): void {
    console.log('🔄 Edit mode: Enhanced sync to NgRx');

    const step1State = this.stateManager.step1.state();
    const order = this.stateManager.step1.order();

    if (step1State.current.length > 0 && order) {
      // Enhanced: initializeStep1State kullan (daha güçlü)
      this.store.dispatch(StepperActions.initializeStep1State({
        order: order,
        orderDetails: step1State.current,
        hasFile: this.stateManager.step1.hasFile(),
        fileName: this.stateManager.step1.fileName() || 'Edit Mode'
      }));

      this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 0, isValid: true }));
      this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 0 }));

      console.log('✅ Enhanced NgRx sync completed');
    }
  }

  private async loadPackageDataForStep2(): Promise<void> {
    console.log('🔍 loadPackageDataForStep2 çağrıldı');

    this.route.queryParams.pipe(take(1)).subscribe(async (params) => {
      const editMode = params['mode'] === 'edit';
      const orderId = params['orderId'];

      console.log('🔍 Step 2 params:', { editMode, orderId });
      debugger
      if (editMode && orderId) {
        console.log('🔄 Step 2 için paket verileri yükleniyor...');

        try {
          const packageResponse = await this.repositoryService.calculatePackageDetail().toPromise();
          console.log('📦 Package response:', packageResponse);

          if (packageResponse?.packages) {
            console.log('✅ Paket verileri alındı, StateManager\'a yükleniyor...');
            this.store.dispatch(StepperActions.initializeStep2State({
              packages: packageResponse.packages || [],
              availableProducts: packageResponse.remainingProducts || []
            }));
            this.stateManager.initializeStep2(packageResponse.packages);
            console.log('✅ Step 2 StateManager güncellendi');

            setTimeout(() => {
              if (this.palletControlComponent) {
                console.log('🔄 PalletControl component\'ine data aktarımı...');
                (this.palletControlComponent as any).restoreFromSession?.();
              } else {
                console.log('⚠️ PalletControl component henüz hazır değil');
              }
              this.cdr.markForCheck();
            }, 300);
          }

        } catch (error) {
          console.error('❌ Step 2 paket yükleme hatası:', error);
        }
      }
    });
  }

  private configurePalletComponent(): void {
    this.componentManager.configureComponent(ComponentType.PALLET_CONTROL);
  }

  private performFullReset(): void {
    this.componentManager.resetAllComponents();
    this.storageManager.clearStorage();

    if (this.legacyStepperService?.resetStepper) {
      this.legacyStepperService.resetStepper();
    }

    this.resetStepperNavigation();
    this.order_id = '';
    this.clearStepCaches();
  }

  private resetStepperNavigation(): void {
    if (!this.stepper) return;

    this.stepper.linear = false;
    this.stepper.selectedIndex = 0;
    this.selectedIndex = 0;

    setTimeout(() => {
      if (this.stepper && this.config.enableLinearMode) {
        this.stepper.linear = true;
      }
      this.cdr.markForCheck();
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

  private async initializeComponent(): Promise<void> {
    if (!this.performHealthCheck()) {
      throw new Error('Service health check failed');
    }

    setTimeout(() => this.registerComponents(), 100);
    await this.initializeFromStorage();

    if (this.config.enableActivityTracking) {
      this.activityTracker.startTracking();
    }

    this.cdr.markForCheck();
  }

  private performHealthCheck(): boolean {
    const services = [
      { name: 'StepperStore', service: this.legacyStepperService },
      { name: 'LocalStorageService', service: this.legacyLocalStorage },
      { name: 'ToastService', service: this.legacyToastService }
    ];

    return this.serviceHealthChecker.checkAllServices(services);
  }

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
          this.cdr.markForCheck();
        } catch (error) {
          this.errorHandler.handleErrors(error, 'navigateToCurrentStep');
        }
      }, STEPPER_CONFIG.NAVIGATION_DELAY);
    }
  }

  private showExpirationWarning(): void {
    if (this.legacyToastService?.warning) {
      this.legacyToastService.warning(
        'Kaydedilmiş verileriniz yakında silinecek. Lütfen işleminizi tamamlayın.'
      );
    }
  }

  getStepDirty(stepIndex: number): boolean {
    return this.stepValidator.isDirty(stepIndex);
  }
}

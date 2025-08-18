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

// Legacy services
import { LocalStorageService } from './services/local-storage.service';
import { ToastService } from '../../../../services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UIStateManager } from './components/invoice-upload/managers/ui-state.manager';
import { RepositoryService } from './services/repository.service';
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
  ],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepperComponent implements OnInit, OnDestroy, AfterViewInit {

  // View References
  @ViewChild('stepper') stepper!: MatStepper;
  @ViewChild('invoiceUploadComponent') invoiceUploadComponent!: InvoiceUploadComponent;
  @ViewChild('palletControlComponent') palletControlComponent!: PalletControlComponent;
  @ViewChild('resultStepComponent') resultStepComponent!: ResultStepComponent;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly legacyLocalStorage = inject(LocalStorageService);
  private readonly legacyToastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly uiStateManager = inject(UIStateManager);
  private readonly repositoryService = inject(RepositoryService);
  private readonly orderService = inject(OrderService);
  private readonly orderDetailManager = inject(OrderDetailManager);
  private readonly store = inject(Store<AppState>);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();
  private pendingEditData: { orderId: string; order: any; orderDetails: any[] } | null = null;

  public step0Loading$ = this.store.select(StepperSelectors.selectIsStepLoading(0));
  public step1Loading$ = this.store.select(StepperSelectors.selectIsStepLoading(1));
  public step2Loading$ = this.store.select(StepperSelectors.selectIsStepLoading(2));

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
    const result = isCompleted;
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

    const result = stepIndex === 0;
    this.stepEditableCache.set(stepIndex, result);
    return result;
  }

  onStepChange = (event: StepperSelectionEvent): void => {
    const previousStep = event.previouslySelectedIndex;
    const currentStep = event.selectedIndex;

    this.clearStepCaches();
    this.store.dispatch(StepperActions.navigateToStep({ stepIndex: currentStep }));

    if (previousStep < currentStep && previousStep >= 0) {
      this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: previousStep }));
    }

    this.cdr.markForCheck();
  };

  invoiceUploaded = (): void => {
    this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 0 }));
    this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 0, isValid: true }));
    this.loadPackageDataForStep2().then(() => {
    // Data yüklendikten sonra navigate et
    setTimeout(() => {
      this.selectedIndex = 1;
      if (this.stepper) {
        this.stepper.selectedIndex = 1;
      }
      this.store.dispatch(StepperActions.navigateToStep({ stepIndex: 1 }));
      this.cdr.markForCheck();
    }, 300);
  });
  };

  configureEditModeInPalletComponent = (): void => {
    this.loadPackageDataForStep2();
    this.cdr.markForCheck();
  };

  onPalletControlCompleted = (): void => {
    this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 1 }));
    this.cdr.markForCheck();
  };

  onShipmentCompleted = (): void => {
    try {
      this.store.dispatch(StepperActions.resetStepper());
      this.performFullReset();
      this.router.navigate(['/'], {
        replaceUrl: true,
        queryParams: {}
      });
    } catch (error) {
      this.handleResetFailure();
    }
  };

  clearDraftData = (): void => {
    if (confirm('Draft verilerini silmek istediğinizden emin misiniz?')) {
      this.legacyLocalStorage.clearStorage();
      this.store.dispatch(StepperActions.resetStepper());
      this.cdr.markForCheck();
    }
  };

  resetStepper = (): void => {
    this.store.dispatch(StepperActions.resetStepper());
    this.clearStepCaches();
    this.cdr.markForCheck();
  };

  ngOnInit(): Promise<void> {
    return this.initializeComponentOptimized();
  }

  ngAfterViewInit(): void {
    if (this.pendingEditData) {
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
    }
  }

  private async initializeComponentOptimized(): Promise<void> {
    try {
      this.currentStep$.subscribe(step => {
        this.selectedIndex = step;
        this.cdr.markForCheck();
      });

      this.route.queryParams.pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(async (params) => {
        const editOrderId = params['orderId'];
        const editMode = params['mode'] === 'edit';

        if (editMode && editOrderId) {
          this.store.dispatch(StepperActions.enableEditMode({ orderId: editOrderId }));
          await this.loadOrderForEdit(editOrderId);
        } else {
          this.store.dispatch(StepperActions.initializeStepper({}));
          await this.initializeComponent();
        }
        this.cdr.markForCheck();
      });
    } catch (error) {
    }
  }

  private async loadOrderForEdit(orderId: string): Promise<void> {
    try {
      this.uiStateManager.setLoading(true);
      this.cdr.markForCheck();

      const orderDetailsResponse = await this.repositoryService.orderDetailsOriginal(orderId).toPromise();
      this.orderDetailManager.setOrderDetails(orderDetailsResponse);

      if (orderDetailsResponse && orderDetailsResponse.length > 0) {
        const order = await this.orderService.getById(orderId).toPromise();
        if (order) {
          this.loadDataToInvoiceUploadComponent(order, orderDetailsResponse);
          this.syncEditModeDataToNgRx(orderId);
          this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 0 }));

          setTimeout(() => {
            this.selectedIndex = 1;
            this.cdr.markForCheck();
          }, 10000);
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
    this.destroy$.next();
    this.destroy$.complete();
    this.clearStepCaches();
  }

  private loadDataToInvoiceUploadComponent(order: any, orderDetails: any[]): void {
    this.store.dispatch(StepperActions.initializeStep1State({
      order: order,
      orderDetails: orderDetails,
      hasFile: false,
      fileName: 'Edit Mode Data'
    }));
    if (!this.invoiceUploadComponent) {

      this.pendingEditData = { orderId: order.id, order, orderDetails };
      return;
    }
    setTimeout(() => {
      if (this.invoiceUploadComponent) {
        (this.invoiceUploadComponent as any).restoreFromSession?.();
      }
      this.cdr.markForCheck();
    }, 5000);
  }

  private syncEditModeDataToNgRx(orderId: string): void {
    // NgRx store'dan mevcut data'yı kontrol et
    this.store.select(StepperSelectors.selectStep1State).pipe(take(1)).subscribe(step1State => {
      if (step1State.orderDetails.length > 0 && step1State.order) {
        this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 0, isValid: true }));
        this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 0 }));
      }
    });
  }

  private async loadPackageDataForStep2(): Promise<void> {
    try {
      this.store.dispatch(StepperActions.setStepLoading({
        stepIndex: 1,
        loading: true,
        operation: 'Loading package data'
      }));

      const packageResponse = await this.repositoryService.calculatePackageDetail().toPromise();

      if (packageResponse?.packages) {
        this.store.dispatch(StepperActions.initializeStep2State({
          packages: packageResponse.packages || [],
          availableProducts: packageResponse.remainingProducts || []
        }));

        this.store.dispatch(StepperActions.setStepLoading({
          stepIndex: 1,
          loading: false
        }));

        if (this.palletControlComponent) {
          setTimeout(() => {
            (this.palletControlComponent as any).updateComponentFromStore?.();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading package data:', error);
      this.store.dispatch(StepperActions.setStepLoading({
        stepIndex: 1,
        loading: false
      }));
    }
  }

  private performFullReset(): void {
    this.uiStateManager.resetAllStates();
    this.legacyLocalStorage.clearStorage();
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
      this.cdr.markForCheck();
    }, 500);
  }

  private handleResetFailure(): void {
    if (this.legacyToastService?.error) {
      this.legacyToastService.error('Reset sırasında hata oluştu. Sayfa yeniden yüklenecek.');
    }
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  private async initializeComponent(): Promise<void> {
    this.cdr.markForCheck();
  }
}

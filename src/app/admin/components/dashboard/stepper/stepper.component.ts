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
    ResultStepComponent, CommonModule
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
  private readonly localStorageService = inject(LocalStorageService);
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
      this.localStorageService.clearStorage();
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
    this.localStorageService.clearStorage();
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

  private configureChildComponents(): any {
    // const step1data = this.localStorageService.restoreStep1Data();
    // const step2data = this.localStorageService.restoreStep2Data();
    // const step3data = this.localStorageService.restoreStep3Data();

    // if(step1data){}

    // 1. local storage kontrol et ve verileri oku
    // 2. eger veri varsa drumu analiz et hangi durumdayiz
    // durumlar: edit mode, yarim process, storage bos
    // store verilerini yukle.
    // 
    // edit mode da 
    // load order for edit ile order ve order deatillar getiriyoruz

    //edit mode = yarim is = bos sayfa = 
    // bos sayfa senaryosu
    // kaydet butonu kalkacak
    // 2 senaryo var
    // 1 maneul fatura acma
    // 2 fatura yukleme
    // 1.1 ileri butonu ile ekrandaki veriler backende kayit edilir.
    // 1.2 eger kullanici 2 ye gectikten sonra geri doner ve tekrar 2 ye donerse
    // ngrx store isdirty flag ile api istegi gerekliligi kontrol edilir.
    // 2.1 fatura yukelemeden sonra database e kayitli olmayan order ve order detailar bulunmakta
    // ileri butonu ile bunlar veri tabanina gider.
    // yine ileri geri durumunda isdirty flag kontorl edilir
    // local storage her zaman eventlarda duzenli olarak guncellenir
    // her biri kendi verisinden kendi sorumlu kendi yazacak child component icin
    // sayfa refresh durumu 
    // stepper component tum steplerin store larini local stage den doldurmakla sorumlu
    // ============================================ 
    // edit mode ve local bos
    // edit mode ve local local dolu
    // kaydedilmemis invoice sayfasi silinir. eger kullanici ileriye bastiysa veri tabani kaydi olusur 
    // tamamlanmamais siparisler bolumunde bulabilir.
    // yarim siparisler zaman asimindan sonra kaldirilir.
    // ============================================ 
    // normal mode ve local storage
    // bu senaryoda veriler local storage dan getirilir
    // daha sonra bu kullanici yeni bir siparis acmak isterse 
    // ilgili butona basarak yeni siparise gecer.
    // ileri butonuna 1 kere basildiysa eger bu tamamlanmamais siparise 
    // siparisler bolumunden bulup geri donebilir.
    // ileri butonuna hic basmadiysa local storage temizlenir kullanici 
    // stepper i resetlemis olur
    // normal mode ve local bos
    // tertemiz bir stepper acilir`
    // buton ismi dinamik olucak isdirty flagine gore "kaydet ve ilerle" veya "ilerle" olacak
    // ============================================ 
    // gorevler
    // 1. localstorage dan veri cekme ve storu doldurma gorevi stepper componentte
    // 2. veri tabanina kayit ve update islemi icin her component kendi verisinden sorumlu
    // 3. islem sirasi icin sharedservice ve subject kullanilacak
    // 4.



  }
}

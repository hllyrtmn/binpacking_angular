// invoice-upload.component.ts (Refactored)

import {
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  ViewChild,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  Observable,
  switchMap,
  finalize,
  catchError,
  Subscription,
  interval,
  take
} from 'rxjs';
import { OrderService } from '../../../../services/order.service';
import { ToastService } from '../../../../../../services/toast.service';
import { LocalStorageService } from '../../services/local-storage.service';

import { Order } from '../../../../../../models/order.interface';
import { OrderDetail } from '../../../../../../models/order-detail.interface';
import { GenericTableComponent } from '../../../../../../components/generic-table/generic-table.component';

// Refactored managers and services
import { FileUploadManager } from './managers/file-upload.manager';
import { OrderFormManager } from './managers/order-form.manager';
import { OrderDetailManager } from './managers/order-detail.manager';
import { UIStateManager } from './managers/ui-state.manager';
import { InvoiceDataLoaderService } from './services/invoice-data-loader.service';
import { InvoiceCalculatorService } from './services/invoice-calculator.service';

import * as StepperSelectors from '../../../../../../store/stepper/stepper.selectors';
import * as StepperActions from '../../../../../../store/stepper/stepper.actions';
import { selectStep1Changes } from '../../../../../../store/stepper/stepper.selectors';
// Types and constants
import {
  OrderDetailUpdateEvent,
  UIState,
  ReferenceData,
  WeightType,
} from './models/invoice-upload-interfaces';
import { INVOICE_UPLOAD_CONSTANTS } from './constants/invoice-upload.constants';
import { AppState } from '../../../../../../store';
import { Store } from '@ngrx/store';

import { selectStep1Order, selectStep1OrderDetails, selectStep1IsDirty,
         selectStep1HasFile, selectStep1FileName } from '../../../../../../store/stepper/stepper.selectors';
import { CompanyRelation } from '../../../../../../models/company-relation.interface';
import { Truck } from '../../../../../../models/truck.interface';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-invoice-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatStepperModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDialogModule,
    MatDividerModule,
    MatCardModule,
    MatTooltipModule,
    GenericTableComponent,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './invoice-upload.component.html',
  styleUrl: './invoice-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceUploadComponent implements OnInit, OnDestroy {
  @Output() invoiceUploaded = new EventEmitter<any>();
  @Output() configurePallet = new EventEmitter<any>();
  @Output() orderDataRefreshed = new EventEmitter<void>();
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent<any>;

  // Inject managers and services
  private readonly fileUploadManager = inject(FileUploadManager);
  private readonly orderFormManager = inject(OrderFormManager);
  private readonly orderDetailManager = inject(OrderDetailManager);
  private readonly uiStateManager = inject(UIStateManager);
  private readonly dataLoaderService = inject(InvoiceDataLoaderService);
  private readonly calculatorService = inject(InvoiceCalculatorService);

  // Original services still needed
  private readonly orderService = inject(OrderService);
  private readonly toastService = inject(ToastService);
  private readonly localService = inject(LocalStorageService);

  private readonly store = inject(Store<AppState>);
  // NgRx Step1 Migration Observables
  public step1Order$ = this.store.select(selectStep1Order);
  public step1OrderDetails$ = this.store.select(selectStep1OrderDetails);
  public step1IsDirty$ = this.store.select(selectStep1IsDirty);
  public step1HasFile$ = this.store.select(selectStep1HasFile);
  public step1FileName$ = this.store.select(selectStep1FileName);

  // NgRx Observables
  public isEditMode$ = this.store.select(StepperSelectors.selectIsEditMode);
  public editOrderId$ = this.store.select(StepperSelectors.selectEditOrderId);

  private readonly cdr = inject(ChangeDetectorRef);
  // Form and data
  uploadForm!: FormGroup;
  referenceData: ReferenceData = { targetCompanies: [], trucks: [] };
  totalWeight: number = 0;
  processingLock:boolean = true;

  // Subscriptions
  private subscriptions: Subscription[] = [];
  private autoSaveSubscription?: Subscription;
  private lastFormState: string = '';

  // Expose constants for template
  readonly constants = INVOICE_UPLOAD_CONSTANTS;

  // Getters for template access
  get order(): Order | null {
    let currentOrder: Order | null = null;
    this.step1Order$.pipe(take(1)).subscribe(order => currentOrder = order);
    return currentOrder
  }

  get orderDetails(): OrderDetail[] {
    let currentOrderDetails: OrderDetail[] = [];
    this.step1OrderDetails$.pipe(take(1)).subscribe(details => currentOrderDetails = details);
    return currentOrderDetails
  }

  get uiState$(): Observable<UIState> {
    return this.uiStateManager.uiState$;
  }

  // UI State getters
  isLoading$ = combineLatest([
    this.store.select(StepperSelectors.selectIsStepLoading(0)),
    this.uiState$
  ]).pipe(
    map(([ngrxLoading, uiLoading]) => ngrxLoading || uiLoading)
  );

  get excelUpload(): boolean {
    return this.uiStateManager.getExcelUpload();
  }

  get dataRefreshInProgress(): boolean {
    return this.uiStateManager.getDataRefreshInProgress();
  }

  // File getters
  get file(): File | null {
    return this.fileUploadManager.getCurrentFile();
  }

  get tempFile(): File | null {
    return this.fileUploadManager.getTempFile();
  }

  // Reference data getters
  get targetCompanies(): any[] {
    return this.referenceData.targetCompanies;
  }

  get trucks(): any[] {
    return this.referenceData.trucks;
  }

  // Table configuration getters
  get displayedColumns(): string[] {
    return INVOICE_UPLOAD_CONSTANTS.TABLE.DISPLAYED_COLUMNS as string[];
  }

  get filterableColumns(): string[] {
    return INVOICE_UPLOAD_CONSTANTS.TABLE.FILTERABLE_COLUMNS as string[];
  }

  get nestedDisplayColumns(): { [key: string]: string } {
    return INVOICE_UPLOAD_CONSTANTS.TABLE.NESTED_DISPLAY_COLUMNS;
  }

  get excludeFields(): string[] {
    return INVOICE_UPLOAD_CONSTANTS.TABLE.EXCLUDE_FIELDS as string[];
  }

  // Performance Optimization - TrackBy functions
  trackByOrderDetailId = (index: number, item: any): any => {
    return item?.id || index;
  };

  trackByCompanyId = (index: number, item: any): any => {
    return item?.id || index;
  };

  trackByTruckId = (index: number, item: any): any => {
    return item?.id || index;
  };

  trackByWeightType = (index: number, item: string): string => {
    return item;
  };

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.autoSaveSubscription?.unsubscribe();
  }

  private initializeComponent(): void {
    this.uploadForm = this.orderFormManager.initializeForm();
    this.setupUIStateSubscription();
    this.loadReferenceData();
    this.restoreFromSession();
    this.setupAutoSaveListeners();
  }

  private setupUIStateSubscription(): void {
    const uiSub = this.uiState$.subscribe(state => {
    });
    this.subscriptions.push(uiSub);
  }

  private loadReferenceData(): void {

    const dataSub = this.dataLoaderService.loadAllReferenceData().subscribe({
      next: (data) => {
        this.referenceData = data;
      }
    });
    this.subscriptions.push(dataSub);
  }

  private restoreFromSession(): void {
    try {
      let hasNgRxData = false;
      this.step1OrderDetails$.pipe(take(1)).subscribe(details => {
        hasNgRxData = details.length > 0;
      });

      if (hasNgRxData) {
        this.configurePallet.emit();
        this.calculateTotals();
        this.toastService.info('NgRx store\'dan veriler yüklendi');
        return;
      }
      const restoredStep1Data = this.localService.restoreStep1Data();
      const restoredStep2Data = this.localService.restoreStep2Data();
      const restoredStep3Data = this.localService.restoreStep3Data();
      if (restoredStep1Data) {
        this.store.dispatch(StepperActions.initializeStep1State({
          order: restoredStep1Data.order,
          orderDetails: restoredStep1Data.orderDetails,
          hasFile: restoredStep1Data.hasFile,
          fileName: restoredStep1Data.fileName
        }));
        this.calculateTotals();
        this.toastService.info('LocalStorage\'dan NgRx\'e restore edildi');
      }
      if(restoredStep2Data){
        this.store.dispatch(StepperActions.initializeStep2State({
          packages: restoredStep2Data.packages,
          availableProducts: restoredStep2Data.availableProducts
        }))
        this.store.dispatch(StepperActions.setStepCompleted({stepIndex:0}))
      }
      if(restoredStep3Data){
        this.store.dispatch(StepperActions.initializeStep3State({
          optimizationResult:restoredStep3Data.optimizationResult,
          reportFiles:restoredStep3Data.reportFiles,
          algorithmStats:restoredStep3Data.algorithmStats,
          loadingStats:restoredStep3Data.loadingStats
        }))
        this.store.dispatch(StepperActions.setStepCompleted({stepIndex:1}))
      }
    } catch (error) {
      this.toastService.warning('Önceki veriler yüklenirken hata oluştu');
    }
  }

  private setupAutoSaveListeners(): void {
    const formSub = this.uploadForm.valueChanges.subscribe(() => {
      this.triggerAutoSave('form');
    });
    this.subscriptions.push(formSub);
    this.autoSaveSubscription = interval(INVOICE_UPLOAD_CONSTANTS.AUTO_SAVE.INTERVAL_MS)
      .subscribe(() => {
        this.checkForChangesAndAutoSave();
      });
  }

  private checkForChangesAndAutoSave(): void {
    const currentState = this.getCurrentFormState();

    if (currentState !== this.lastFormState && this.order && this.orderDetails.length > 0) {
      this.triggerAutoSave('user-action');
      this.lastFormState = currentState;
    }
  }

  private getCurrentFormState(): string {
    try {
      return JSON.stringify({
        order: this.order,
        orderDetails: this.orderDetails,
        hasFile: this.fileUploadManager.hasTempFile(),
      });
    } catch (error) {
      return '';
    }
  }

  private triggerAutoSave(changeType: 'form' | 'user-action' | 'api-response' = 'user-action'): void {
    if (this.order && this.orderDetails.length > 0) {
      const autoSaveData = {
        order: this.order,
        orderDetails: this.orderDetails,
        hasFile: this.fileUploadManager.hasTempFile(),
        fileName: this.fileUploadManager.getFileName(),
      };
      this.store.dispatch(StepperActions.triggerAutoSave({
        stepNumber: 0,
        data: autoSaveData,
        changeType: changeType
      }));
    }
  }

  onFileSelected(event: Event): void {
    this.fileUploadManager.selectFile(event);
  }

  uploadFile(): void {
    this.uiStateManager.startFileUpload();
    this.store.dispatch(StepperActions.setStepLoading({
      stepIndex: 0,
      loading: true,
      operation: 'File upload'
    }));
    const uploadSub = this.fileUploadManager.uploadFile()
      .pipe(
        finalize(() => {
          this.uiStateManager.finishFileUpload();
          // NgRx store loading'i de bitir
          this.store.dispatch(StepperActions.setStepLoading({
            stepIndex: 0,
            loading: false
          }));
      }))
      .subscribe({
        next: (response) => {
          this.store.dispatch(StepperActions.initializeStep1StateFromUpload({
            order: response.order,
            orderDetails: response.orderDetail,
            hasFile: true,
            fileName: 'File Upload Result'
          }));
          this.calculateTotals();
          this.toastService.success(INVOICE_UPLOAD_CONSTANTS.MESSAGES.SUCCESS.FILE_PROCESSED);
          this.resetForm();

          this.triggerAutoSave('api-response');
        },
        error: (error) => {
          this.toastService.error(INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.FILE_PROCESSING, error);
        },
      });
    this.subscriptions.push(uploadSub);
  }

  onOrderFieldChange(field: string, value: any): void {
    let currentOrder = this.order;
    if (currentOrder) {
      const updatedOrder = { ...currentOrder, [field]: value };

      this.store.dispatch(StepperActions.initializeStep1State({
        order: updatedOrder,
        orderDetails: this.orderDetails,
        hasFile: this.step1HasFile$ ? true : false,
        fileName: this.step1FileName$ ? 'Updated' : undefined
      }));
    }

    this.triggerAutoSave('user-action');
    this.cdr.markForCheck();
  }

  onCompanyChange(selectedCompany: any): void {
    let currentOrder = this.order;
    if (currentOrder) {
      const updatedOrder = { ...currentOrder, company_relation: selectedCompany };

      this.store.dispatch(StepperActions.initializeStep1State({
        order: updatedOrder,
        orderDetails: this.orderDetails,
        hasFile: this.step1HasFile$ ? true : false,
        fileName: this.step1FileName$ ? 'Company Updated' : undefined
      }));
    }

    this.triggerAutoSave('user-action');
    this.cdr.markForCheck();
  }

  onTruckChange(selectedTruck: any): void {
    let currentOrder = this.order;
    if (currentOrder) {
      const updatedOrder = { ...currentOrder, truck: selectedTruck };

      this.store.dispatch(StepperActions.initializeStep1State({
        order: updatedOrder,
        orderDetails: this.orderDetails,
        hasFile: this.step1HasFile$ ? true : false,
        fileName: this.step1FileName$ ? 'Truck Updated' : undefined
      }));
    }

    this.triggerAutoSave('user-action');
    this.cdr.markForCheck();
  }

  onWeightTypeChange(selectedWeightType: string): void {
    let currentOrder = this.order;
    if (currentOrder) {
      const updatedOrder = { ...currentOrder, weight_type: selectedWeightType };

      this.store.dispatch(StepperActions.initializeStep1State({
        order: updatedOrder,
        orderDetails: this.orderDetails,
        hasFile: this.step1HasFile$ ? true : false,
        fileName: this.step1FileName$ ? 'Weight Type Updated' : undefined
      }));
    }

    this.calculateTotals();
    this.triggerAutoSave('user-action');
    this.cdr.markForCheck();
  }

  createOrderDetail(): void {
    let currentOrder = this.order;
    if (!currentOrder) {

      const now = new Date();
      const newOrder = {
        id: crypto.randomUUID(),
        name: '',
        date: now.toISOString(),
        company_relation: {} as CompanyRelation,
        truck: {} as Truck,
        weight_type: '',
        created_at: now,
        updated_at: now,
        deleted_time: null,
        is_deleted: false,
      };

      this.store.dispatch(StepperActions.initializeStep1State({
        order: newOrder,
        orderDetails: this.orderDetails,
        hasFile: false,
        fileName: undefined
      }));

      currentOrder = newOrder;
    }

    const dialogSub = this.orderDetailManager.openOrderDetailDialog(currentOrder!)
      .subscribe({
        next: (newOrderDetail:any) => {
          if (newOrderDetail) {
            this.store.dispatch(StepperActions.addOrderDetail({
              orderDetail: newOrderDetail.orderDetail
            }));

            this.updateTableData();
            this.calculateTotals();
            this.triggerAutoSave('user-action');
          }
        }
      });

    this.subscriptions.push(dialogSub);
  }

  updateOrderDetail(event: OrderDetailUpdateEvent): void {
    const updatedDetail = { ...event.item, ...event.data };
    this.store.dispatch(StepperActions.updateOrderDetail({
      orderDetail: updatedDetail
    }));

    this.updateTableData();
    this.calculateTotals();
    this.triggerAutoSave('user-action');

  }

  deleteOrderDetail(id: string): void {
    this.store.dispatch(StepperActions.deleteOrderDetail({
      orderDetailId: id
    }));

    this.updateTableData();
    this.calculateTotals();
    this.triggerAutoSave('user-action');

  }

  calculateTotals(): void {
    if (!this.order?.weight_type) {
      this.totalWeight = 0;
      return;
    }
    const result = this.calculatorService.calculateTotalWeight(
      this.orderDetails,
      this.order.weight_type as WeightType
    );
    this.totalWeight = result.totalWeight;
  }

  isFormValid(): boolean {
    let hasValidOrder = false;
    let hasValidOrderDetails = false;

    this.step1Order$.pipe(take(1)).subscribe(order => {
      hasValidOrder = !!(order?.date && order?.company_relation && order?.truck && order?.weight_type);
    });

    this.step1OrderDetails$.pipe(take(1)).subscribe(details => {
      hasValidOrderDetails = details.length > 0;
    });
    return hasValidOrder && hasValidOrderDetails;
  }

  submit(): void {
    if (!this.isFormValid()) {
      this.toastService.warning(INVOICE_UPLOAD_CONSTANTS.MESSAGES.WARNING.FILL_REQUIRED_FIELDS);
      return;
    }

    if (!this.order || this.orderDetails.length === 0) {
      this.toastService.warning(INVOICE_UPLOAD_CONSTANTS.MESSAGES.WARNING.MISSING_ORDER_DETAILS);
      return;
    }

    this.uiStateManager.startSubmit();
    this.store.dispatch(StepperActions.setStepLoading({
      stepIndex: 0,
      loading: true,
      operation: 'Submitting order data'
    }));
    this.toastService.info(INVOICE_UPLOAD_CONSTANTS.MESSAGES.INFO.OPERATION_IN_PROGRESS);

    let orderDetailChanges: any;
    this.store.select(selectStep1Changes).pipe(take(1)).subscribe(changes => {
      orderDetailChanges = {
        added: changes.added,
        modified: changes.modified,
        deleted: changes.deleted.map(detail => detail.id || detail)
      };
    });
    const orderOperation = this.getOrderOperation();

    const submitSub = orderOperation
      .pipe(
        switchMap((orderResponse) => {
          if (orderResponse?.id && this.order) {
            const updatedOrder = { ...this.order, id: orderResponse.id };
            this.store.dispatch(StepperActions.initializeStep1State({
              order: updatedOrder,
              orderDetails: this.orderDetails,
              hasFile: this.step1HasFile$ ? true : false,
              fileName: this.step1FileName$ ? 'Order Saved' : undefined
            }));
          }

          if (this.fileUploadManager.hasTempFile()) {
            return this.fileUploadManager.uploadFileToOrder(orderResponse.id)
              .pipe(
                switchMap(() =>
                  this.orderDetailManager.processOrderDetailChanges(
                    orderDetailChanges,
                    orderResponse.id
                  )
                )
              );
          } else {
            return this.orderDetailManager.processOrderDetailChanges(
              orderDetailChanges,
              orderResponse.id
            );
          }
        }),
        finalize(() => {
          this.processingLock = false;
          this.uiStateManager.finishSubmit();
          this.store.dispatch(StepperActions.setStepLoading({
            stepIndex: 0,
            loading: false
          }));
        }))
      .subscribe({
        next: (result) => {
          this.handleSubmitSuccess(result);
          this.triggerStep2DataLoad();
        },
        error: (error) => {
          this.store.dispatch(StepperActions.setGlobalError({
            error: {
              message: INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.OPERATION_ERROR + (error.message || error),
              code: error.status?.toString(),
              stepIndex: 0
            }
          }));

          this.toastService.error(
            INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.OPERATION_ERROR + (error.message || error)
          );
        },
      });

    this.subscriptions.push(submitSub);
  }

  private clearChangesAfterSubmit(): void {
    // Added, modified, deleted'ları temizle ve isDirty'yi false yap
    this.store.dispatch(StepperActions.resetStep1Changes());
  }
  private triggerStep2DataLoad(): void {
    this.configurePallet.emit();
  }

  private getOrderOperation(): Observable<any> {
    const formattedOrder = {
      id: this.order!.id,
      company_relation_id: this.order!.company_relation?.id,
      truck_id: this.order!.truck?.id,
      date: this.order!.date,
      weight_type: this.order!.weight_type,
      name: this.order!.name,
    };

    return this.orderService.getById(this.order!.id).pipe(
      switchMap((existingOrder) => {
        return this.orderService.update(this.order!.id, formattedOrder);
      }),
      catchError((error) => {
        if (error.status === 404) {
          return this.orderService.create(formattedOrder);
        }
        throw error;
      })
    );
  }

  private handleSubmitSuccess(result: any): void {
    this.invoiceUploaded.emit();
    this.toastService.success(INVOICE_UPLOAD_CONSTANTS.MESSAGES.SUCCESS.CHANGES_SAVED);
    this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 0 }));
    this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 0, isValid: true }));
    this.store.dispatch(StepperActions.clearAdded());
    if (result?.order_details && Array.isArray(result.order_details)) {
      this.syncComponentWithBackendData(result.order_details);
    } else {
    // Backend'den order_details gelmezse mevcut state'i temizle
    this.clearChangesAfterSubmit();
  }

    this.localService.saveStep1Data(
      this.order!,
      this.orderDetails,
      this.fileUploadManager.hasTempFile(),
      this.fileUploadManager.getFileName()
    );
  }

  resetForm(): void {
    this.fileUploadManager.moveFileToTemp();
    this.orderFormManager.resetForm();
  }

  resetComponentState(): void {
    try {
      this.store.dispatch(StepperActions.initializeStep1State({
        order: null,
        orderDetails: [],
        hasFile: false,
        fileName: undefined
      }));
      this.fileUploadManager.resetAllFiles();
      this.totalWeight = 0;

      this.uiStateManager.resetAllStates();
      this.updateTableData();
      this.lastFormState = '';
    } catch (error) {

    }
  }

  forceSaveStep1(): void {
    if (this.order && this.orderDetails.length > 0) {
      const autoSaveData = {
        order: this.order,
        orderDetails: this.orderDetails,
        hasFile: this.fileUploadManager.hasTempFile(),
        fileName: this.fileUploadManager.getFileName(),
      };

      this.store.dispatch(StepperActions.forceSave({
        stepNumber: 0,
        data: autoSaveData
      }));
    }
  }

  private updateTableData(): void {
    if (this.genericTable?.dataSource) {
      this.genericTable.dataSource.data = [...this.orderDetails];
      this.genericTable.dataSource._updateChangeSubscription();
    }
  }

  private syncComponentWithBackendData(backendOrderDetails: OrderDetail[]): void {
    this.store.dispatch(StepperActions.syncStep1WithBackend({
      orderDetails: backendOrderDetails
    }));
    this.updateTableData();
    this.calculateTotals();
  }

  getFormattedDate(date: string | Date | null | undefined): string {
    return this.orderFormManager.getFormattedDate(date);
  }

  compareObjects = (a: any, b: any): boolean => {
    return this.orderFormManager.compareObjects(a, b);
  }

  compareCompanies = (a: any, b: any): boolean => {
    return this.orderFormManager.compareCompanies(a, b);
  }

  compareWeightTypes = (a: string, b: string): boolean => {
    return this.orderFormManager.compareWeightTypes(a, b);
  }
}

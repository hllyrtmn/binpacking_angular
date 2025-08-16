// invoice-upload.component.ts (Refactored)

import {
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  ViewChild,
  OnDestroy,
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
  take,
} from 'rxjs';

import { OrderService } from '../../../../services/order.service';
import { ToastService } from '../../../../../../services/toast.service';
import { AutoSaveService } from '../../services/auto-save.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { StateManager } from '../../services/state-manager.service';

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
// Types and constants
import {
  OrderDetailUpdateEvent,
  UIState,
  ReferenceData,
  WeightType,
  AutoSaveData,
} from './models/invoice-upload-interfaces';
import { INVOICE_UPLOAD_CONSTANTS } from './constants/invoice-upload.constants';
import { RepositoryService } from '../../services/repository.service';
import { AppState } from '../../../../../../store';
import { Store } from '@ngrx/store';

import { selectStep1Order, selectStep1OrderDetails, selectStep1IsDirty,
         selectStep1HasFile, selectStep1FileName } from '../../../../../../store/stepper/stepper.selectors';

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
  private readonly autoSaveService = inject(AutoSaveService);
  private readonly localService = inject(LocalStorageService);
  private readonly stateManager = inject(StateManager);
  private readonly repositoryService = inject(RepositoryService);

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

  // Form and data
  uploadForm!: FormGroup;
  referenceData: ReferenceData = { targetCompanies: [], trucks: [] };
  totalWeight: number = 0;

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
    return currentOrder || this.orderFormManager.getOrder(); // Fallback
  }

  get orderDetails(): OrderDetail[] {
    let currentOrderDetails: OrderDetail[] = [];
  this.step1OrderDetails$.pipe(take(1)).subscribe(details => currentOrderDetails = details);
  return currentOrderDetails.length > 0 ? currentOrderDetails : this.orderDetailManager.getOrderDetails(); // Fallback
  }

  get uiState$(): Observable<UIState> {
    return this.uiStateManager.uiState$;
  }

  // UI State getters
  get isLoading(): boolean {
    return this.uiStateManager.getLoading();
  }

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

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.autoSaveSubscription?.unsubscribe();
  }

  private initializeComponent(): void {
    // Initialize form
    this.uploadForm = this.orderFormManager.initializeForm();

    // Setup UI state subscription
    this.setupUIStateSubscription();

    // Load reference data
    this.loadReferenceData();

    // Restore session data
    this.restoreFromSession();

    // Setup auto-save
    this.setupAutoSaveListeners();

    // Initialize state manager if data exists
    this.initializeStateManager();
  }

  private setupUIStateSubscription(): void {
    const uiSub = this.uiState$.subscribe(state => {
      // Handle UI state changes if needed
    });
    this.subscriptions.push(uiSub);
  }

  private loadReferenceData(): void {
    const dataSub = this.dataLoaderService.loadAllReferenceData().subscribe({
      next: (data) => {
        this.referenceData = data;
      },
      error: (error) => {

      }
    });
    this.subscriptions.push(dataSub);
  }

  private restoreFromSession(): void {
  try {
    // StateManager'dan verileri al (hem session'dan hem de edit mode'dan gelebilir)
    const step1State = this.stateManager.step1.state();

    if (step1State.current.length > 0) {
      // StateManager'dan gelen veriler (edit mode için)
      const order = this.stateManager.step1.order();
      const orderDetails = step1State.current;

      if (order) {
        // NgRx store'a yükle
        this.store.dispatch(StepperActions.initializeStep1State({
          order,
          orderDetails,
          hasFile: false,
          fileName: 'Restored Data'
        }));

        // Legacy için de set et (geçiş süreci)
        this.orderFormManager.setOrder(order);
      }

      this.orderDetailManager.setOrderDetails(orderDetails);
      this.configurePallet.emit();
      this.calculateTotals();

      this.toastService.info('Mevcut sipariş verileri yüklendi');
      return;
    }

    // Fallback: LocalStorage'dan restore et
    const restoredData = this.localService.restoreStep1Data();

    if (restoredData) {
      if (restoredData.order) {
        this.orderFormManager.setOrder(restoredData.order);
      }

      this.orderDetailManager.setOrderDetails(restoredData.orderDetails);
      this.calculateTotals();

      this.toastService.info('Önceki session verileri restore edildi');
    }
  } catch (error) {
  }
}

  private setupAutoSaveListeners(): void {
    // Form changes auto-save
    const formSub = this.uploadForm.valueChanges.subscribe(() => {
      this.triggerAutoSave('form');
    });
    this.subscriptions.push(formSub);

    // Periodic auto-save for user actions
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

      // NgRx action dispatch et (eski AutoSaveService yerine)
      this.store.dispatch(StepperActions.triggerAutoSave({
        stepNumber: 0,
        data: autoSaveData,
        changeType: changeType
      }));

      console.log('🎯 NgRx Auto-save triggered for Step 1');
    }
  }

  private initializeStateManager(): void {
    setTimeout(() => {
      if (this.order && this.orderDetails.length > 0) {
        const currentState = this.stateManager.step1.state();
        if (currentState.original.length === 0 && this.orderDetails.length > 0) {
          this.stateManager.initializeStep1(
            this.order,
            this.orderDetails,
            this.fileUploadManager.hasTempFile(),
            this.fileUploadManager.getFileName()
          );
        }
      }
    }, 100);
  }

  // File operations
  onFileSelected(event: Event): void {
    this.fileUploadManager.selectFile(event);
  }

  uploadFile(): void {
    this.uiStateManager.startFileUpload();

    const uploadSub = this.fileUploadManager.uploadFile()
      .pipe(
        finalize(() => this.uiStateManager.finishFileUpload())
      )
      .subscribe({
        next: (response) => {
          this.orderDetailManager.setOrderDetails(response.orderDetail);
          this.orderFormManager.setOrder(response.order);
          this.calculateTotals();

          this.toastService.success(INVOICE_UPLOAD_CONSTANTS.MESSAGES.SUCCESS.FILE_PROCESSED);
          this.resetForm();

          this.stateManager.initializeStep1(
            this.order!,
            this.orderDetails,
            true,
            this.fileUploadManager.getCurrentFile()?.name
          );

          this.triggerAutoSave('api-response');
        },
        error: (error) => {
          this.toastService.error(INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.FILE_PROCESSING, error);
        },
      });

    this.subscriptions.push(uploadSub);
  }

  // Order field updates
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

    // Legacy için de güncelle (geçiş süreci)
    this.orderFormManager.updateOrderField(field, value);
    this.triggerAutoSave('user-action');
  }


  onCompanyChange(selectedCompany: any): void {
    this.orderFormManager.updateCompanyRelation(selectedCompany);
    this.triggerAutoSave('user-action');
  }

  onTruckChange(selectedTruck: any): void {
    this.orderFormManager.updateTruck(selectedTruck);
    this.triggerAutoSave('user-action');
  }

  onWeightTypeChange(selectedWeightType: string): void {
    this.orderFormManager.updateWeightType(selectedWeightType);
    this.calculateTotals();
    this.triggerAutoSave('user-action');
  }

  // OrderDetail operations
  createOrderDetail(): void {
    let currentOrder = this.order;
    if (!currentOrder) {
      currentOrder = this.orderFormManager.initializeNewOrder();
    }

    const dialogSub = this.orderDetailManager.openOrderDetailDialog(currentOrder!)
      .subscribe({
        next: (newOrderDetail) => {
          if (newOrderDetail) {
            // NgRx store'a ekle
            this.store.dispatch(StepperActions.addOrderDetail({
              orderDetail: newOrderDetail
            }));

            // Legacy için de ekle (geçiş süreci)
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

    // Legacy için de güncelle (geçiş süreci)
    const legacyUpdatedDetail = this.orderDetailManager.updateOrderDetail(event);
    if (legacyUpdatedDetail) {
      this.updateTableData();
      this.calculateTotals();
      this.triggerAutoSave('user-action');
    }
  }

  deleteOrderDetail(id: string): void {
    this.store.dispatch(StepperActions.deleteOrderDetail({
      orderDetailId: id
    }));

    const deleted = this.orderDetailManager.deleteOrderDetail(id);
    if (deleted) {
      this.updateTableData();
      this.calculateTotals();
      this.triggerAutoSave('user-action');
    }
  }

  // Calculations
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

  // Validation and submission
  isFormValid(): boolean {
    return this.orderFormManager.isFormValid() && this.orderDetailManager.validateOrderDetails();
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
    this.toastService.info(INVOICE_UPLOAD_CONSTANTS.MESSAGES.INFO.OPERATION_IN_PROGRESS);

    const orderDetailChanges = this.orderDetailManager.getOrderDetailChanges();
    const orderOperation = this.getOrderOperation();

    const submitSub = orderOperation
      .pipe(
        switchMap((orderResponse) => {
          if (orderResponse?.id && this.order) {
            this.orderFormManager.setOrder({
              ...this.order,
              id: orderResponse.id
            });
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
        finalize(() => this.uiStateManager.finishSubmit())
      )
      .subscribe({
        next: (result) => {
          this.handleSubmitSuccess(result);
        },
        error: (error) => {
          console.log(error)
          this.toastService.error(
            INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.OPERATION_ERROR + (error.message || error)
          );
        },
      });

    this.subscriptions.push(submitSub);
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

    this.stateManager.markStep1AsSaved();

    this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 0 }));
    this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 0, isValid: true }));

    if (result?.order_details && Array.isArray(result.order_details)) {
      this.syncComponentWithBackendData(result.order_details);
    }

    this.localService.saveStep1Data(
      this.order!,
      this.orderDetails,
      this.fileUploadManager.hasTempFile(),
      this.fileUploadManager.getFileName()
    );
  }

  // Utility methods
  resetForm(): void {
    this.fileUploadManager.moveFileToTemp();
    this.orderFormManager.resetForm();
  }

  resetComponentState(): void {
    try {
      this.orderFormManager.resetOrder();
      this.orderDetailManager.clearOrderDetails();
      this.fileUploadManager.resetAllFiles();
      this.totalWeight = 0;

      this.uiStateManager.resetAllStates();
      this.updateTableData();
      this.lastFormState = '';
      this.stateManager.resetAllStates();
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

      // Force save action dispatch et
      this.store.dispatch(StepperActions.forceSave({
        stepNumber: 0,
        data: autoSaveData
      }));

      console.log('⚡ NgRx Force save triggered for Step 1');
    }
  }

  private updateTableData(): void {
    if (this.genericTable?.dataSource) {
      this.genericTable.dataSource.data = [...this.orderDetails];
      this.genericTable.dataSource._updateChangeSubscription();
    }
  }

  private syncComponentWithBackendData(backendOrderDetails: OrderDetail[]): void {
    this.orderDetailManager.syncWithBackendData(backendOrderDetails);
    this.updateTableData();

    if (this.order) {
      this.stateManager.initializeStep1(
        this.order,
        this.orderDetails,
        this.fileUploadManager.hasTempFile(),
        this.fileUploadManager.getFileName()
      );
    }

    this.calculateTotals();
  }

  // Template helper methods (delegated to managers)
  getFormattedDate(date: string | Date | null | undefined): string {
    return this.orderFormManager.getFormattedDate(date);
  }

  // Comparison methods for mat-select [compareWith] - must be bound to component context
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

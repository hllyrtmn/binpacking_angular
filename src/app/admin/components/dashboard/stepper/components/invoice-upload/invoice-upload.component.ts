import {
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Observable,
  switchMap,
  tap,
  finalize,
  of,
  catchError,
} from 'rxjs';

import { RepositoryService } from '../../services/repository.service';
import { ToastService } from '../../../../../../services/toast.service';
import { OrderService } from '../../../../services/order.service';
import { Order } from '../../../../../../models/order.interface';
import { OrderDetail } from '../../../../../../models/order-detail.interface';
import { GenericTableComponent } from '../../../../../../components/generic-table/generic-table.component';
import { OrderDetailAddDialogComponent } from './order-detail-add-dialog/order-detail-add-dialog.component';
import { AutoSaveService } from '../../services/auto-save.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Truck } from '../../../../../../models/truck.interface';
import { UserService } from '../../../../../../services/user.service';
import { v4 as uuidv4 } from 'uuid';
import { StateManager } from '../../services/state-manager.service';

// Sabit değişkenler
const VALID_FILE_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
export class InvoiceUploadComponent implements OnInit {
  @Output() invoiceUploaded = new EventEmitter<any>();
  @Output() orderDataRefreshed = new EventEmitter<void>();
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent<any>;

  // Inject servisleri
  private readonly _formBuilder = inject(FormBuilder);
  private readonly repositoryService = inject(RepositoryService);
  private readonly toastService = inject(ToastService);
  private readonly orderService = inject(OrderService);
  private readonly dialog = inject(MatDialog);
  private readonly localService = inject(LocalStorageService);
  private readonly autoSaveService = inject(AutoSaveService);
  private readonly userService = inject(UserService);
  private readonly stateManager = inject(StateManager);
  private lastFormState: string = '';

  // Ana data properties
  uploadForm: FormGroup;
  file: File | null = null;
  tempFile: File | null = null;
  order!: Order | null;
  orderDetails: OrderDetail[] = [];
  totalWeight: number = 0;

  // UI state
  isLoading = false;
  excelUpload = false;
  dataRefreshInProgress = false;

  // Referans data
  targetCompanies: any[] = [];
  trucks: Truck[] = [];

  // Tablo yapılandırması
  readonly displayedColumns: string[] = [
    'product.name',
    'product.product_type.type',
    'product.product_type.code',
    'product.dimension.width',
    'product.dimension.depth',
    'count',
  ];

  readonly filterableColumns: string[] = [
    'product.name',
    'product.product_type.type',
    'product.product_type.code',
    'product.dimension.width',
    'product.dimension.depth',
    'count',
  ];

  readonly nestedDisplayColumns: { [key: string]: string } = {
    'product.name': 'Ürün Adı',
    'product.product_type.type': 'Ürün Tipi',
    'product.product_type.code': 'Ürün Kodu',
    'product.dimension.width': 'Genişlik',
    'product.dimension.depth': 'Derinlik',
    count: 'Adet',
  };

  readonly excludeFields: string[] = [
    'product.name',
    'product.product_type.type',
    'product.product_type.code',
    'product.dimension.width',
    'product.dimension.depth',
  ];

  constructor() {
    this.uploadForm = this._formBuilder.group({
      fileInput: ['', [Validators.required, this.fileValidator]],
    });
  }

  ngOnInit(): void {
    this.setupFormValidation();
    this.checkPrerequisites();
    this.restoreFromSession();
    this.loadTargetCompanies();
    this.loadTrucks();

    if (this.order?.id) {
      this.calculateTotals();
    }

    setTimeout(() => {
      if (this.order && this.orderDetails.length > 0) {
        const currentState = this.stateManager.step1.state();
        if (
          currentState.original.length === 0 &&
          this.orderDetails.length > 0
        ) {
          this.stateManager.initializeStep1(
            this.order,
            this.orderDetails,
            false
          );
        }
      }
    }, 100);

    this.setupAutoSaveListeners();
  }

  private checkPrerequisites(): boolean {
    return true;
  }

  loadTargetCompanies(): void {
    this.userService
      .getProfile()
      .pipe(
        switchMap((response) => {
          return this.repositoryService.companyRelations(response.company.id);
        })
      )
      .subscribe({
        next: (res) => {
          this.targetCompanies = res;
        },
        error: (error) => {
          this.toastService.error(
            'Profil bilgisi yüklenirken hata oluştu CompanyRelation'
          );
        },
      });
  }

  loadTrucks(): void {
    this.repositoryService.trucks().subscribe({
      next: (response) => {
        this.trucks = response.results;
      },
      error: (error) => {
        this.toastService.error('Tır bilgisi yüklenirken hata oluştu');
      },
    });
  }

  private setupAutoSaveListeners(): void {
    this.uploadForm.valueChanges.subscribe(() => {
      this.triggerAutoSave('form');
    });

    this.watchOrderChanges();
  }

  private watchOrderChanges(): void {
    setInterval(() => {
      const currentState = this.getCurrentFormState();

      if (
        currentState !== this.lastFormState &&
        this.order &&
        this.orderDetails.length > 0
      ) {
        this.triggerAutoSave('user-action');
        this.lastFormState = currentState;
      }
    }, 1000);
  }

  private getCurrentFormState(): string {
    try {
      return JSON.stringify({
        order: this.order,
        orderDetails: this.orderDetails,
        hasFile: !!this.tempFile,
      });
    } catch (error) {
      return '';
    }
  }

  private triggerAutoSave(
    changeType: 'form' | 'user-action' | 'api-response' = 'user-action'
  ): void {
    if (this.order && this.orderDetails.length > 0) {
      this.autoSaveService.triggerStep1AutoSave(
        {
          order: this.order,
          orderDetails: this.orderDetails,
          hasFile: !!this.tempFile,
          fileName: this.tempFile?.name,
        },
        changeType
      );
    }
  }

  private restoreFromSession(): void {
    try {
      const restoredData = this.localService.restoreStep1Data();

      if (restoredData) {
        if (restoredData.order) {
          this.order = restoredData.order;
          this.updateFormValidation();
        }
        this.orderDetails = restoredData.orderDetails;

        if (this.order)
          this.stateManager.initializeStep1(
            this.order,
            this.orderDetails,
            restoredData.hasFile,
            restoredData.fileName
          );

        this.calculateTotals();
        this.toastService.info('Önceki verileriniz restore edildi');
      } else {
        if (this.order && this.orderDetails.length > 0) {
          this.stateManager.initializeStep1(
            this.order,
            this.orderDetails,
            false
          );
        }
      }
    } catch (error) {
      if (this.order && this.orderDetails.length > 0) {
        this.stateManager.initializeStep1(this.order, this.orderDetails, false);
      }
    }
  }

  private initializeNewOrder(): void {
    this.order = {
      id: uuidv4(),
      name: '',
      date: null,
      company_relation: null,
      truck: null,
      weight_type: '',
    } as unknown as Order;

    this.stateManager.initializeStep1(this.order, this.orderDetails, false);
  }

  private updateFormValidation(): void {
    if (this.order) {
      this.uploadForm.patchValue({
        orderName: this.order.name || '',
        orderDate: this.order.date || '',
        companyRelation: this.order.company_relation || '',
        truck: this.order.truck || '',
        weightType: this.order.weight_type || '',
      });
    }
  }

  onOrderFieldChange(field: string, value: any): void {
    if (!this.order) {
      this.initializeNewOrder();
    }

    if (this.order) {
      (this.order as any)[field] = value;
      this.updateFormValidation();
      this.triggerAutoSave('user-action');
    }
  }

  onCompanyChange(selectedCompany: any): void {
    if (!this.order) {
      this.initializeNewOrder();
    }

    if (this.order) {
      this.order.company_relation = selectedCompany;
      this.triggerAutoSave('user-action');
    }
  }

  onTruckChange(selectedTruck: any): void {
    if (!this.order) {
      this.initializeNewOrder();
    }

    if (this.order) {
      this.order.truck = selectedTruck;
      this.triggerAutoSave('user-action');
    }
  }

  onWeightTypeChange(selectedWeightType: string): void {
    if (!this.order) {
      this.initializeNewOrder();
    }

    if (this.order) {
      this.order.weight_type = selectedWeightType;
      this.calculateTotals();
      this.triggerAutoSave('user-action');
    }
  }

  private fileValidator = (
    control: AbstractControl
  ): ValidationErrors | null => {
    const file = control.value as File;
    if (!file) return null;

    if (!VALID_FILE_TYPES.includes(file.type)) {
      return { invalidFileType: true };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { fileTooLarge: true };
    }

    return null;
  };

  getFormattedDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';

    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return 'N/A';
    }

    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }

    return `${dateObj.getDate().toString().padStart(2, '0')}.${(
      dateObj.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}.${dateObj.getFullYear()}`;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.validateFile(this.file);
    }
  }

  validateFile(file: File): void {
    if (!VALID_FILE_TYPES.includes(file.type)) {
      this.toastService.error(
        'Geçersiz dosya türü. Lütfen bir PDF veya Excel dosyası yükleyin.'
      );
      this.resetFileInput();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.toastService.error('Dosya boyutu 10 MB sınırını aşıyor.');
      this.resetFileInput();
      return;
    }

    this.toastService.success('Dosya başarıyla seçildi.');
  }

  private resetFileInput(): void {
    this.file = null;
    this.uploadForm.get('fileInput')?.reset();
  }

  uploadFile(): void {
    if (!this.file) {
      this.toastService.warning('Lütfen bir dosya seçin.');
      return;
    }

    this.isLoading = true;
    this.excelUpload = true;
    this.toastService.info('Dosya yükleniyor...');

    this.repositoryService
      .processFile(this.file)
      .pipe(
        tap(() => {
          this.toastService.info('Dosya işleniyor...');
        }),
        finalize(() => {
          this.isLoading = false;
          this.excelUpload = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.orderDetails = response.orderDetail;
          this.order = response.order;
          this.calculateTotals();
          this.toastService.success('Dosya İşlendi');
          this.resetForm();

          this.stateManager.initializeStep1(
            this.order,
            this.orderDetails,
            true,
            this.file?.name
          );

          this.triggerAutoSave('api-response');
        },
        error: (error) => {
          this.toastService.error('Dosya işlenirken bir hata oluştu.', error);
        },
      });
  }

  private resetForm(): void {
    this.tempFile = this.file;
    this.file = null;
    this.uploadForm.reset();
  }

  calculateTotals(): void {
    try {
      type WeightTypeKey = 'std' | 'pre' | 'eco';

      const selectedWeightType = this.order?.weight_type as WeightTypeKey;

      this.totalWeight = this.orderDetails.reduce((sum, detail) => {
        const productWeight = detail.product?.weight_type?.[selectedWeightType] || 0;
        const count = detail.count || 1;
        return sum + productWeight * count;
      }, 0);
    } catch (error) {

      this.totalWeight = 0;
    }
  }

  createOrderDetail(): void {
    if (!this.order) {
      this.initializeNewOrder();
    } else {
      this.openOrderDetailDialog(this.order);
    }
  }

  openOrderDetailDialog(order: Order): void {
    const dialogRef = this.dialog.open(OrderDetailAddDialogComponent, {
      width: '600px',
      data: order,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result && result.orderDetail) {
          this.orderDetails.unshift(result.orderDetail);
          this.genericTable.dataSource.data.unshift(result.orderDetail);
          this.genericTable.dataSource._updateChangeSubscription();
          this.calculateTotals();

          this.stateManager.addOrderDetail(result.orderDetail);
          this.toastService.success('Sipariş detayı başarıyla eklendi.');
          this.triggerAutoSave('user-action');
        }
      }
    });
  }

  submit(): void {
    if (!this.isFormValid()) {
      this.toastService.warning(
        'Lütfen tüm zorunlu alanları doldurun (Sipariş No, Tarih, Müşteri, Tır, Ağırlık Tipi)'
      );
      return;
    }

    if (!this.order || this.orderDetails.length === 0) {
      this.toastService.warning(
        'Sipariş detayları eksik. Lütfen kontrol ediniz.'
      );
      return;
    }
    this.isLoading = true;
    this.toastService.info('İşlem gerçekleştiriliyor...');

    const orderDetailChanges = this.stateManager.saveStep1Changes();

    const totalChanges =
      orderDetailChanges.added.length +
      orderDetailChanges.modified.length +
      orderDetailChanges.deleted.length;

    if (totalChanges === 0 && this.orderDetails.length > 0) {
      orderDetailChanges.added = [...this.orderDetails];
      orderDetailChanges.modified = [];
      orderDetailChanges.deleted = [];
    }

    const orderOperation = this.getOrderOperation();

    orderOperation
      .pipe(
        switchMap((orderResponse) => {
          if (orderResponse && orderResponse.id && this.order) {
            this.order.id = orderResponse.id;
            this.repositoryService.setOrderId(orderResponse.id);
          }
          if (this.tempFile) {
            return this.repositoryService
              .uploadFile(this.tempFile, orderResponse.id)
              .pipe(
                switchMap(() =>
                  this.processOrderDetailChanges(
                    orderDetailChanges,
                    orderResponse.id
                  )
                )
              );
          } else {
            return this.processOrderDetailChanges(
              orderDetailChanges,
              orderResponse.id
            );
          }
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (result) => {
          this.invoiceUploaded.emit();
          this.toastService.success('Değişiklikler başarıyla kaydedildi');

          this.stateManager.markStep1AsSaved();

          this.localService.saveStep1Data(
            this.order,
            this.orderDetails,
            !!this.tempFile,
            this.tempFile?.name
          );
        },
        error: (error) => {
          this.toastService.error(
            'İşlem sırasında hata oluştu: ' + (error.message || error)
          );
        },
      });
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

  private processOrderDetailChanges(
    changes: any,
    orderId: string
  ): Observable<any> {
    const totalOperations =
      changes.added.length + changes.modified.length + changes.deleted.length;

    if (totalOperations === 0) {
      return of(null);
    }

    return this.repositoryService.bulkUpdateOrderDetails(changes, orderId).pipe(
      tap((response) => {
        // Backend'den gelen güncel OrderDetail listesi ile sync et
        if (
          response &&
          response.order_details &&
          Array.isArray(response.order_details)
        ) {
          this.syncComponentWithBackendData(response.order_details);
        }
      })
    );
  }

  updateOrderDetail(event: { item: OrderDetail; data: any }): void {
    const { item, data } = event;
    if (!this.orderDetails?.length) return;

    const index = this.orderDetails.findIndex((detay) => detay.id === item.id);
    if (index !== -1) {
      const updatedDetail = { ...this.orderDetails[index], ...data };
      this.orderDetails[index] = updatedDetail;
      this.genericTable.dataSource.data = [...this.orderDetails];
      this.calculateTotals();

      this.stateManager.updateOrderDetail(updatedDetail);

      this.triggerAutoSave('user-action');
    }
  }

  deleteOrderDetail(id: string): void {
    const index = this.orderDetails.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      this.orderDetails = this.orderDetails.filter(
        (item: any) => item.id !== id
      );
      this.genericTable.dataSource.data = [...this.orderDetails];
      this.calculateTotals();

      this.stateManager.deleteOrderDetail(id);

      this.triggerAutoSave('user-action');
    }
  }

  forceSaveStep1(): void {
    if (this.order && this.orderDetails.length > 0) {
      this.autoSaveService.forceSave(1, {
        order: this.order,
        orderDetails: this.orderDetails,
        hasFile: !!this.tempFile,
        fileName: this.tempFile?.name,
      });

      this.toastService.success('Veriler zorla kaydedildi');
    }
  }

  resetComponentState(): void {
    try {
      this.order = null;
      this.orderDetails = [];
      this.file = null;
      this.tempFile = null;
      this.totalWeight = 0;

      this.isLoading = false;
      this.excelUpload = false;
      this.dataRefreshInProgress = false;

      this.uploadForm.reset();

      if (this.genericTable?.dataSource) {
        this.genericTable.dataSource.data = [];
      }

      this.lastFormState = '';
      this.stateManager.resetAllStates();

    } catch (error) {

    }
  }

  private setupFormValidation(): void {
    this.uploadForm = this._formBuilder.group({
      fileInput: ['', [Validators.required, this.fileValidator]],
      orderName: ['', Validators.required],
      orderDate: ['', Validators.required],
      companyRelation: ['', Validators.required],
      truck: ['', Validators.required],
      weightType: ['', Validators.required],
    });
  }

  compareObjects(a: any, b: any): boolean {
    if (!a || !b) return false;
    return a.id === b.id;
  }

  compareCompanies(a: any, b: any): boolean {
    if (!a || !b) return false;
    return a.id === b.id || a.target_company_name === b.target_company_name;
  }

  compareWeightTypes(a: string, b: string): boolean {
    return a === b;
  }

  isFormValid(): boolean {
    return !!(
      this.order?.date &&
      this.order?.company_relation &&
      this.order?.truck &&
      this.order?.weight_type &&
      this.orderDetails
    );
  }

  private syncComponentWithBackendData(
    backendOrderDetails: OrderDetail[]
  ): void {
    this.orderDetails = backendOrderDetails;

    if (this.genericTable && this.genericTable.dataSource) {
      this.genericTable.dataSource.data = [...this.orderDetails];
      this.genericTable.dataSource._updateChangeSubscription();
    }
    if (this.order)
      this.stateManager.initializeStep1(
        this.order,
        this.orderDetails,
        !!this.tempFile,
        this.tempFile?.name
      );

    this.calculateTotals();
  }
}

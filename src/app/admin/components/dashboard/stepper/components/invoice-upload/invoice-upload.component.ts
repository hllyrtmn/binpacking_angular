import { Component, EventEmitter, inject, OnInit, Output, ViewChild } from '@angular/core';
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
import { Observable, switchMap, tap, finalize } from 'rxjs';

import { RepositoryService } from '../../services/repository.service';
import { ToastService } from '../../../../../../services/toast.service';
import { OrderDetailService } from '../../../../services/order-detail.service';
import { OrderService } from '../../../../services/order.service';
import { Order } from '../../../../../../models/order.interface';
import { OrderDetail } from '../../../../../../models/order-detail.interface';
import { GenericTableComponent } from '../../../../../../components/generic-table/generic-table.component';
import { OrderDetailAddDialogComponent } from './order-detail-add-dialog/order-detail-add-dialog.component';

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
  //TODO: manual eklerken default order olusacak ve panelde order bilgisi o anda isaretlenip guncellenebilecek bu kismin tek eksigi bu kaldi
  // Form ve state değişkenleri
  // save changes methodu eklenecek
  // bu method base component veya turevi bir yapiya eklenim kalitilabilir.
  // suanlik dumduz yazilacak.
  // backend deki orm mantigi uidaki modellere islenirse
  // save chagnes ozelligi generic olarak parent class a eklenebilir
  // inherit edilebilir.


  // kaydet butonu kaldirilmasi
  // save changes durumuna gore davranis saglanmasi
  //
  uploadForm: FormGroup;
  file: File | null = null;
  tempFile: File | null = null;
  order!: Order;
  orderDetails: OrderDetail[] = [];
  totalWeight: number = 0;
  isLoading = false;
  excelUpload = false;
  dataRefreshInProgress = false;

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
    'count': 'Adet',
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
      fileInput: ['', [Validators.required, this.fileValidator]]
    });
  }

  ngOnInit(): void {
    // Sipariş varsa, detayları yükle
    if (this.order?.id) {
      this.calculateTotals();
    }
  }

  /**
   * Dosya doğrulaması için bir validator fonksiyonu
   */
  private fileValidator = (control: AbstractControl): ValidationErrors | null => {
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

  /**
   * Tarihi formatlayan yardımcı fonksiyon
   */
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

    // Geçersiz tarih kontrolü
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }

    // Türkçe tarih formatı: GG.AA.YYYY
    return `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getFullYear()}`;
  }

  /**
   * Dosya seçildiğinde tetiklenen olay işleyicisi
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.validateFile(this.file);
    }
  }

  /**
   * Seçilen dosyanın geçerliliğini kontrol eder
   */
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

  /**
   * Dosya input'unu sıfırlar
   */
  private resetFileInput(): void {
    this.file = null;
    this.uploadForm.get('fileInput')?.reset();
  }

  /**
   * Seçilen dosyayı yükler ve işler
   */
  uploadFile(): void {
    if (!this.file) {
      this.toastService.warning('Lütfen bir dosya seçin.');
      return;
    }

    this.isLoading = true;
    this.excelUpload = true;
    this.toastService.info('Dosya yükleniyor...');

    this.repositoryService.processFile(this.file).pipe(
      tap(() => {
        this.toastService.info('Dosya işleniyor...');
      }),
      finalize(() => {
        this.isLoading = false;
        this.excelUpload = false;
      })
    ).subscribe({
      next: (response) => {
        this.orderDetails = response.orderDetail;
        this.order = response.order;
        this.calculateTotals();
        this.toastService.success('Dosya İşlendi');
        this.resetForm();
      },
      error: (error) => {
        this.toastService.error('Dosya işlenirken bir hata oluştu.', error);
      }
    });
  }

  /**
   * Formu sıfırlar
   */
  private resetForm(): void {
    this.tempFile = this.file;
    this.file = null;
    this.uploadForm.reset();
  }

  /**
   * Toplam ağırlığı hesaplar
   */
  calculateTotals(): void {
    try {
      this.totalWeight = this.orderDetails.reduce((sum, detail) => {
        // Ürün ağırlığını güvenli bir şekilde al
        const productWeight = detail.product?.weight_type?.std || 0;
        const count = detail.count || 1;
        return sum + (productWeight * count);
      }, 0);
    } catch (error) {
      console.error('Ağırlık hesaplanırken hata oluştu:', error);
      this.totalWeight = 0;
    }
  }

  /**
   * Yeni sipariş detayı oluşturur
   */
  createOrderDetail(): void {
    if (!this.order) {
      this.orderService.createOrder().subscribe({
        next: (response) => {
          this.order = response;
          this.openOrderDetailDialog(this.order);
        },
        error: (error) => {
          this.toastService.error('Sipariş oluşturulurken bir hata oluştu.');
        },
      });
    } else {
      this.openOrderDetailDialog(this.order);
    }
  }

  /**
   * Sipariş detay ekleme dialogunu açar
   */
  openOrderDetailDialog(order: Order): void {
    const dialogRef = this.dialog.open(OrderDetailAddDialogComponent, {
      width: '600px',
      data: order,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result && result.orderDetail) {
          // Veri kaynağına yeni detayı ekle
          this.genericTable.dataSource.data.unshift(result.orderDetail);
          this.genericTable.dataSource._updateChangeSubscription();

          // Toplamları güncelle
          this.calculateTotals();
          this.toastService.success('Sipariş detayı başarıyla eklendi.');
        }
      },
      error: (err) => {
        console.error('Dialog kapatılırken hata oluştu:', err);
      }
    });
  }

  /**
   * Siparişi ve detaylarını kaydeder
   */
  submit(): void {
    if (!this.order || this.orderDetails.length === 0) {
      this.toastService.warning('Sipariş detayları eksik. Lütfen kontrol ediniz.');
      return;
    }

    const formattedOrder = {
      id: this.order.id,
      company_relation_id: this.order.company_relation.id,
      date: this.order.date,
      weigth_type: this.order.weigth_type,
      name: this.order.name
    };

    this.isLoading = true;
    this.toastService.info('İşlem gerçekleştiriliyor...');

    this.orderService.create(formattedOrder).pipe(
      switchMap((orderResponse) => {
        this.repositoryService.setOrderId(orderResponse.id);

        // OrderDetails'i, WriteSerializer formatına uygun olarak dönüştür
        const formattedOrderDetails = this.orderDetails.map(detail => ({
          order_id: orderResponse.id,
          product_id: detail.product.id,
          count: detail.count,
          unit_price: detail.unit_price
        }));

        // Dosya varsa önce yükle, sonra detayları kaydet
        if (this.tempFile) {
          return this.repositoryService.uploadFile(this.tempFile, orderResponse.id).pipe(
            switchMap(() => this.repositoryService.bulkOrderDetail(formattedOrderDetails))
          );
        } else {
          return this.repositoryService.bulkOrderDetail(formattedOrderDetails);
        }
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (result) => {
        this.invoiceUploaded.emit();
        this.toastService.success('İşlem başarıyla tamamlandı');
      },
      error: (error) => {
        console.error('İşlem sırasında hata oluştu:', error);
        this.toastService.error('İşlem sırasında hata oluştu');
      }
    });
  }

  /**
   * Sipariş detayını günceller
   */
  updateOrderDetail(event: { item: OrderDetail, data: any }): void {
    const { item, data } = event;
    if (!this.orderDetails?.length) return;

    const index = this.orderDetails.findIndex(detay => detay.id === item.id);
    if (index !== -1) {
      // Mevcut öğeyi güncelle
      this.orderDetails[index] = { ...this.orderDetails[index], ...data };
      this.genericTable.dataSource.data = [...this.orderDetails]; // İmmutable güncelleme
      this.calculateTotals();
    }
  }

  /**
   * Sipariş detayını siler
   */
  deleteOrderDetail(id: string): void {
    const index = this.orderDetails.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      this.orderDetails = this.orderDetails.filter((item: any) => item.id !== id);
      this.genericTable.dataSource.data = [...this.orderDetails]; // İmmutable güncelleme
      this.calculateTotals();
    }
  }
}

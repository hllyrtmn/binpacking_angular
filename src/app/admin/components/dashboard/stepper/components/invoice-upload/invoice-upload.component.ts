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
import { RepositoryService } from '../../services/repository.service';
import { Observable, switchMap, tap, catchError, of, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../../../../services/toast.service';
import { GenericTableComponent } from '../../../../../../components/generic-table/generic-table.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { OrderDetailService } from '../../../../services/order-detail.service';
import { OrderService } from '../../../../services/order.service';
import { Order } from '../../../../../../models/order.interface';
import { OrderDetail } from '../../../../../../models/order-detail.interface';
import { OrderDetailAddDialogComponent } from './order-detail-add-dialog/order-detail-add-dialog.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-invoice-upload',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatStepperModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    CommonModule,
    GenericTableComponent,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDialogModule,
    MatDividerModule,
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './invoice-upload.component.html',
  styleUrl: './invoice-upload.component.scss',
})
export class InvoiceUploadComponent implements OnInit {
  @Output() invoiceUploaded: EventEmitter<any> = new EventEmitter<any>();
  @Output() orderDataRefreshed: EventEmitter<void> = new EventEmitter<void>();

  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent<any>;

  private _formBuilder = inject(FormBuilder);
  private repositoryService = inject(RepositoryService);
  private toastService = inject(ToastService);
  orderDetailService = inject(OrderDetailService);
  orderService = inject(OrderService);
  dialog = inject(MatDialog);

  uploadForm: FormGroup;
  file: File | null = null;
  order!: Order;
  orderDetails: OrderDetail[] = [];
  totalWeight: number = 0;
  isLoading = false;
  excelUpload = false;
  manualAdd = false;
  dataRefreshInProgress = false;

  displayedColumns: string[] = [
    'product.product_type.type',
    'product.product_type.code',
    'product.dimension.width',
    'product.dimension.depth',
    'count',
    'weight'
  ];

  filterableColumns: string[] = [
    'product.product_type.type',
    'product.product_type.code',
    'product.dimension.width',
    'product.dimension.depth',
    'count',
    'weight'
  ];

  nestedDisplayColumns: { [key: string]: string } = {
    'product.product_type.type': 'Ürün Tipi',
    'product.product_type.code': 'Ürün Kodu',
    'product.dimension.width': 'Genişlik',
    'product.dimension.depth': 'Derinlik',
    count: 'Adet',
    weight: 'Ağırlık'
  };

  constructor() {
    this.uploadForm = this._formBuilder.group({
      fileInput: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Siparişimiz varsa, detayları yükle
    if (this.order?.id) {
      this.refreshOrderData();
    }
  }

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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.validateFile(this.file);
    }
  }

  validateFile(file: File): void {
    const validTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      this.toastService.error(
        'Geçersiz dosya türü. Lütfen bir PDF veya Excel dosyası yükleyin.'
      );
      this.file = null;
      this.uploadForm.get('fileInput')?.reset();
      return;
    }

    if (file.size > maxSize) {
      this.toastService.error('Dosya boyutu 10 MB sınırını aşıyor.');
      this.file = null;
      this.uploadForm.get('fileInput')?.reset();
      return;
    }
    this.toastService.success('Dosya başarıyla seçildi.');
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
      .uploadFile(this.file)
      .pipe(
        tap((response) => {
          this.order = response.order;
          this.repositoryService.setOrderId(response.order.id);
          this.toastService.success('Dosya başarıyla yüklendi.');
          this.toastService.info('Dosya işleniyor...');
        }),
        switchMap((response) =>
          this.processFile(response.id).pipe(
            tap(() => {
              this.toastService.success('Dosya başarıyla işlendi.');
              this.resetForm();
            })
          )
        ),
        switchMap(() => {
          // Tüm veriyi tek seferde yenile
          return this.refreshOrderData();
        }),
        finalize(() => {
          this.isLoading = false;
          this.excelUpload = false;
        })
      )
      .subscribe({
        next: () => {
          this.invoiceUploaded.emit();
        },
        error: (error) => {
          this.toastService.error('Dosya işlenirken bir hata oluştu.');
          console.error('Dosya işleme hatası:', error);
        },
      });
  }

  private processFile(fileId: string): Observable<{ status: string }> {
    return this.repositoryService.processFile(fileId);
  }

  private resetForm(): void {
    this.file = null;
    this.uploadForm.reset();
  }

  /**
   * Sipariş detaylarını ve tablo verilerini tek bir metodla günceller.
   * Gereksiz çağrıları önlemek için bir bayrak kullanır.
   */
  refreshOrderData(): Observable<any> {
    // Zaten bir güncelleme devam ediyorsa ve yeni bir güncelleme isteği geldiyse,
    // mevcut güncellemeyi iptal etmeden devam et
    if (this.dataRefreshInProgress) {
      console.log('Veri zaten güncelleniyor, bu istek atlanacak');
      return of(null);
    }
    const params = { order_id: this.order.id?.toString() || '' };
    this.dataRefreshInProgress = true;

    return this.orderDetailService.getAll(params).pipe(
      tap((response) => {
        // Page<OrderDetail> içinden diziye erişim
        if (response && response.results) {
          this.orderDetails = response.results || [];
          this.calculateTotals();
        } else if (response && response.results) {
          // Eğer API farklı bir format döndürüyorsa (Page yerine results kullanıyorsa)
          this.orderDetails = response.results || [];
          this.calculateTotals();
        }

        // Tablonun manuel olarak yenilenmesi gerekiyorsa ve tablo referansı alındıysa
        // Bu kısmı dikkatli kullanın - tabloyu yenilemenin başka bir yolu varsa, o tercih edilebilir
        if (this.genericTable && typeof this.genericTable.loadData === 'function') {
          console.log('Tablo verileri güncelleniyor...');
          // Yalnızca gerekiyorsa bu satırı aktif edin - genellikle gerekli değildir
          // çünkü tablonuz zaten aynı service'i kullanıyor olmalı
          // this.genericTable.loadData();
        }

        this.orderDataRefreshed.emit();
      }),
      catchError(error => {
        this.toastService.error('Sipariş detayları güncellenirken hata oluştu');
        console.error('Sipariş detayları güncelleme hatası:', error);
        return of(null);
      }),
      finalize(() => {
        this.dataRefreshInProgress = false;
      })
    );
  }

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

  addOrderDetail(): void {
    this.manualAdd = true;

    if (!this.order) {
      // Eğer order yoksa, önce bir order oluşturmamız gerekiyor
      this.orderService.createOrder().subscribe({
        next: (response) => {
          this.order = response;
          // Şimdi order var, dialog açılabilir
          this.openOrderDetailDialog(this.order);
        },
        error: (error) => {
          this.toastService.error('Sipariş oluşturulurken bir hata oluştu.');
          this.manualAdd = false;
        },
      });
    } else {
      // Zaten bir order var, doğrudan dialog açılabilir
      this.openOrderDetailDialog(this.order);
    }
  }

  openOrderDetailDialog(order: Order): void {
    const dialogRef = this.dialog.open(OrderDetailAddDialogComponent, {
      width: '600px',
      data: order,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        this.manualAdd = false;

        if (result) {
          // result geçerli ise sipariş detayı oluştur
          this.orderDetailService.create(result).subscribe({
            next: (response) => {
              this.toastService.success('Sipariş detayı başarıyla eklendi.');

              // Tek bir metot ile hem tablo verisini hem de özet bilgileri güncelle
              // Bu, gereksiz API çağrılarını önler
              this.refreshOrderData().subscribe();
            },
            error: (error) => {
              console.error('Sipariş detayı eklenirken hata:', error);
              this.toastService.error(
                'Sipariş detayı eklenirken bir hata oluştu.'
              );
            },
          });
        }
      },
      error: (err) => {
        this.manualAdd = false;
        console.error('Dialog kapatılırken hata oluştu:', err);
      }
    });
  }

  onTableUpdate(event: any): void {
    console.log('Tablo güncellendi:', event);
    // Tablodaki bir değişiklik olduğunda, tüm verileri yenile
    this.refreshOrderData().subscribe();
  }
}

export function FileValidator(): (
  control: AbstractControl
) => ValidationErrors | null {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No file selected
    }

    const validTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!validTypes.includes(control.value.type)) {
      return { invalidFileType: true }; // Invalid file type
    }
    if (control.value.size > maxSize) {
      return { fileTooLarge: true }; // File size exceeds limit
    }

    return null; // Validation passed
  };
}

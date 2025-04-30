import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { MatStepperIntl, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RepositoryService } from '../../services/repository.service';
import { Observable, switchMap, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IInvoiceOrderDetail } from '../../../../../../models/component-models/invoice-order-detail.interface';
import { ModelTableComponent } from '../../../../../../components/model-table/model-table.component';
import { ToastService } from '../../../../../../services/toast.service';
import { StepperStore } from '../../services/stepper.store';
import { GenericTableComponent } from '../../../../../../components/generic-table/generic-table.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { OrderDetailService } from '../../../../services/order-detail.service';
import { OrderService } from '../../../../services/order.service';
import { Order } from '../../../../../../models/order.interface';
import { OrderDetailAddDialogComponent } from './order-detail-add-dialog/order-detail-add-dialog.component';

@Component({
  selector: 'app-invoice-upload',
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
    MatDialogModule
  ],
  templateUrl: './invoice-upload.component.html',
  styleUrl: './invoice-upload.component.scss',
})
export class InvoiceUploadComponent implements OnInit {
  @Output() invoiceUploaded: EventEmitter<any> = new EventEmitter<any>();
  // file upload islemi ile ilgili bilgiler orada gosterilecek
  private _formBuilder = inject(FormBuilder);
  private repositoryService = inject(RepositoryService);
  private toastService = inject(ToastService);
  orderDetailService = inject(OrderDetailService)
  orderService = inject(OrderService)
  dialog = inject(MatDialog)

  uploadForm: FormGroup;
  file: File | null = null;
  order!: Order;
  isLoading = false;
  excelUpload = false;
  manualAdd = false;

  displayedColumns: string[] = [
    'product.product_type.type',
    'product.product_type.code',
    'product.dimension.width',
    'product.dimension.depth',
    'count'
  ];

  filterableColumns: string[] = [
    'product.product_type.type',
    'product.product_type.code',
    'product.dimension.width',
    'product.dimension.depth',
    'count'
  ];

  nestedDisplayColumns: { [key: string]: string } = {
    'product.product_type.type': 'Ürün Tipi',
    'product.product_type.code': 'Ürün Kodu',
    'product.dimension.width': 'Genişlik',
    'product.dimension.depth': 'Derinlik',
    'count' : 'Adet'
  };

  constructor() {
    this.uploadForm = this._formBuilder.group({
      fileInput: ['', Validators.required],
      //TODO buraya validator gelecek customfilevalidator
      // dosya tipi kontrol edilecek
    });

  }

  ngOnInit(): void { }

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

    this.isLoading = true; // Yükleme göstergesini aktifleştir
    this.toastService.info('Dosya yükleniyor...');

    this.repositoryService
      .uploadFile(this.file)
      .pipe(
        tap((response) => {
          // string'i number'a çeviriyoruz (MongoDB ID ise string olarak bırakabilirsiniz)
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
        switchMap(() => this.repositoryService.orderDetails(this.order.id?.toString() || ''))
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.invoiceUploaded.emit();
          // Table kendini otomatik güncelleyecek (ngOnChanges sayesinde)
        },
        error: (error) => {
          this.isLoading = false;
          this.toastService.error('Dosya işlenirken bir hata oluştu.');
        }
      });
  }

  private processFile(fileId: string): Observable<{ status: string }> {
    return this.repositoryService.processFile(fileId);
  }

  private resetForm(): void {
    this.file = null;
    this.uploadForm.reset();
  }

  calculatePackage() {
    console.log();
  }

  addOrderDetail(): void {
    if (!this.order) {
      // Eğer order_id yoksa, önce bir order oluşturmamız gerekiyor
      this.orderService.createOrder().subscribe({
        next: (response) => {
          this.order = response;
          // Şimdi order_id var, dialog açılabilir
          this.openOrderDetailDialog(this.order);
        },
        error: (error) => {
          this.toastService.error('Sipariş oluşturulurken bir hata oluştu.');
        }
      });
    } else {
      // Zaten bir order_id var, doğrudan dialog açılabilir
      this.openOrderDetailDialog(this.order);
    }
  }

  openOrderDetailDialog(order: Order): void {
    const dialogRef = this.dialog.open(OrderDetailAddDialogComponent, {
      width: '600px',
      data: order
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result) {
          console.log('Dialog sonucu:', result);

          // result geçerli ise sipariş detayı oluştur
          this.orderDetailService.create(result).subscribe({
            next: (response) => {
              this.toastService.success('Sipariş detayı başarıyla eklendi.');
            },
            error: (error) => {
              console.error('Sipariş detayı eklenirken hata:', error);
              this.toastService.error('Sipariş detayı eklenirken bir hata oluştu.');
            }
          });
        }
      },
      error: (err) => {
        console.error('Dialog kapatılırken hata oluştu:', err);
      },
      complete: () => {
        console.log('Dialog kapatma işlemi tamamlandı.');
      }
    });
  }

  onTableUpdate(event: any): void {
    console.log('Tablo güncellendi:', event);
    // Gerekirse burada ek işlemler yapabilirsiniz
  }
}

export function FileValidator(): (control: AbstractControl) => ValidationErrors | null {
  return (control: AbstractControl): ValidationErrors | null => {

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

    if (!control.value) {
      return null; // No file selected
    }
    return null; // Validation passed
  }
}

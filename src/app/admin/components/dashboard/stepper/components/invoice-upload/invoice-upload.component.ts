import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RepositoryService } from '../../services/repository.service';
import { Observable, switchMap, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { mapToOrderDetailDtoList } from '../../../../../../models/mappers/order-detail.mapper';
import { IInvoiceOrderDetail } from '../../../../../../models/component-models/invoice-order-detail.interface';
import { ModelTableComponent } from '../../../../../../components/model-table/model-table.component';
import { ToastService } from '../../../../../../services/toast.service';

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
    ModelTableComponent,
  ],
  templateUrl: './invoice-upload.component.html',
  styleUrl: './invoice-upload.component.scss',
})
export class InvoiceUploadComponent implements OnInit {
  // file upload islemi ile ilgili bilgiler orada gosterilecek
  private _formBuilder = inject(FormBuilder);
  private repositoryService = inject(RepositoryService);
  private toastService = inject(ToastService);

  uploadForm: FormGroup;
  file: File | null = null;

  invoiceOrderDetail: IInvoiceOrderDetail[] = [];
  dataSource = new MatTableDataSource<IInvoiceOrderDetail>(
    this.invoiceOrderDetail
  );
  displayedColumns: string[] = [
    'type',
    'code',
    'width',
    'depth',
    'count',
    'meter',
    'action',
  ];

  constructor() {
    this.uploadForm = this._formBuilder.group({
      fileInput: ['', Validators.required],
      //TODO buraya validator gelecek customfilevalidator
      // dosya tipi kontrol edilecek
    });
  }

  ngOnInit(): void {}

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
    let order_id: string = '';

    this.toastService.info('Dosya yükleniyor...');
    this.repositoryService
      .uploadFile(this.file)
      .pipe(
        tap((response) => {
          order_id = response.order;
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
        switchMap(() => this.repositoryService.orderDetails(order_id))
      )
      .subscribe((response)=> {
        this.dataSource.data = response;
      });
  }

  private processFile(fileId: string): Observable<{ status: string }> {
    return this.repositoryService.processFile(fileId);
  }

  private resetForm(): void {
    this.file = null;
    this.uploadForm.reset();
  }

  onEdit(model: IInvoiceOrderDetail) {
    console.log('Edit model:', model);
  }
  onDelete(id: string) {
    this.repositoryService.deleteOrderDetail(id).subscribe({
      next: () => {
        this.toastService.success('Başarıyla silindi.');
        this.dataSource.data = this.dataSource.data.filter(item => item.id !== id);


      },
    });
  }
}

import { Component, inject, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
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
import { FileResponse } from '../../interfaces/file-response.interface';
import { Observable, switchMap, tap } from 'rxjs';
import { OrderDetail } from '../../../../../../models/order-detail.interface';
import { CommonModule } from '@angular/common';

export interface PeriodicElement {
  no: number;
  count: number;
  weight: number;
  width: number;
  depth1: number;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { no: 1, count: 120, weight: 1.0079, width: 9.0122, depth1: 1.0019 },
  { no: 2, count: 145, weight: 4.0026, width: 9.0122, depth1: 1.0029 },
  { no: 3, count: 55, weight: 6.941, width: 9.0122, depth1: 1.0039 },
  { no: 4, count: 45, weight: 9.0122, width: 9.0122, depth1: 1.0049 },
  { no: 5, count: 22, weight: 10.811, width: 9.0122, depth1: 1.0079 },
];

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
  ],
  templateUrl: './invoice-upload.component.html',
  styleUrl: './invoice-upload.component.scss',
})
export class InvoiceUploadComponent {
  // toast service eklenecek
  // file upload islemi ile ilgili bilgiler orada gosterilecek

  file: File = new File([], '');
  repositoryService: RepositoryService = inject(RepositoryService);

  displayedColumns1: string[] = [
    'product.product_type.type',
    'product.product_type.code',
    'product.dimension.width',
    'product.dimension.depth',
    'count',
    'action',
  ];
  displayedColumns: string[] = [
    'product_type',
    'product_code',
    'width',
    'depth',
    'count',
    'meter',
  ];
  clickedRows = new Set<OrderDetail>();
  orderDetails: OrderDetail[] = [];
  dataSource = new MatTableDataSource<OrderDetail>(this.orderDetails);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
    }
  }

  uploadFile(file: File) {
    this.repositoryService
      .uploadFile(file)
      .pipe(
        tap((response) => {
          this.repositoryService.setOrderId(response.order || ''); // bu zaten doğru
        }),
        switchMap((response) => {
          return this.processFile(response.id);
        })
      )
      .subscribe({
        next: (response) => {
          this.orderDetails =
            this.repositoryService.orderDetailResource.value().results;
          console.log(this.orderDetails);
          console.log(this.dataSource);
          this.dataSource.data = this.orderDetails;
        },
        error: (err) => {
          console.error(' Hata:', err);
          this.repositoryService.addErrors(err);
        },
      });
  }

  processFile(file_id: string): Observable<{ status: string }> {
    return this.repositoryService.processFile(file_id);
  }

  private _formBuilder = inject(FormBuilder);
  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required],
  });
}

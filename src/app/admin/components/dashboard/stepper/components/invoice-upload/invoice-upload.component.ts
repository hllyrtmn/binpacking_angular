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
import { MatTableModule } from '@angular/material/table';
import { RepositoryService } from '../../services/repository.service';
import { FileResponse } from '../../interfaces/file-response.interface';
import { Observable, switchMap, tap } from 'rxjs';

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
  ],
  templateUrl: './invoice-upload.component.html',
  styleUrl: './invoice-upload.component.scss',
})
export class InvoiceUploadComponent {
  // toast service eklenecek
  // file upload islemi ile ilgili bilgiler orada gosterilecek

  file: any = null;
  repositoryService: RepositoryService = inject(RepositoryService);

  displayedColumns: string[] = ['no', 'count', 'weight', 'width', 'depth1'];
  dataSource = ELEMENT_DATA;
  clickedRows = new Set<PeriodicElement>();

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
          this.repositoryService.setOrderId(response.id);
        }),
        switchMap((response) => {
          return this.processFile(response.file);
        })
      )
      .subscribe((response) => {
        console.log(this.repositoryService.orderDetailResource.value());
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

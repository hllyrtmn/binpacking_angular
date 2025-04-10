import { Component, inject } from '@angular/core';
import {
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
import { ModelTableComponent } from "../../../../../../components/model-table/model-table.component";

export interface PeriodicElement {
  id: number;
  position: number;
  count: number;
  weight: number;
  width: number;
  depth: number;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { id:1 ,position: 1, count: 120, weight: 1.0079, width: 9.0122, depth: 1.0079 },
  { id:2 ,position: 2, count: 145, weight: 4.0026, width: 9.0122, depth: 1.0079 },
  { id:3 , position: 3, count: 55, weight: 6.941, width: 9.0122, depth: 1.0079 },
  { id:4 ,position: 4, count: 45, weight: 9.0122, width: 9.0122, depth: 1.0079 },
  { id:5 ,position: 5, count: 22, weight: 10.811, width: 9.0122, depth: 1.0079 },
];

@Component({
  selector: 'app-pallet-control',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatStepperModule,
    MatButtonModule,
    MatInputModule,
    MatTableModule,
    ModelTableComponent
],
  templateUrl: './pallet-control.component.html',
  styleUrl: './pallet-control.component.scss',
})
export class PalletControlComponent {
  displayedColumns: string[] = [
    'position',
    'count',
    'weight',
    'width',
    'depth',
    'action'
  ];
  dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  clickedRows = new Set<PeriodicElement>();

  private _formBuilder = inject(FormBuilder);

  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });
}

import { Component, inject, Input, OnInit } from '@angular/core';
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
import {MatCardModule} from '@angular/material/card';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  CdkDrag,
  CdkDropList,
} from '@angular/cdk/drag-drop';

export interface Product {
  name: string;
  position: number;
  weight: number;
  price: string;
}

interface Pallet {
  id: string;
  products: Product[];
}

interface Package {
  id: string;
  pallets: Pallet[];
}

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
    MatCardModule,
    CdkDropList, CdkDrag
],
  templateUrl: './pallet-control.component.html',
  styleUrl: './pallet-control.component.scss',
})
export class PalletControlComponent implements OnInit {
  @Input() order_id!: string;

  products: Product[] = [
    {position: 1, name: 'Radiator 1', weight: 1.0079, price: '120H'},
    {position: 2, name: 'Radiator 2', weight: 4.0026, price: '111He'},
    {position: 3, name: 'Radiator 3', weight: 6.941, price: '222Li'},
    {position: 4, name: 'Radiator 4', weight: 9.0122, price: '33Be'},
    {position: 5, name: 'Radiator 5', weight: 10.811, price: '45B'},
    {position: 6, name: 'Radiator 6', weight: 12.0107, price: '67C'},
    {position: 7, name: 'Radiator 7', weight: 14.0067, price: '87N'},
    {position: 8, name: 'Radiator 8', weight: 15.9994, price: '65O'},
    {position: 9, name: 'Radiator 9', weight: 18.9984, price: '43F'},
    {position: 10, name: 'Radiator 10', weight: 20.1797, price: '34Ne'},
  ];


  packages = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];


  pallets = ['Pallet 1', 'Pallet 2', 'Pallet 3', 'Pallet 4', 'Pallet 5', 'Pallet 6', 'Pallet 7', 'Pallet 8', 'Pallet 9', 'Pallet 10'];


  drop1(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.packages, event.previousIndex, event.currentIndex);
  }

  drop(event: CdkDragDrop<Product[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  ngOnInit(): void {
    console.log('Order ID geldi:', this.order_id);
  }

  private _formBuilder = inject(FormBuilder);

  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });
}

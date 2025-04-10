import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ArrayUtils } from '../../helpers/array-utils';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'model-table',
  templateUrl: './model-table.component.html',
  styleUrls: ['./model-table.component.css'],
  imports: [CommonModule, MatTableModule,MatIcon,MatButtonModule],
})
export class ModelTableComponent<T>  {
  rm = ArrayUtils.removeElementFromArray;
  constructor() {
  }
  // ornek olarak ModelTableComponent<Product>
  // oldugu zaman MatTableDataSource<Product> olmus olucak
  @Input() displayedColumns!: string[]
  @Input() dataSource!: MatTableDataSource<T>;
  @Output() deleteModel: EventEmitter<string> = new EventEmitter<string>();
  @Output() editModel: EventEmitter<T> = new EventEmitter<T>();

}

import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ArrayUtils } from 'src/app/helpers/array-utils';
@Component({
  selector: 'model-table',
  templateUrl: './model-table.component.html',
  styleUrls: ['./model-table.component.css']
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

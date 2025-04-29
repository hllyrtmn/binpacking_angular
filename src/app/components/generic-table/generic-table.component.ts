import { Component, OnInit, ViewChild, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GenericCrudService, Page } from '../../services/generic-crud.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';


@Component({
  selector: 'app-generic-table',
  imports: [CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule],
  templateUrl: './generic-table.component.html',
  styleUrl: './generic-table.component.scss'
})
export class GenericTableComponent<T> implements OnInit {
  @Input() service!: GenericCrudService<T>;
  @Input() displayedColumns: string[] = [];
  @Input() title: string = 'Items';
  @Input() editableColumns: string[] = [];
  @Input() filterableColumns: string[] = [];
  @Input() relationOptions: { [key: string]: any[] } = {};
  @Input() nestedDisplayColumns: { [key: string]: string } = {}; // İç içe sütunlar için görünen başlıklar

  @Output() rowClick = new EventEmitter<T>();
  @Output() rowCreated = new EventEmitter<T>();
  @Output() rowUpdated = new EventEmitter<T>();
  @Output() rowDeleted = new EventEmitter<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private dialog = inject(MatDialog);

  dataSource = new MatTableDataSource<T>([]);
  filterControls: { [key: string]: FormControl } = {};
  totalItems: number = 0;
  pageSize: number = 10;
  currentPage: number = 0;
  isLoading: boolean = false;
  editedRow: any = null;
  newItem: any = {};
  isAddingNew: boolean = false;

  // Bu metod template'deki spread operatörünü kaldırmak için
  getDisplayColumnWithActions(): string[] {
    return [...this.displayedColumns, 'actions'];
  }

  ngOnInit(): void {
    // Setup filter controls for each filterable column
    this.filterableColumns.forEach(column => {
      this.filterControls[column] = new FormControl('');
      this.filterControls[column].valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged()
        )
        .subscribe(() => this.loadData());
    });

    this.loadData();
  }



/**
 * Verileri API'den yükleyen metod
 */
loadData(): void {
  this.isLoading = true;

  // Prepare filter parameters
  const params: any = {
    offset: this.currentPage * this.pageSize,
    limit: this.pageSize
  };

  // Add sort parameter if available
  if (this.sort && this.sort.active) {
    params.ordering = `${this.sort.direction === 'desc' ? '-' : ''}${this.sort.active}`;
  }

  // Add filter parameters
  Object.keys(this.filterControls).forEach(key => {
    const value = this.filterControls[key].value;
    if (value !== null && value !== '') {
      params[key] = value;
    }
  });

  console.log('API endpoint:', this.service['apiUrl']);
  console.log('API params:', params);

  this.service.getAll(params).subscribe({
    next: (page: Page<T>) => {
      console.log('API response:', page);
      if (page && 'results' in page && Array.isArray(page.results)) {
        this.dataSource.data = page.results;
        this.totalItems = page.count;
      } else {
        console.error('API yanıtı beklenen formatta değil:', page);
        this.dataSource.data = [];
        this.totalItems = 0;
      }
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error loading data:', error);
      console.error('API endpoint that failed:', this.service['apiUrl']);
      // Show error details in console
      if (error.error) {
        console.error('Error details:', error.error);
      }
      this.isLoading = false;
      this.dataSource.data = [];
      this.totalItems = 0;
    }
  });
}

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData();
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  startEdit(row: any): void {
    this.editedRow = { ...row };
  }

  cancelEdit(): void {
    this.editedRow = null;
    this.loadData();
  }

  saveEdit(id: any): void {
    this.isLoading = true;
    this.service.update(id, this.editedRow).subscribe({
      next: (updatedItem) => {
        this.rowUpdated.emit(updatedItem);
        this.editedRow = null;
        this.loadData();
      },
      error: (error) => {
        console.error('Error updating item:', error);
        this.isLoading = false;
      }
    });
  }

  confirmDelete(id: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: 'Bu öğeyi silmek istediğinizden emin misiniz?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteItem(id);
      }
    });
  }

  deleteItem(id: any): void {
    this.isLoading = true;
    this.service.delete(id).subscribe({
      next: () => {
        this.rowDeleted.emit(id);
        this.loadData();
      },
      error: (error) => {
        console.error('Error deleting item:', error);
        this.isLoading = false;
      }
    });
  }

  addNewRow(): void {
    this.isAddingNew = true;
    this.newItem = {};
  }

  cancelAddNew(): void {
    this.isAddingNew = false;
    this.newItem = {};
  }

  saveNewItem(): void {
    this.isLoading = true;
    this.service.create(this.newItem).subscribe({
      next: (createdItem) => {
        this.rowCreated.emit(createdItem);
        this.isAddingNew = false;
        this.newItem = {};
        this.loadData();
      },
      error: (error) => {
        console.error('Error creating item:', error);
        this.isLoading = false;
      }
    });
  }

  // Helper methods for dealing with relation fields
  getRelationOptions(fieldName: string): any[] {
    return this.relationOptions[fieldName] || [];
  }

  getRelationDisplayValue(fieldName: string, value: any): string {
    if (!value) return '';

    const options = this.getRelationOptions(fieldName);
    const option = options.find(opt => opt.id === value);
    return option ? option.name || option.title || option.code || option.type || option.id : value;
  }

 // Generic Table Component'e eklenmesi/güncellenmesi gereken getNestedPropertyValue metodu

/**
 * İç içe özellik değerlerini alır (örn: "product_type.code")
 * @param obj Ana nesne
 * @param path Nokta notasyonu ile path (ör: "product_type.code")
 * @returns Özellik değeri veya boş string
 */
getNestedPropertyValue(obj: any, path: string): any {
  if (!obj) return '';

  // Path'i parçalara ayır
  const props = path.split('.');
  let value = obj;

  // Her parça için değeri gezin
  for (const prop of props) {
    // Eğer değer null, undefined veya değer[prop] tanımlanmamışsa, boş string döndür
    if (value === null || value === undefined || value[prop] === undefined) {
      return '';
    }
    value = value[prop];
  }

  // Sayısal değerleri formatlamak için kontrol
  if (typeof value === 'number') {
    // Ondalık sayı ise, 2 basamağa yuvarla
    if (value % 1 !== 0) {
      return value.toFixed(2);
    }
  }

  return value;
}

  // Get the display name for a column
  getColumnDisplayName(column: string): string {
    // If it's a nested column and we have a display name for it
    if (this.nestedDisplayColumns && this.nestedDisplayColumns[column]) {
      return this.nestedDisplayColumns[column];
    }

    // Otherwise just use the column name with title case
    return column.replace(/\./g, ' ').split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Set a nested property value
  setNestedPropertyValue(obj: any, path: string, value: any): void {
    if (!obj) return;
    const props = path.split('.');
    const lastProp = props.pop();

    if (!lastProp) return;

    let current = obj;
    for (const prop of props) {
      if (current[prop] === undefined) {
        current[prop] = {};
      }
      current = current[prop];
    }

    current[lastProp] = value;
  }
}

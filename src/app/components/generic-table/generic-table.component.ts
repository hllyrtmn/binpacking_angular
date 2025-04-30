import {
  Component,
  OnInit,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  inject,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { GenericCrudService, Page } from '../../services/generic-crud.service';
import { FilterDialogComponent } from './filter-dialog/filter-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {AddOrUpdateDialogComponent} from './add-or-update-dialog/add-or-update-dialog-component'
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-generic-table',
  imports: [
    CommonModule,
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
    MatTooltipModule,
    MatChipsModule,
    MatButtonToggleModule
  ],
  templateUrl: './generic-table.component.html',
  styleUrl: './generic-table.component.scss',
})
export class GenericTableComponent<T> implements OnInit, AfterViewInit {
  @Input() service!: GenericCrudService<T>;
  @Input() displayedColumns: string[] = [];
  @Input() title: string = 'Items';
  @Input() filterableColumns: string[] = [];
  @Input() relationOptions: { [key: string]: any[] } = {};
  @Input() columnDefinitions: { key: string, label: string, type?: string, required?: boolean }[] = [];
  @Input() nestedDisplayColumns: { [key: string]: string } = {}; // İç içe sütunlar için görünen başlıklar
  @Input() showRowNumbers: boolean = true; // Sıra numaralarını gösterme ayarı
  @Input() showAddButton: boolean = false; // Ekleme butonu gösterme ayarı

  @Output() rowClick = new EventEmitter<T>();
  @Output() rowDeleted = new EventEmitter<any>();
  @Output() addClick = new EventEmitter<void>(); // Yeni ekleme düğmesi tıklama olayı
  @Output() updateItem = new EventEmitter<T>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private dialog = inject(MatDialog);
  private toastService = inject(ToastService)

  dataSource = new MatTableDataSource<T>([]);
  filterValues: { [key: string]: string } = {}; // Aktif filtre değerlerinin izlenmesi
  totalItems: number = 0;
  pageSize: number = 10;
  currentPage: number = 0;
  isLoading: boolean = false;
  currentSortField: string = '';
  currentSortDirection: string = '';

  /**
   * Bir değerin sayısal olup olmadığını kontrol eder
   * @param value Kontrol edilecek değer
   * @returns Sayısal ise true, değilse false
   */
  isNumeric(value: any): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }

    // Değer sayı türündeyse
    if (typeof value === 'number') {
      return true;
    }

    // Değer string ise ve sayıya çevrilebiliyorsa
    if (typeof value === 'string') {
      return !isNaN(Number(value)) && !isNaN(parseFloat(value));
    }

    return false;
  }

  // Bu metod template'deki spread operatörünü kaldırmak için
  getDisplayColumnWithActions(): string[] {
    let columns = [...this.displayedColumns];

    // Eğer sıra numarası gösterilecekse, en başa 'rowNumber' sütununu ekle
    if (this.showRowNumbers) {
      columns = ['rowNumber', ...columns];
    }

    // En sona 'actions' sütununu ekle
    columns.push('actions');

    return columns;
  }

  // Sıra numarası hesaplama metodu
  getRowNumber(index: number): number {
    return this.currentPage * this.pageSize + index + 1;
  }

  // Yeni ekleme düğmesi tıklama işleyicisi
  onAddButtonClick(event: Event): void {
    event.stopPropagation(); // Diğer olayların etkilenmesini engelle
    this.addClick.emit(); // Olayı yukarı ilet
  }

  ngOnInit(): void {
    // Filterablecolumns için filterValues objesini oluştur
    this.filterableColumns.forEach((column) => {
      this.filterValues[column] = '';
    });

    this.loadData();
  }

  ngAfterViewInit() {
    // Sort olayı için listener ekle
    if (this.sort) {
      this.sort.sortChange.subscribe((sort: Sort) => {
        console.log('Sort değişti:', sort);
        this.currentPage = 0; // Sıralama değiştiğinde ilk sayfaya dön
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.currentSortField = sort.active;
        this.currentSortDirection = sort.direction;
        this.loadData();
      });
    }
  }

  /**
   * Sütunlar için filtre dialogu açar
   * @param column Filtre uygulanacak sütun
   */
  openFilterDialog(column: string, event: Event): void {
    event.stopPropagation(); // Sort olayının tetiklenmesini engelle

    // Sütun için mevcut filtre değerini al
    const currentValue = this.filterValues[column] || '';

    // Sütunun görünen adını bul
    const displayName = this.getColumnDisplayName(column);

    // Basit dialog'u aç
    const dialogRef = this.dialog.open(FilterDialogComponent, {
      width: '350px',
      data: {
        column,
        displayName,
        currentValue,
      },
    });

    // Dialog kapandığında sonucu işle
    dialogRef.afterClosed().subscribe((result) => {
      if (result !== null) {
        // null ise iptal edilmiş demektir
        this.filterValues[column] = result;

        // Filtre değiştiğinde ilk sayfaya dön
        this.currentPage = 0;
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }

        this.loadData();
      }
    });
  }

  /**
   * Belirli bir sütun için filtrenin aktif olup olmadığını kontrol eder
   * @param column Kontrol edilecek sütun
   * @returns Filtre aktif mi
   */
  isFilterActive(column: string): boolean {
    return (
      this.filterValues[column] !== undefined &&
      this.filterValues[column] !== null &&
      this.filterValues[column] !== ''
    );
  }

  /**
   * Tüm filtreleri temizler
   */
  clearAllFilters(): void {
    this.filterableColumns.forEach((column) => {
      this.filterValues[column] = '';
    });

    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }

    this.loadData();
  }

  /**
   * Aktif filtreler var mı kontrol eder
   * @returns En az 1 aktif filtre varsa true
   */
  hasActiveFilters(): boolean {
    return Object.values(this.filterValues).some(
      (value) => value !== undefined && value !== null && value !== ''
    );
  }

  /**
   * Verileri API'den yükleyen metod
   * Backend'in filtreleme yapısına uygun parametre gönderir
   */
  loadData(): void {
    this.isLoading = true;

    // Temel parametreler
    const params: any = {
      offset: this.currentPage * this.pageSize,
      limit: this.pageSize,
    };

    // Sıralama parametresi ekle
    if (this.currentSortField && this.currentSortDirection) {
      params.ordering = `${this.currentSortDirection === 'desc' ? '-' : ''}${
        this.currentSortField
      }`;
    } else if (this.sort && this.sort.active) {
      // MatSort'tan sıralama bilgisini al
      params.ordering = `${this.sort.direction === 'desc' ? '-' : ''}${
        this.sort.active
      }`;
    }

    // Filtre değerlerini ekle
    Object.keys(this.filterValues).forEach((key) => {
      const value = this.filterValues[key];
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });

    console.log('API isteği:', this.service['apiUrl'], params);

    this.service.getAll(params).subscribe({
      next: (page: Page<T>) => {
        console.log('API yanıtı:', page);
        if (page && 'results' in page && Array.isArray(page.results)) {
          // Verileri temizle ve yeni verileri ekle
          this.dataSource.data = [];
          setTimeout(() => {
            this.dataSource.data = page.results;
            this.totalItems = page.count;
          }, 0);
        } else {
          console.error('API yanıtı beklenen formatta değil:', page);
          this.dataSource.data = [];
          this.totalItems = 0;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Veri yüklenirken hata:', error);
        this.isLoading = false;
        this.dataSource.data = [];
        this.totalItems = 0;
      },
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

  openAddOrUpdateDialog(row?: T): void {
    // Tabloda gösterilen sütunlara göre dinamik olarak görünür alanları belirle
    let visibleFields: string[] | undefined;

    if (row) {
      // 1. Yöntem: Tabloda gösterilen sütunlar (displayedColumns) kullanarak
      visibleFields = [...this.displayedColumns].filter(col => col !== 'actions');

      // 2. Yöntem: Düzenleme için eğer bazı alanlar her zaman gösterilmesi gerekiyorsa
      // Bu örnekte category.id gibi gösterilmeyen ama düzenlenebilir olması gereken alanlar eklenir
      // const additionalFields = this.getAdditionalEditFields();
      // if (additionalFields.length > 0) {
        visibleFields = [...visibleFields];
      // }
    }
    // Yeni ekleme durumunda tüm alanları göstermek için visibleFields undefined bırakılabilir
    // veya belirli alanlar gösterilmek istenirse burada belirtilebilir

    const dialogRef = this.dialog.open(AddOrUpdateDialogComponent, {
      width: '500px',
      data: {
        row: row, // Düzenleme için mevcut satır verisi
        columns: this.columnDefinitions, // Sütun tanımları
        //options: this.getDialogOptions(), // Dropdown seçeneklerini dinamik olarak al
        visibleFields: visibleFields // Dinamik olarak belirlenen alanlar
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (row) {
          // Mevcut öğeyi güncelle
          this.service.update((row as any).id,row).subscribe({next: () => {
            this.updateItem.emit((result)) // Artık result zaten güncellenmiş nesne
            this.toastService.success('Basari ile guncellendi','Guncellendi')
            //TODO buraya load data demek gerekebilir.
          },
          error: (error) => {
            this.toastService.error('Hata olustu','Guncellenemedi')
            this.isLoading = false;
          },});
        } else {
          // Yeni öğe ekle
          this.addClick.emit(result);
        }
      }
    });
  }

  confirmDelete(id: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: 'Bu öğeyi silmek istediğinizden emin misiniz?' },
    });

    dialogRef.afterClosed().subscribe((result) => {
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
        this.toastService.success("Basari ile silindi","Silindi")
      },
      error: (error) => {
        this.toastService.success("Silinemedi","Hata")

        this.isLoading = false;
      },
    });
  }

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
    // "rowNumber" sütunu için özel isim
    if (column === 'rowNumber') {
      return '#';
    }

    // If it's a nested column and we have a display name for it
    if (this.nestedDisplayColumns && this.nestedDisplayColumns[column]) {
      return this.nestedDisplayColumns[column];
    }

    // Otherwise just use the column name with title case
    return column
      .replace(/\./g, ' ')
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

import {
  Component,
  OnInit,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  inject,
  AfterViewInit,
  SimpleChanges,
  OnChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  TemplateRef,
  HostListener,
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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SelectionModel } from '@angular/cdk/collections';
import { GenericCrudService, Page } from '../../services/generic-crud.service';
import { FilterDialogComponent } from './filter-dialog/filter-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { AddOrUpdateDialogComponent } from './add-or-update-dialog/add-or-update-dialog-component';
import { ToastService } from '../../services/toast.service';
import { AdvancedFilterDialogComponent } from './advanced-filter-dialog/advanced-filter-dialog.component';
import { ColumnSettingsDialogComponent } from './column-settings-dialog/column-settings-dialog.component';
import { ExportService } from './services/export.service';

// Gelişmiş filtre tipi için interface
export interface AdvancedFilter {
  column: string;
  value: any;
  type: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
  valueEnd?: any; // Aralık filtresi için ikinci değer
}

// Kolon formatları için interface
export interface ColumnFormat {
  type?: 'text' | 'number' | 'date' | 'currency' | 'percent' | 'custom';
  format?: string;
  formatter?: (value: any) => string;
  cssClass?: string;
  themeRules?: { condition: (value: any) => boolean; cssClass: string }[];
}

@Component({
  selector: 'app-generic-table',
  standalone: true,
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
    MatButtonToggleModule,
    MatCheckboxModule,
    MatMenuModule,
    DragDropModule,
    ScrollingModule,
  ],
  templateUrl: './generic-table.component.html',
  styleUrls: ['./generic-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericTableComponent<T> implements OnInit, AfterViewInit, OnChanges {
  // Ana Özellikler
  @Input() service!: GenericCrudService<T>;
  @Input() displayedColumns: string[] = [];
  @Input() title: string = 'Items';
  @Input() filterableColumns: string[] = [];
  @Input() relationOptions: { [key: string]: any[] } = {};
  @Input() columnDefinitions: {
    key: string;
    label: string;
    type?: string;
    required?: boolean;
  }[] = [];
  @Input() nestedDisplayColumns: { [key: string]: string } = {}; // İç içe sütunlar için görünen başlıklar
  @Input() showRowNumbers: boolean = true; // Sıra numaralarını gösterme ayarı
  @Input() showAddButton: boolean = true; // Ekleme butonu gösterme ayarı
  @Input() excludeFields: string[] = [];

  // Üst Nesne (Parent) Özellikleri
  @Input() parentId: string | null = null; // Bağlı olduğu üst nesne ID'si
  @Input() useParentId: boolean = false; // Üst nesne ID kullanılacak mı belirteci
  @Input() parentIdFieldName: string = 'order_id'; // API'ye gönderilecek parametre adı

  // Olaylar (Events)
  @Output() rowClick = new EventEmitter<T>();
  @Output() rowDeleted = new EventEmitter<any>();
  @Output() addClick = new EventEmitter<void>(); // Yeni ekleme düğmesi tıklama olayı
  @Output() updateItem = new EventEmitter<T>();
  @Output() itemAdded = new EventEmitter<T>(); // Yeni öğe eklendiğinde tetiklenecek olay
  @Output() bulkActionSelected = new EventEmitter<{ action: string, items: T[] }>(); // Toplu işlemler
  @Output() cellValueChanged = new EventEmitter<{ row: T, column: string, value: any }>(); // Hücre düzenleme

  // Yeni Özellikler
  // 1. Veri Kaynağı Esnekliği
  @Input() externalDataSource: T[] = []; // Dışarıdan veri kaynağı
  @Input() useExternalData: boolean = false; // Dışarıdan gelen veriyi kullan

  // 2. Performans İyileştirmeleri
  @Input() useVirtualScroll: boolean = false; // Sanal kaydırma
  @Input() useLazyLoading: boolean = false; // Tembel yükleme
  @Input() lazyLoadThreshold: number = 200; // Tembel yükleme eşiği (px)
  @Input() pageSize: number = 10; // Sayfa başına öğe sayısı
  @Input() useClientSideProcessing: boolean = false; // İstemci tarafında işleme

  // 3. Satır Seçme ve Toplu İşlemler
  @Input() enableRowSelection: boolean = false; // Satır seçimini etkinleştir
  @Input() showBulkActions: boolean = false; // Toplu işlemleri göster

  // 4. Sütun Ayarları
  @Input() allowColumnToggle: boolean = false; // Sütun görünürlüğü değiştirme
  @Input() hiddenColumns: string[] = []; // Gizli sütunlar
  @Input() allowColumnReordering: boolean = false; // Sütun sırasını değiştirme

  // 5. Dışa Aktarma
  @Input() enableExport: boolean = false; // Dışa aktarma özelliği
  @Input() exportFilename: string = 'table-data'; // Dışa aktarma dosya adı

  // 6. Genişletilmiş Satırlar
  @Input() expandableRows: boolean = false; // Genişletilebilir satırlar
  @Input() rowDetailTemplate: TemplateRef<any> | undefined; // Detay şablonu

  // 7. İleri Düzey Filtreleme
  @Input() advancedFilters: AdvancedFilter[] = []; // Gelişmiş filtreler
  @Input() useServerSideSearch: boolean = false; // Sunucu tarafında arama
  @Input() searchFields: string[] = []; // Arama alanları

  // 8. Özel Formatlar
  @Input() columnFormats: { [key: string]: ColumnFormat } = {}; // Sütun formatları

  // 9. İnline Düzenleme
  @Input() editableColumns: string[] = []; // Düzenlenebilir sütunlar

  // 10. Durumu Kaydetme
  @Input() tableStateId: string = ''; // Tablo durumu ID'si
  @Input() saveTableState: boolean = false; // Tablo durumunu kaydet

  // 11. Duyarlı Tasarım
  @Input() responsiveBreakpoint: number = 768; // Duyarlı tasarım noktası
  @Input() stackedCardViewOnMobile: boolean = false; // Mobilde kart görünümü

  // ViewChild'lar
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  // Dependency Injection
  private dialog = inject(MatDialog);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private exportService = inject(ExportService);

  // Bileşen Durumu
  dataSource = new MatTableDataSource<T>([]);
  filterValues: { [key: string]: string } = {}; // Aktif filtre değerlerinin izlenmesi
  totalItems: number = 0;
  currentPage: number = 0;
  currentPageSize: number = 10;
  isLoading: boolean = false;
  currentSortField: string = '';
  currentSortDirection: string = '';
  selection = new SelectionModel<T>(true, []); // Çoklu seçim
  expandedElement: T | null = null; // Genişletilmiş satır
  editingCell: { rowId: any, column: string } | null = null; // Düzenlenen hücre
  isMobileView: boolean = false; // Mobil görünüm
  globalSearchTerm: string = ''; // Global arama terimi
  allDataLoaded: boolean = false; // Tüm veri yüklendi mi

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
    let columns = [...this.getVisibleColumns()];

    // Seçim sütunu ekle
    if (this.enableRowSelection) {
      columns = ['select', ...columns];
    }

    // Sıra numarası gösterilecekse ekle
    if (this.showRowNumbers) {
      columns = ['rowNumber', ...columns];
    }

    // En sona 'actions' sütununu ekle
    columns.push('actions');

    // Genişletilebilir satırlar için genişletme sütunu ekle
    if (this.expandableRows) {
      columns = ['expand', ...columns];
    }

    return columns;
  }

  // Görünür sütunları al
  getVisibleColumns(): string[] {
    return this.displayedColumns.filter(column => !this.hiddenColumns.includes(column));
  }

  // Sıra numarası hesaplama metodu
  getRowNumber(index: number): number {
    return this.currentPage * this.currentPageSize + index + 1;
  }

  /**
   * Handles the click event for the add button.
   * If the parent component has subscribed to the `addClick` output, it emits the event.
   * Otherwise, it executes the default behavior (opening the add/update dialog).
   * @param event The click event object
   */
  onAddButtonClick(event: Event): void {
    event.stopPropagation(); // Prevent event bubbling

    if (this.addClick.observed) {
      this.addClick.emit(); // Let the parent component handle the add action
    } else {
      this.openAddOrUpdateDialog(); // Default action: open dialog to add a new item
    }
  }

  ngOnInit(): void {
    // Filterablecolumns için filterValues objesini oluştur
    this.filterableColumns.forEach((column) => {
      this.filterValues[column] = '';
    });

    // Ekran boyutunu kontrol et
    this.checkScreenSize();

    // Tablo durumunu yükle
    if (this.saveTableState && this.tableStateId) {
      this.loadSavedState();
    }

    // External data kullanılıyorsa veya normal veri yükleme
    if (this.useExternalData) {
      this.dataSource.data = this.externalDataSource;
      this.totalItems = this.externalDataSource.length;
      this.cdr.markForCheck();
    } else {
      this.loadData();
    }

    // Client-side işleme için dataSource ayarları
    if (this.useClientSideProcessing) {
      this.setupClientSideDataSource();
    }
  }

  ngAfterViewInit() {
    // Sort olayı için listener ekle
    if (this.sort) {
      this.sort.sortChange.subscribe((sort: Sort) => {
        this.currentPage = 0; // Sıralama değiştiğinde ilk sayfaya dön
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.currentSortField = sort.active;
        this.currentSortDirection = sort.direction;

        if (this.useClientSideProcessing) {
          // Client-side işleme için dataSource'u güncelle
          this.dataSource.sort = this.sort;
        } else {
          // Server-side işleme için veriyi yeniden yükle
          this.loadData();
        }

        // Tablo durumunu kaydet
        if (this.saveTableState && this.tableStateId) {
          this.saveCurrentState();
        }
      });
    }

    // Lazy loading için scroll olayını dinle
    if (this.useLazyLoading && this.tableContainer) {
      this.tableContainer.nativeElement.addEventListener('scroll', this.onTableScroll.bind(this));
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // parentId, useParentId veya parentIdFieldName değiştiğinde veriyi yeniden yükle
    if (
      (changes['parentId'] && this.useParentId) ||
      (changes['useParentId'] && this.useParentId) ||
      (changes['parentIdFieldName'] && this.useParentId && this.parentId !== null)
    ) {
      // İlk sayfa için sayfalayıcıyı sıfırla
      this.currentPage = 0;
      if (this.paginator) {
        this.paginator.pageIndex = 0;
      }

      // Veriyi yeniden yükle
      if (!this.useExternalData) {
        this.loadData();
      }
    }

    // External data değiştiğinde
    if (changes['externalDataSource'] && this.useExternalData) {
      this.dataSource.data = this.externalDataSource;
      this.totalItems = this.externalDataSource.length;
      this.cdr.markForCheck();
    }

    // hiddenColumns değiştiğinde
    if (changes['hiddenColumns']) {
      this.cdr.markForCheck();
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
        isNumeric: this.isNumeric(this.getFirstValueOfColumn(column)),
        format: this.columnFormats[column]?.type || 'text',
      },
    });

    // Dialog kapandığında sonucu işle
    dialogRef.afterClosed().subscribe((result) => {
      if (result !== undefined) {
        // undefined ise iptal edilmiş demektir
        this.filterValues[column] = result;

        // Filtre değiştiğinde ilk sayfaya dön
        this.currentPage = 0;
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }

        if (this.useClientSideProcessing) {
          this.applyClientSideFilters();
        } else {
          this.loadData();
        }

        // Tablo durumunu kaydet
        if (this.saveTableState && this.tableStateId) {
          this.saveCurrentState();
        }
      }
    });
  }

  /**
   * Gelişmiş filtre diyaloğunu açar
   */
  openAdvancedFilterDialog(): void {
    const dialogRef = this.dialog.open(AdvancedFilterDialogComponent, {
      width: '600px',
      data: {
        columns: this.displayedColumns.map(col => ({
          key: col,
          label: this.getColumnDisplayName(col),
          type: this.columnFormats[col]?.type || 'text'
        })),
        currentFilters: [...this.advancedFilters]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.advancedFilters = result;

        if (this.useClientSideProcessing) {
          this.applyClientSideFilters();
        } else {
          this.loadData();
        }
      }
    });
  }

  /**
   * Sütun ayarları diyaloğunu açar
   */
  openColumnSettingsDialog(): void {
    const dialogRef = this.dialog.open(ColumnSettingsDialogComponent, {
      width: '500px',
      data: {
        allColumns: this.displayedColumns.map(col => ({
          key: col,
          label: this.getColumnDisplayName(col),
          visible: !this.hiddenColumns.includes(col)
        })),
        hiddenColumns: [...this.hiddenColumns]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.hiddenColumns = result;
        this.cdr.markForCheck();

        // Tablo durumunu kaydet
        if (this.saveTableState && this.tableStateId) {
          this.saveCurrentState();
        }
      }
    });
  }

  /**
   * Client-side filtreleme için dataSource'u ayarlar
   */
  setupClientSideDataSource(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }

    // Özel filtre predicate'i tanımla
    this.dataSource.filterPredicate = (data: T, filter: string) => {
      // Global arama terimi için
      if (filter) {
        return Object.keys(data as object).some(key => {
          const value = this.getNestedPropertyValue(data, key);
          return value !== null &&
                 value !== undefined &&
                 value.toString().toLowerCase().includes(filter.toLowerCase());
        });
      }

      // Gelişmiş filtreler için
      if (this.advancedFilters.length > 0) {
        return this.advancedFilters.every(filter => {
          const value = this.getNestedPropertyValue(data, filter.column);

          switch (filter.type) {
            case 'contains':
              return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
            case 'equals':
              return value == filter.value;
            case 'startsWith':
              return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
            case 'endsWith':
              return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
            case 'greaterThan':
              return Number(value) > Number(filter.value);
            case 'lessThan':
              return Number(value) < Number(filter.value);
            case 'between':
              return Number(value) >= Number(filter.value) && Number(value) <= Number(filter.valueEnd);
            default:
              return true;
          }
        });
      }

      // Basit filtreler için
      if (Object.keys(this.filterValues).some(k => this.filterValues[k])) {
        return Object.keys(this.filterValues).every(key => {
          const filterValue = this.filterValues[key];
          if (!filterValue) return true;

          const value = this.getNestedPropertyValue(data, key);
          return value !== null &&
                 value !== undefined &&
                 value.toString().toLowerCase().includes(filterValue.toLowerCase());
        });
      }

      return true;
    };
  }

  /**
   * Client-side filtrelemeyi uygular
   */
  applyClientSideFilters(): void {
    if (this.globalSearchTerm) {
      this.dataSource.filter = this.globalSearchTerm;
    } else {
      // Datasetini yenile
      this.dataSource.filter = '';
      this.dataSource._updateChangeSubscription();
    }

    // Sayfalayıcıyı sıfırla
    if (this.paginator) {
      this.paginator.firstPage();
    }
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

    this.advancedFilters = [];
    this.globalSearchTerm = '';

    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }

    if (this.useClientSideProcessing) {
      this.applyClientSideFilters();
    } else {
      this.loadData();
    }

    // Tablo durumunu kaydet
    if (this.saveTableState && this.tableStateId) {
      this.saveCurrentState();
    }
  }

  /**
   * Aktif filtreler var mı kontrol eder
   * @returns En az 1 aktif filtre varsa true
   */
  hasActiveFilters(): boolean {
    return Object.values(this.filterValues).some(
      (value) => value !== undefined && value !== null && value !== ''
    ) || this.advancedFilters.length > 0 || !!this.globalSearchTerm;
  }

  /**
   * Verileri API'den yükleyen metod
   * Backend'in filtreleme yapısına uygun parametre gönderir
   */
  loadData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    // Parent ID değeri boş ve useParentId aktif ise,
    // API çağrısı yapmadan tabloyu temizle
    if (
      this.useParentId &&
      (this.parentId === null || this.parentId === undefined)
    ) {
      this.dataSource.data = [];
      this.totalItems = 0;
      this.isLoading = false;
      this.cdr.markForCheck();
      return; // API çağrısı yapmadan çık
    }

    // Temel parametreler
    const params: any = {
      offset: this.currentPage * this.currentPageSize,
      limit: this.currentPageSize,
    };

    // Üst nesne ID varsa ve kullanılması isteniyorsa ekle
    if (this.useParentId && this.parentId !== null) {
      // Dinamik olarak gönderilen field adını kullan
      params[this.parentIdFieldName] = this.parentId;
    }

    // Sıralama parametresi ekle
    if (this.currentSortField && this.currentSortDirection) {
      params.ordering = `${this.currentSortDirection === 'desc' ? '-' : ''}${this.currentSortField}`;
    } else if (this.sort && this.sort.active) {
      // MatSort'tan sıralama bilgisini al
      params.ordering = `${this.sort.direction === 'desc' ? '-' : ''}${this.sort.active}`;
    }

    // Global arama terimi varsa ekle
    if (this.globalSearchTerm && this.useServerSideSearch) {
      params.search = this.globalSearchTerm;
      if (this.searchFields.length > 0) {
        params.search_fields = this.searchFields.join(',');
      }
    }

    // Filtre değerlerini ekle
    Object.keys(this.filterValues).forEach((key) => {
      const value = this.filterValues[key];
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });

    // Gelişmiş filtreler
    if (this.advancedFilters.length > 0) {
      // API'nin gelişmiş filtreleri nasıl beklediğine bağlı olarak düzenle
      this.advancedFilters.forEach((filter, index) => {
        const paramPrefix = `filter${index}_`;
        params[`${paramPrefix}field`] = filter.column;
        params[`${paramPrefix}op`] = filter.type;
        params[`${paramPrefix}value`] = filter.value;

        if (filter.type === 'between' && filter.valueEnd !== undefined) {
          params[`${paramPrefix}value2`] = filter.valueEnd;
        }
      });
    }

    this.service.getAll(params).subscribe({
      next: (page: Page<T>) => {
        if (page && 'results' in page && Array.isArray(page.results)) {
          if (this.useLazyLoading && this.currentPage > 0) {
            // Mevcut veriye yeni verileri ekle
            this.dataSource.data = [...this.dataSource.data, ...page.results];
          } else {
            // Verileri sıfırla ve yeni verileri ekle
            this.dataSource.data = page.results;
          }

          this.totalItems = page.count;

          // Tüm veriler yüklendi mi kontrol et
          this.allDataLoaded = (this.currentPage + 1) * this.currentPageSize >= page.count;

          this.toastService.success('Veri yüklendi', 'Başarılı');
        } else {
          this.toastService.error(
            'API yanıtı beklenen formatta değil',
            'Uyarı'
          );
          this.dataSource.data = [];
          this.totalItems = 0;
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toastService.error('Veri yüklenirken hata', 'Uyarı');
        this.isLoading = false;
        this.dataSource.data = [];
        this.totalItems = 0;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Tablonun scroll olayını yönetir (lazy loading için)
   */
  onTableScroll(): void {
    if (!this.isLoading && !this.allDataLoaded && this.useLazyLoading) {
      const element = this.tableContainer.nativeElement;
      if (element.scrollHeight - element.scrollTop - element.clientHeight < this.lazyLoadThreshold) {
        this.currentPage++;
        this.loadData();
      }
    }
  }

  /**
   * Daha fazla veri yükle (lazy loading için manuel tetikleme)
   */
  loadMoreData(): void {
    if (!this.isLoading && !this.allDataLoaded && this.useLazyLoading) {
      this.currentPage++;
      this.loadData();
    }
  }

  /**
   * Sayfalama değişikliklerini yönetir
   * @param event Sayfalama olayı
   */
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.currentPageSize = event.pageSize;

    if (this.useClientSideProcessing) {
      // Client-side işleme için sayfalayıcıya bırak
    } else {
      this.loadData();
    }

    // Tablo durumunu kaydet
    if (this.saveTableState && this.tableStateId) {
      this.saveCurrentState();
    }
  }

  /**
   * Satıra tıklama olayını yönetir
   * @param row Tıklanan satır
   */
  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  /**
   * Satırın genişletilmesini togglelar
   * @param row Genişletilecek/daraltılacak satır
   * @param event Tıklama olayı
   */
  toggleRowExpand(row: T, event: Event): void {
    event.stopPropagation();
    this.expandedElement = this.expandedElement === row ? null : row;
    this.cdr.markForCheck();
  }

  /**
   * Tablo durumunu yerel depolamaya kaydeder
   */
  saveCurrentState(): void {
    if (this.saveTableState && this.tableStateId) {
      const state = {
        filters: this.filterValues,
        advancedFilters: this.advancedFilters,
        globalSearchTerm: this.globalSearchTerm,
        sort: {
          active: this.currentSortField,
          direction: this.currentSortDirection
        },
        page: this.currentPage,
        pageSize: this.currentPageSize,
        hiddenColumns: this.hiddenColumns
      };

      localStorage.setItem(`table_state_${this.tableStateId}`, JSON.stringify(state));
    }
  }

  /**
   * Kaydedilmiş tablo durumunu yükler
   */
  loadSavedState(): void {
    if (this.saveTableState && this.tableStateId) {
      const savedState = localStorage.getItem(`table_state_${this.tableStateId}`);

      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          this.filterValues = state.filters || {};
          this.advancedFilters = state.advancedFilters || [];
          this.globalSearchTerm = state.globalSearchTerm || '';
          this.currentSortField = state.sort?.active || '';
          this.currentSortDirection = state.sort?.direction || '';
          this.currentPage = state.page || 0;
          this.currentPageSize = state.pageSize || this.pageSize;
          this.hiddenColumns = state.hiddenColumns || [];
        } catch (error) {
          console.error('Tablo durumu yüklenirken hata:', error);
          localStorage.removeItem(`table_state_${this.tableStateId}`);
        }
      }
    }
  }

  /**
   * Ekran boyutunu kontrol eder ve mobil görünümü ayarlar
   */
  @HostListener('window:resize', ['$event'])
  checkScreenSize(): void {
    this.isMobileView = window.innerWidth < this.responsiveBreakpoint;
    this.cdr.markForCheck();
  }

  /**
   * Dışa aktarma işlevselliği
   * @param format Dışa aktarma formatı
   */
  exportData(format: 'csv' | 'excel' | 'pdf'): void {
    if (!this.enableExport) return;

    const visibleColumns = this.getVisibleColumns();
    const columnHeaders = visibleColumns.map(col => this.getColumnDisplayName(col));

    // Veri hazırlama
    let exportData: any[];

    if (this.useClientSideProcessing) {
      // Filtrelenmiş veriyi kullan
      exportData = this.dataSource.filteredData;
    } else {
      // Mevcut sayfadaki veriyi kullan
      exportData = this.dataSource.data;
    }

    // Veriyi formatla
    const formattedData = exportData.map(row => {
      const rowData: any = {};
      visibleColumns.forEach(col => {
        const value = this.getNestedPropertyValue(row, col);
        rowData[this.getColumnDisplayName(col)] = this.formatCellValue(col, value);
      });
      return rowData;
    });

    // İlgili servisi kullanarak dışa aktar
    switch (format) {
      case 'csv':
        // this.exportService.exportToCsv(formattedData, columnHeaders, this.exportFilename);
        break;
      case 'excel':
        // this.exportService.exportToExcel(formattedData, columnHeaders, this.exportFilename);
        break;
      case 'pdf':
        // this.exportService.exportToPdf(formattedData, columnHeaders, this.title, this.exportFilename);
        break;
    }

    this.toastService.success(`Veriler ${format.toUpperCase()} olarak dışa aktarıldı`, 'Başarılı');
  }

  /**
   * Toplu işlemleri uygular
   * @param action İşlem adı
   */
  applyBulkAction(action: string): void {
    if (this.selection.isEmpty()) return;

    const selectedItems = this.selection.selected;

    if (action === 'delete') {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '350px',
        data: {
          message: `${selectedItems.length} öğeyi silmek istediğinizden emin misiniz?`,
          title: 'Toplu Silme'
        },
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.bulkActionSelected.emit({ action, items: selectedItems });
          // Eğer işlem component içinde yönetilecekse:
          // this.bulkDelete(selectedItems);
        }
      });
    } else {
      // Diğer toplu işlemler
      this.bulkActionSelected.emit({ action, items: selectedItems });
    }
  }

  /**
   * Toplu silme işlemi
   * @param items Silinecek öğeler
   */
  bulkDelete(items: T[]): void {
    if (!items || items.length === 0) return;

    this.isLoading = true;
    this.cdr.markForCheck();

    const ids = items.map((item: any) => item.id);

    // Burada genellikle bir batch delete API çağrısı yapılır
    // Örnek amaçlı her öğe için ayrı delete çağrısı yapıyoruz
    let completedCount = 0;

    ids.forEach(id => {
      this.service.delete(id).subscribe({
        next: () => {
          completedCount++;

          if (completedCount === ids.length) {
            this.selection.clear();
            this.toastService.success(`${ids.length} öğe başarıyla silindi`, 'Başarılı');
            this.loadData();
          }
        },
        error: (error) => {
          this.toastService.error(`ID:${id} silinirken hata oluştu`, 'Hata');
          completedCount++;

          if (completedCount === ids.length) {
            this.loadData();
          }
        }
      });
    });
  }

  /**
   * Bir sütunun ilk değerini alır (format tespiti için)
   * @param column Sütun adı
   * @returns İlk değer
   */
  getFirstValueOfColumn(column: string): any {
    if (this.dataSource.data.length === 0) return null;
    return this.getNestedPropertyValue(this.dataSource.data[0], column);
  }

  /**
   * Master toggle - tüm satırları seçer/kaldırır
   */
  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
    }
  }

  /**
   * Tüm satırların seçili olup olmadığını kontrol eder
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  /**
   * Bir satırın seçili olup olmadığını kontrol eder
   * @param row Kontrol edilecek satır
   */
  isSelected(row: any): boolean {
    return this.selection.isSelected(row);
  }

  /**
   * Hücre düzenleme modunu başlatır
   * @param row Satır
   * @param column Sütun
   * @param event Olay
   */
  startEditing(row: any, column: string, event: Event): void {
    event.stopPropagation();
    if (this.editableColumns.includes(column)) {
      this.editingCell = { rowId: row.id, column };
      this.cdr.markForCheck();
    }
  }

  /**
   * Düzenlenen hücreyi kaydeder
   * @param row Satır
   * @param column Sütun
   * @param value Yeni değer
   */
  saveEdit(row: any, column: string, value: any): void {
    // Değer kontrolü - değer değişmediyse işlem yapma
    if (this.getNestedPropertyValue(row, column) === value) {
      this.editingCell = null;
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    // Nesne kopyası oluştur
    const updatedRow = { ...row };

    // Nested property için
    if (column.includes('.')) {
      const props = column.split('.');
      let target = updatedRow;

      // Son property dışındakileri gezin
      for (let i = 0; i < props.length - 1; i++) {
        target = target[props[i]] = { ...target[props[i]] };
      }

      // Son property'yi güncelle
      target[props[props.length - 1]] = value;
    } else {
      // Basit property için
      updatedRow[column] = value;
    }

    // API'ye güncelleme gönder
    this.service.update(row.id, updatedRow).subscribe({
      next: (response) => {
        // Veriyi güncelle
        const index = this.dataSource.data.findIndex(item => (item as any).id === row.id);
        if (index !== -1) {
          this.dataSource.data[index] = response;
          this.dataSource._updateChangeSubscription();
        }

        // Event'i emit et
        this.cellValueChanged.emit({ row, column, value });
        this.toastService.success('Değer güncellendi', 'Başarılı');

        this.editingCell = null;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toastService.error('Değer güncellenirken hata', 'Hata');
        this.editingCell = null;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Düzenlemeyi iptal eder
   */
  cancelEdit(): void {
    this.editingCell = null;
    this.cdr.markForCheck();
  }

  /**
   * Belirli bir hücrenin düzenleme modunda olup olmadığını kontrol eder
   * @param row Satır
   * @param column Sütun
   */
  isEditing(row: any, column: string): boolean {
    return this.editingCell?.rowId === row.id && this.editingCell?.column === column;
  }

  /**
   * Global arama terimini uygular
   * @param event Arama olayı
   */
  applyGlobalSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.globalSearchTerm = searchTerm.trim().toLowerCase();

    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }

    if (this.useClientSideProcessing) {
      this.applyClientSideFilters();
    } else {
      this.loadData();
    }

    // Tablo durumunu kaydet
    if (this.saveTableState && this.tableStateId) {
      this.saveCurrentState();
    }
  }

  /**
   * Sütunların sırasını değiştirme
   * @param event Sürükleme olayı
   */
  onColumnDrop(event: any): void {
    if (!this.allowColumnReordering) return;

    const columns = [...this.displayedColumns];
    const item = columns[event.previousIndex];
    columns.splice(event.previousIndex, 1);
    columns.splice(event.currentIndex, 0, item);
    this.displayedColumns = columns;

    // Tablo durumunu kaydet
    if (this.saveTableState && this.tableStateId) {
      this.saveCurrentState();
    }
  }

  // openAddOrUpdateDialog metodunda columnDefinitions dizisinin doğru gönderildiğinden emin olalım
  openAddOrUpdateDialog(row?: T): void {
    // Tabloda gösterilen sütunlara göre dinamik olarak görünür alanları belirle

    if (this.displayedColumns.length === 0) {
      console.error(
        'Hata: displayedColumns boş! Lütfen tablo sütunlarını tanımlayın.'
      );
      return;
    }

    // Sütun tanımlarımız yoksa bir hata mesajı göster
    if (!this.columnDefinitions || this.columnDefinitions.length === 0) {
      console.error(
        'Hata: columnDefinitions boş! Diyalog için sütun tanımları gerekli.'
      );

      //Basit sütun tanımları oluştur
      this.columnDefinitions = this.displayedColumns
        .filter((col) => col !== 'actions' && col !== 'rowNumber')
        .map((col) => ({
          key: col,
          label: this.getColumnDisplayName(col),
          type: 'text',
          required: true,
        }));
    }

    const dialogRef = this.dialog.open(AddOrUpdateDialogComponent, {
      width: '500px',
      data: {
        row: row, // Düzenleme için mevcut satır verisi (eğer yeni ekleme ise undefined)
        columns: this.columnDefinitions, // Sütun tanımları
        relationOptions: this.relationOptions, // Dropdown seçenekleri
        visibleFields: this.displayedColumns.filter(
          (col) => col !== 'actions' && col !== 'rowNumber' && !this.excludeFields.includes(col)
        ), // Dinamik olarak belirlenen alanlar
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (row) {
          // Mevcut öğeyi güncelle
          this.isLoading = true;
          this.cdr.markForCheck();

          this.service.update((row as any).id, result).subscribe({
            next: (updatedItem) => {
              this.updateItem.emit(updatedItem); // Güncellenmiş nesneyi bildir
              this.toastService.success(
                'Başarı ile güncellendi',
                'Güncellendi'
              );

              // Veriyi güncelle
              const index = this.dataSource.data.findIndex(item => (item as any).id === (row as any).id);
              if (index !== -1) {
                this.dataSource.data[index] = updatedItem;
                this.dataSource._updateChangeSubscription();
              } else {
                this.loadData(); // Tablo verilerini yenile
              }

              this.isLoading = false;
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.error('Güncelleme hatası:', error);
              this.toastService.error('Hata oluştu', 'Güncellenemedi');
              this.isLoading = false;
              this.cdr.markForCheck();
            },
          });
        } else {
          // Yeni öğe ekle
          this.isLoading = true;
          this.cdr.markForCheck();

          // Parent ID parametresi kullanılıyorsa, yeni ekleme için de dahil et
          if (this.useParentId && this.parentId) {
            result[this.parentIdFieldName] = this.parentId;
          }

          this.service.create(result).subscribe({
            next: (createdItem) => {
              this.itemAdded.emit(createdItem); // Yeni eklenen öğeyi bildir
              this.toastService.success('Başarı ile eklendi', 'Eklendi');

              // Verileri güncelle
              this.dataSource.data = [createdItem, ...this.dataSource.data];
              this.totalItems++;

              this.isLoading = false;
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.error('Ekleme hatası:', error);
              this.toastService.error('Hata oluştu', 'Eklenemedi');
              this.isLoading = false;
              this.cdr.markForCheck();
            },
          });
        }
      }
    });
  }

  /**
   * Silme işlemi için onay diyaloğu açar
   * @param id Silinecek öğe ID'si
   */
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

  /**
   * Bir satırın genişletilmiş olup olmadığını kontrol eder
   * @param row Kontrol edilecek satır
   */
  isExpanded = (row: any): boolean => {
    return this.expandedElement === row;
  };

  /**
   * Nesnenin ID'sini alır (any tipi için güvenli)
   * @param item ID'si alınacak nesne
   */
  getId(item: any): any {
    return item && item.id !== undefined ? item.id : null;
  }

  /**
   * Öğeyi siler
   * @param id Silinecek öğe ID'si
   */
  deleteItem(id: any): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.service.delete(id).subscribe({
      next: () => {
        this.rowDeleted.emit(id);

        // Veriyi güncelle
        const index = this.dataSource.data.findIndex((item: any) => item.id === id);
        if (index !== -1) {
          this.dataSource.data.splice(index, 1);
          this.dataSource._updateChangeSubscription();
          this.totalItems--;
        }

        this.toastService.success('Başarı ile silindi', 'Silindi');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toastService.error('Silinemedi', 'Hata');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Tablo verisini yeniler
   */
  refreshData(): void {
    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadData();
  }

  /**
   * Verilerin yüklenmesi tamamlandı mı
   */
  get isLoadingComplete(): boolean {
    return !this.isLoading;
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

    return value;
  }

  /**
   * Hücre değerini formatlar
   * @param column Sütun adı
   * @param value Değer
   * @returns Formatlanmış değer
   */
  formatCellValue(column: string, value: any): string {
    if (value === null || value === undefined) return '';

    const format = this.columnFormats[column];
    if (!format) return String(value);

    switch (format.type) {
      case 'number':
        return Number(value).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
      case 'currency':
        return Number(value).toLocaleString(undefined, {
          style: 'currency',
          currency: format.format || 'TRY'
        });
      case 'date':
        return new Date(value).toLocaleDateString(undefined, {
          dateStyle: format.format as any || 'medium'
        });
      case 'percent':
        return `${(Number(value) * 100).toFixed(2)}%`;
      case 'custom':
        return format.formatter ? format.formatter(value) : String(value);
      default:
        return String(value);
    }
  }

  /**
   * Hücre için CSS sınıflarını hesaplar
   * @param column Sütun adı
   * @param value Değer
   * @returns CSS sınıfları
   */
  getCellClass(column: string, value: any): string {
    const format = this.columnFormats[column];
    if (!format) {
      return this.isNumeric(value) ? 'numeric-cell' : '';
    }

    let classes = format.cssClass || '';

    // Format türüne göre temel sınıflar
    if (format.type === 'number' || format.type === 'currency') {
      classes += ' numeric-cell';
    }

    // Tema kuralları varsa uygula
    if (format.themeRules) {
      format.themeRules.forEach(rule => {
        if (rule.condition(value)) {
          classes += ' ' + rule.cssClass;
        }
      });
    }

    return classes;
  }

  // Get the display name for a column
  getColumnDisplayName(column: string): string {
    // "rowNumber" sütunu için özel isim
    if (column === 'rowNumber') {
      return '#';
    }

    // "select" sütunu için özel isim
    if (column === 'select') {
      return '';
    }

    // "expand" sütunu için özel isim
    if (column === 'expand') {
      return '';
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

  /**
   * Tablo yükleniyor mu veya boş mu kontrol eder
   */
  get isTableEmpty(): boolean {
    return this.dataSource.data.length === 0 && !this.isLoading;
  }

  /**
   * TrackBy fonksiyonu
   * @param index İndeks
   * @param item Öğe
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}

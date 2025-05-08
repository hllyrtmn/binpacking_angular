import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ProductService } from '../../../admin/components/services/product.service';
import { ToastService } from '../../../services/toast.service';
import { AdvancedFilterDialogComponent } from '../advanced-filter-dialog/advanced-filter-dialog.component';
import { ColumnSettingsDialogComponent } from '../column-settings-dialog/column-settings-dialog.component';
import { GenericTableComponent } from '../generic-table.component';
@Component({
  selector: 'app-example',
  imports: [CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule,
    GenericTableComponent,],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss'
})
export class ExampleComponent {
  // Generic Table için başvuru
  @ViewChild('productTable') productTable!: GenericTableComponent<any>;

  // Arayüz durumu
  isClientSide = true;
  isCardView = false;
  selectedProduct: any = null;

  // Tablo yapılandırması
  displayedColumns = [
    'name',
    'category.name',
    'price',
    'stock',
    'status',
    'supplier.name',
    'updated_at'
  ];

  filterableColumns = [
    'name',
    'category.name',
    'price',
    'stock',
    'status',
    'supplier.name'
  ];

  nestedDisplayColumns = {
    'category.name': 'Kategori',
    'supplier.name': 'Tedarikçi'
  };

  editableColumns = [
    'price',
    'stock'
  ];

  // Sütun formatları
  columnFormats = {
    'price': {
      type: 'currency',
      format: 'TRY',
      cssClass: 'price-column',
      themeRules: [
        {
          condition: (value:any) => Number(value) > 10000,
          cssClass: 'high-price'
        },
        {
          condition: (value:any) => Number(value) < 1000,
          cssClass: 'low-price'
        }
      ]
    },
    'stock': {
      type: 'number',
      cssClass: 'stock-column',
      themeRules: [
        {
          condition: (value:any) => Number(value) <= 5 && Number(value) > 0,
          cssClass: 'low-stock'
        },
        {
          condition: (value:any) => Number(value) === 0,
          cssClass: 'out-of-stock'
        }
      ]
    },
    'status': {
      type: 'custom',
      formatter: (value:any) => {
        switch (value) {
          case 'active': return 'Aktif';
          case 'inactive': return 'Pasif';
          case 'discontinued': return 'Üretimi Durdurulmuş';
          case 'pre_order': return 'Ön Sipariş';
          default: return value;
        }
      },
      themeRules: [
        {
          condition: (value:any) => value === 'active',
          cssClass: 'status-active'
        },
        {
          condition: (value:any) => value === 'inactive',
          cssClass: 'status-inactive'
        },
        {
          condition: (value:any) => value === 'discontinued',
          cssClass: 'status-discontinued'
        },
        {
          condition: (value:any) => value === 'pre_order',
          cssClass: 'status-pre-order'
        }
      ]
    },
    'updated_at': {
      type: 'date',
      format: 'medium'
    }
  };

  // Örnek veri
  originalProducts: any[] = [
    {
      id: 1,
      name: 'MacBook Pro 16"',
      category: { id: 1, name: 'Dizüstü Bilgisayarlar' },
      description: '16 inç Retina ekran, Apple M2 Pro işlemci, 32 GB RAM, 1 TB SSD',
      price: 72999.90,
      stock: 12,
      status: 'active',
      supplier: { id: 1, name: 'Apple Türkiye' },
      supplier_code: 'APP-MBP16-M2P',
      sku: 'MB-PRO-16-M2-32-1TB',
      barcode: '8681234567001',
      dimensions: '35.57 x 24.81 x 1.68 cm',
      weight: 2.15,
      total_sales: 342,
      month_sales: 28,
      min_stock: 5,
      optimal_stock: 20,
      lead_time: 15,
      last_order_date: '2023-04-12T16:30:00',
      updated_at: '2023-10-15T09:45:22'
    },
    {
      id: 2,
      name: 'Dell XPS 15',
      category: { id: 1, name: 'Dizüstü Bilgisayarlar' },
      description: '15.6 inç 4K OLED ekran, Intel Core i9, 32 GB RAM, 1 TB SSD, RTX 4070',
      price: 63500.00,
      stock: 8,
      status: 'active',
      supplier: { id: 2, name: 'Dell Türkiye' },
      supplier_code: 'DELL-XPS15-I9',
      sku: 'DL-XPS-15-I9-32-1TB',
      barcode: '8681234567002',
      dimensions: '34.5 x 23.5 x 1.8 cm',
      weight: 1.96,
      total_sales: 186,
      month_sales: 15,
      min_stock: 4,
      optimal_stock: 15,
      lead_time: 10,
      last_order_date: '2023-05-20T14:15:00',
      updated_at: '2023-11-05T11:32:14'
    },
    // Diğer ürünler...
  ];

  // Görüntülenen ürünler
  products: any[] = [];

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog  // Dialog servisi eklendi
  ) {}

  ngOnInit(): void {
    // Verileri başlangıçta kopyala
    this.resetData();
  }

  /**
 * Gelişmiş filtreleme diyaloğunu aç
 */
// openAdvancedFilterDialog(): void {
//   const dialogRef = this.dialog.open(AdvancedFilterDialogComponent, {
//     width: '600px',
//     data: {
//       columns: this.displayedColumns.map(col => ({
//         key: col,
//         label: col.includes('.') ?
//           this.nestedDisplayColumns[col] || this.formatColumnName(col) :
//           this.formatColumnName(col),
//         type: this.columnFormats[col]?.type || 'text'
//       })),
//       currentFilters: this.productTable.advancedFilters || [],
//       filterLogic: 'and'
//     }
//   });

//   dialogRef.afterClosed().subscribe(result => {
//     if (result) {
//       // Gelişmiş filtreleri tabloya uygula
//       this.productTable.advancedFilters = result.filters || [];

//       // Filtreleri uygula
//       if (this.productTable.useClientSideProcessing) {
//         this.productTable.applyClientSideFilters();
//       } else {
//         this.productTable.loadData();
//       }

//       this.snackBar.open(
//         `${result.filters.length} gelişmiş filtre uygulandı`,
//         'Tamam',
//         { duration: 3000 }
//       );
//     }
//   });
// }

// /**
//  * Sütun ayarları diyaloğunu aç
//  */
// openColumnSettingsDialog(): void {
//   const dialogRef = this.dialog.open(ColumnSettingsDialogComponent, {
//     width: '500px',
//     data: {
//       allColumns: this.displayedColumns.map(col => ({
//         key: col,
//         label: col.includes('.') ?
//           this.nestedDisplayColumns[col] || this.formatColumnName(col) :
//           this.formatColumnName(col),
//         visible: !this.productTable.hiddenColumns.includes(col)
//       })),
//       hiddenColumns: this.productTable.hiddenColumns || []
//     }
//   });

//   dialogRef.afterClosed().subscribe(result => {
//     if (result) {
//       // Gizli sütunları tabloya uygula
//       this.productTable.hiddenColumns = result;

//       this.snackBar.open(
//         `Sütun ayarları güncellendi`,
//         'Tamam',
//         { duration: 3000 }
//       );
//     }
//   });
// }

/**
 * Sütun adını formatla
 */
formatColumnName(column: string): string {
  return column
    .replace(/\./g, ' ')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

  /**
   * İstemci tarafı işlemeyi değiştir
   */
  useClientSideProcessing(): void {
    this.isClientSide = !this.isClientSide;

    // Değişiklik yapıldığında snackbar göster
    this.snackBar.open(
      `İstemci tarafı filtreleme ${this.isClientSide ? 'aktif' : 'pasif'} edildi`,
      'Tamam',
      { duration: 3000 }
    );

    // Tabloyu yeniden yükle
    if (this.productTable) {
      setTimeout(() => this.productTable.refreshData(), 0);
    }
  }

  /**
   * Kart görünümünü değiştir
   */
  useCardView(): void {
    this.isCardView = !this.isCardView;

    // Değişiklik yapıldığında snackbar göster
    this.snackBar.open(
      `${this.isCardView ? 'Kart' : 'Tablo'} görünümü aktif edildi`,
      'Tamam',
      { duration: 3000 }
    );
  }

  /**
   * Verileri orijinal haline sıfırla
   */
  resetData(): void {
    // Verileri derin kopyala
    this.products = JSON.parse(JSON.stringify(this.originalProducts));

    // Değişiklik yapıldığında snackbar göster
    this.snackBar.open('Veriler sıfırlandı', 'Tamam', { duration: 3000 });

    // Tabloyu yeniden yükle
    if (this.productTable) {
      setTimeout(() => {
        this.productTable.externalDataSource = this.products;
        this.productTable.refreshData();
      }, 0);
    }
  }

  /**
   * Ürüne tıklandığında çağrılır
   * @param product Seçilen ürün
   */
  onProductSelect(product: any): void {
    this.selectedProduct = product;
    this.snackBar.open(`"${product.name}" seçildi`, 'Tamam', { duration: 2000 });
  }

  /**
   * Ürün silme işlemi tamamlandığında çağrılır
   * @param productId Silinen ürün ID'si
   */
  onProductDelete(productId: any): void {
    // Veride silinen öğeyi bul
    const deletedProduct = this.products.find(p => p.id === productId);

    if (deletedProduct) {
      // Veride öğeyi sil
      this.products = this.products.filter(p => p.id !== productId);

      // Bildirim göster
      this.snackBar.open(`"${deletedProduct.name}" silindi`, 'Tamam', { duration: 3000 });

      // Eğer silinmiş ürün seçiliyse, seçimi temizle
      if (this.selectedProduct && this.selectedProduct.id === productId) {
        this.selectedProduct = null;
      }
    }
  }

  /**
   * Ürün güncellendiğinde çağrılır
   * @param product Güncellenen ürün
   */
  onProductUpdate(product: any): void {
    // Ürünü veride güncelle
    const index = this.products.findIndex(p => p.id === product.id);

    if (index !== -1) {
      this.products[index] = { ...product };

      // Bildirim göster
      this.snackBar.open(`"${product.name}" güncellendi`, 'Tamam', { duration: 3000 });

      // Eğer güncellenen ürün seçiliyse, seçimi güncelle
      if (this.selectedProduct && this.selectedProduct.id === product.id) {
        this.selectedProduct = product;
      }
    }
  }

  /**
   * Yeni ürün eklendiğinde çağrılır
   * @param product Eklenen ürün
   */
  onProductAdded(product: any): void {
    // Yeni ID oluştur (normalde sunucu tarafından yapılır)
    const maxId = Math.max(...this.products.map(p => p.id));
    product.id = maxId + 1;

    // Yeni ürünü diziye ekle
    this.products.unshift(product);

    // Bildirim göster
    this.snackBar.open(`"${product.name}" eklendi`, 'Tamam', { duration: 3000 });
  }

  /**
   * Toplu işlem seçildiğinde çağrılır
   * @param data İşlem türü ve seçili ürünler
   */
  onBulkAction(data: { action: string, items: any[] }): void {
    const { action, items } = data;

    if (action === 'delete') {
      // Seçili öğelerin ID'lerini al
      const selectedIds = items.map(item => item.id);

      // Bu ID'lere sahip olmayan öğeleri filtrele
      this.products = this.products.filter(p => !selectedIds.includes(p.id));

      // Bildirim göster
      this.snackBar.open(`${items.length} öğe silindi`, 'Tamam', { duration: 3000 });

      // Seçili ürün silindiyse, seçimi temizle
      if (this.selectedProduct && selectedIds.includes(this.selectedProduct.id)) {
        this.selectedProduct = null;
      }
    }
  }

  /**
   * Hücre değeri değiştiğinde çağrılır (inline düzenleme)
   * @param event Değişiklik bilgileri
   */
  onCellValueChanged(event: { row: any, column: string, value: any }): void {
    const { row, column, value } = event;

    // Değeri tabloda güncelle
    const rowIndex = this.products.findIndex(p => p.id === row.id);

    if (rowIndex !== -1) {
      // İç içe özellikler için
      if (column.includes('.')) {
        const parts = column.split('.');
        let target = this.products[rowIndex];

        // Son parça dışındakileri dolaş
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]];
        }

        // Son parçayı güncelle
        target[parts[parts.length - 1]] = value;
      } else {
        // Doğrudan özellik için
        this.products[rowIndex][column] = value;
      }

      // Özel uyarılar
      if (column === 'stock' && value <= 5) {
        this.snackBar.open(
          `"${row.name}" ürününün stok seviyesi kritik düzeyde (${value} adet)`,
          'Tamam',
          { duration: 5000, panelClass: 'warning-snackbar' }
        );
      }
    }
  }

  /**
   * Ürün detayları sayfasını açar
   * @param product Ürün bilgileri
   */
  openProductDetails(product: any): void {
    // Gerçek uygulamada yönlendirme veya detay diyaloğu açılabilir
    this.snackBar.open(`"${product.name}" detayları görüntüleniyor`, 'Tamam', { duration: 2000 });
  }

  /**
   * Ürünü siparişe ekler
   * @param product Ürün bilgileri
   */
  addToOrder(product: any): void {
    // Gerçek uygulamada sepete ekleme işlemi
    this.snackBar.open(`"${product.name}" siparişe eklendi`, 'Tamam', { duration: 3000 });
  }
}

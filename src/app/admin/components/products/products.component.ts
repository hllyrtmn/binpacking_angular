import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin, pipe } from 'rxjs';
import { ProductService } from '../services/product.service';
import { Product } from '../../../models/product.interface';
import { ProductTypeService } from '../services/product-type.service';
import { DimensionService } from '../services/dimension.service';
import { WeightTypeService } from '../services/weight-type.service';
import { GenericTableComponent } from "../../../components/generic-table/generic-table.component";
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-products',
  imports: [CommonModule,
    GenericTableComponent,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {

  toastService = inject(ToastService)
  // API'den dönen verilerde product_type, dimension ve weight_type doğrudan
  // nesne olarak döndüğü için kolonları değişiyoruz
  displayedColumns: string[] = [
    // 'id' kolonunu kaldırdık, sıra numarası kullanacağız
    'product_type.code',
    'product_type.type',
    'dimension.width',
    'dimension.height',
    'dimension.depth',
    'weight_type.std',
    'weight_type.eco',
    'weight_type.pre'
  ];

  // Filtrelenebilen alanlar
  filterableColumns: string[] = [
    'product_type.code',
    'product_type.type',
    'dimension.width',
    'dimension.height',
    'dimension.depth',
    'weight_type.std',
    'weight_type.eco',
    'weight_type.pre'
  ];

  // İlişkili drop-down seçenekleri
  relationOptions: { [key: string]: any[] } = {
    product_type: [],
    dimension: [],
    weight_type: []
  };

  // İlişkili nesne sütunları için özel görüntüleme ayarları
  nestedDisplayColumns: { [key: string]: string } = {
    'product_type.code': 'Ürün Kodu',
    'product_type.type': 'Ürün Tipi',
    'dimension.width': 'Genişlik',
    'dimension.height': 'Yükseklik',
    'dimension.depth': 'Derinlik',
    'weight_type.std': 'Standart Ağırlık',
    'weight_type.eco': 'Ekonomik Ağırlık',
    'weight_type.pre': 'Premium Ağırlık'
  };

  // Servis enjeksiyonları
  productService = inject(ProductService);
  productTypeService = inject(ProductTypeService);
  dimensionService = inject(DimensionService);
  weightTypeService = inject(WeightTypeService);
  snackBar = inject(MatSnackBar);
  dialog = inject(MatDialog);

  // Loading durumu
  isLoading = false;

  ngOnInit(): void {
    this.loadRelatedData();
  }

  // İlişkili verileri yükle - dropdown seçenekleri için
  loadRelatedData(): void {
    this.isLoading = true;

    // İlişkili tüm verileri paralel olarak yükle
    forkJoin({
      productTypes: this.productTypeService.getAll({ limit: 100 }),
      dimensions: this.dimensionService.getAll({ limit: 100 }),
      weightTypes: this.weightTypeService.getAll({ limit: 100 })
    }).subscribe({
      next: (result) => {
        this.relationOptions['product_type'] = result.productTypes.results;
        this.relationOptions['dimension'] = result.dimensions.results;
        this.relationOptions['weight_type'] = result.weightTypes.results;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('İlişkili verileri yüklerken hata:', error);
        this.snackBar.open('İlişkili veriler yüklenirken bir hata oluştu', 'Kapat', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  // Yeni ürün ekleme formunu açma
  openAddProductForm(): void {
    // Dialog component oluşturulana kadar basit bir bildirim gösterelim
    this.snackBar.open('Yeni ürün ekleme özelliği hazırlanıyor...', 'Tamam', {
      duration: 3000
    });
  }

  // Ürün silindiğinde
  onProductDeleted(id: string): void {
    console.log('Ürün silindi, ID:', id);
    this.productService.delete(id).subscribe({ next: () => {
      this.toastService.success('Başarıyla silindi.');
      this.snackBar.open('Ürün başarıyla silindi', 'Kapat', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
    } })

  }

  // Ürün satırına tıklandığında
  onProductRowClick(product: Product): void {
    console.log('Seçilen ürün:', product);
    // Burada ürün detay sayfasına gidilebilir veya düzenleme diyaloğu açılabilir
  }
}

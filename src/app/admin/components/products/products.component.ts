import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '../services/product.service';
import { ProductTypeService } from '../services/product-type.service';
import { DimensionService } from '../services/dimension.service';
import { WeightTypeService } from '../services/weight-type.service';
import { GenericTableComponent } from "../../../components/generic-table/generic-table.component";

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

  // Servis enjeksiyonları
  productService = inject(ProductService);
  productTypeService = inject(ProductTypeService);
  dimensionService = inject(DimensionService);
  weightTypeService = inject(WeightTypeService);
  snackBar = inject(MatSnackBar);
  dialog = inject(MatDialog);

  // Loading durumu
  isLoading = false;

  // API'den dönen verilerde product_type, dimension ve weight_type doğrudan
  // nesne olarak döndüğü için kolonları değişiyoruz
  displayedColumns: string[] = [
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

  // İlişkili nesne sütunları için özel görüntüleme ayarları
  nestedDisplayColumns: { [key: string]: string } = {
    'product_type.code': 'Ürün Kodu',
    'product_type.type': 'Ürün Tipi',
    'dimension.width': 'Genişlik',
    'dimension.height': 'Yükseklik',
    'dimension.depth': 'Derinlik',
    'weight_type.std': 'Std',
    'weight_type.eco': 'Eco',
    'weight_type.pre': 'Pre'
  };

  ngOnInit(): void {

  }

  // Yeni ürün ekleme formunu açma
  openAddProductForm(): void {
    // Dialog component oluşturulana kadar basit bir bildirim gösterelim
    this.snackBar.open('Yeni ürün ekleme özelliği hazırlanıyor...', 'Tamam', {
      duration: 3000
    });
  }
}

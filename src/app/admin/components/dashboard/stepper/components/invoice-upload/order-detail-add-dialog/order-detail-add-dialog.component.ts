import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ProductService } from '../../../../../services/product.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Order } from '../../../../../../../models/order.interface';
import { Product } from '../../../../../../../models/product.interface';

@Component({
  selector: 'app-order-detail-add-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatIconModule
  ],
  templateUrl: './order-detail-add-dialog.component.html',
  styleUrl: './order-detail-add-dialog.component.scss'
})
export class OrderDetailAddDialogComponent implements OnInit {
  orderDetailForm: FormGroup;
  dimensionSearchForm: FormGroup;
  prod!: Product;

  filteredProducts: any[] = [];
  isLoading = false;
  hasError = false;
  errorMessage = '';
  activeTab = 0;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<OrderDetailAddDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Order, // Changed from { order: Order } to Order
    private productService: ProductService
  ) {
    // Main order form
    this.orderDetailForm = this.fb.group({
      order: [this.data, Validators.required], // Use data directly as the Order object
      product: [this.prod, Validators.required],
      count: [1, [Validators.required, Validators.min(1)]],
      unit_price: [0, [Validators.required, Validators.min(0.01)]]
    });

    // Dimension search form
    this.dimensionSearchForm = this.fb.group({
      width: [null, [Validators.min(0)]],
      height: [null, [Validators.min(0)]],
      depth: [null, [Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    // Text search
    this.orderDetailForm.get('product')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          if (typeof value === 'string' && value.length > 2) {
            this.isLoading = true;
            this.hasError = false;
            // Get maximum 10 results
            return this.productService.searchProducts(value, 10).pipe(
              catchError(error => {
                this.hasError = true;
                this.errorMessage = 'Ürün arama sırasında bir hata oluştu.';
                console.error('Ürün arama hatası:', error);
                return of([]);
              }),
              finalize(() => {
                this.isLoading = false;
              })
            );
          }
          return of([]);
        })
      )
      .subscribe({
        next: (products: any[]) => {
          this.filteredProducts = products;
        }
      });

    console.log('Current order:', this.data);
  }

  // Search using dimension filter form
  searchByDimensions(): void {
    this.isLoading = true;
    this.hasError = false;

    const width = this.dimensionSearchForm.get('width')?.value;
    const height = this.dimensionSearchForm.get('height')?.value;
    const depth = this.dimensionSearchForm.get('depth')?.value;

    // At least one dimension must be entered
    if (!width && !height && !depth) {
      this.hasError = true;
      this.errorMessage = 'En az bir boyut değeri girilmelidir.';
      this.isLoading = false;
      return;
    }

    this.productService.searchByDimensions(width, height, depth, 10)
      .pipe(
        catchError(error => {
          this.hasError = true;
          this.errorMessage = 'Boyutlara göre arama sırasında bir hata oluştu.';
          console.error('Arama hatası:', error);
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(products => {
        this.filteredProducts = products;
      });
  }

  displayProductFn(product: any): string {
    return product ? this.getProductDisplayName(product) : '';
  }

  getProductDisplayName(product: any): string {
    // Customize how products are displayed here
    if (!product) return '';

    const type = product.product_type?.type || '';
    const code = product.product_type?.code || '';

    const dimensions = product.dimension
      ? `${product.dimension.width}x${product.dimension.height}x${product.dimension.depth} ${product.dimension.unit}`
      : '';

    return `${code}-${type} ${dimensions}`;
  }

  selectProduct(product: Product): void {
    // Update form value when product is selected
    this.orderDetailForm.patchValue({
      product: product,
      unit_price: 1.00 // Default value or value from product
    });
    console.log('Selected product:', product);
    console.log('Updated form:', this.orderDetailForm.value);
  }

  onTabChange(event: any): void {
    this.activeTab = event.index;
    // Clear results when tab changes
    this.filteredProducts = [];
    this.hasError = false;
  }

  onSubmit(): void {
    if (this.orderDetailForm.valid) {
      const orderDetail = this.orderDetailForm.value;
      this.dialogRef.close(orderDetail);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

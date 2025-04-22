import { Component, inject, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { v4 as Guid} from 'uuid';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  CdkDrag,
  CdkDropList,
  CdkDragStart,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { RepositoryService } from '../../services/repository.service';
import { UiProduct } from '../ui-models/ui-product.model';
import { UiPallet } from '../ui-models/ui-pallet.model';
import { UiPackage } from '../ui-models/ui-package.model';
import { package1 } from './test/dummy-data';
import { ToastService } from '../../../../../../services/toast.service';

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
    CommonModule,
    CdkDropList,
    CdkDrag,
    MatIconModule,
  ],
  templateUrl: './pallet-control.component.html',
  styleUrl: './pallet-control.component.scss',
})
export class PalletControlComponent implements OnInit {
  @Input() order_id!: string;

  repository: RepositoryService = inject(RepositoryService);
  toastService: ToastService = inject(ToastService);

  packages: UiPackage[] = [];
  availableProducts: UiProduct[] = [];
  availablePallets: UiPallet[] = [];
  currentDraggedProduct: UiProduct | null = null;
  selectedPallets: UiPallet[] = [];
  secondFormGroup: FormGroup;

  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });
  }

  loadPallets() {
    this.repository.pallets().subscribe({
      next: (response) => {
        this.availablePallets = response;
      },
    });
  }

  // Ürünleri paletlere taşıma
  dropProductToPallet(event: CdkDragDrop<UiProduct[]>) {
    const product = event.previousContainer.data[event.previousIndex];
    const targetPalletId = event.container.id;
    const targetPackage = this.packages.find(
      (p) => p.pallet && p.pallet.id === targetPalletId
    );

    if (targetPackage && targetPackage.pallet) {
      console.log(product,targetPackage);
      const canFit = this.canFitProductToPallet(
        product,
        targetPackage.pallet,
        targetPackage.products
      );

      if (!canFit) {
        this.toastService.error('Bu ürün seçilen palete boyutlarından dolayı sığmıyor.','Bu ürün palete sığmıyor!');
        return; // Drop işlemini iptal et
      }
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  dropPalletToPackage(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      return; // Aynı konteyner içinde hareketi engelle
    }

    const packageIndex = this.packages.findIndex((p) => p.id === event.container.id);

    if (packageIndex === -1 || this.packages[packageIndex].pallet !== null) {
      return; // Geçersiz paket veya paket zaten dolu
    }

    const originalPallet = event.previousContainer.data[event.previousIndex];
    const palletClone = new UiPallet({
      ...originalPallet,
      id: Guid(), // Benzersiz ID ekliyoruz
      //TODO buraya guid ekle
    });

    this.packages[packageIndex].pallet = palletClone;
    this.selectedPallets.push(palletClone);
    this.addNewEmptyPackage();
  }

  removeProductFromPackage(package1: UiPackage, productIndex: number) {
    const removedProduct = package1.products.splice(productIndex, 1)[0];
    this.availableProducts.push(removedProduct);
  }

  removePalletFromPackage(packageItem: UiPackage) {
    if (packageItem.pallet) {
      if (packageItem.products && packageItem.products.length > 0) {
        this.availableProducts.push(...packageItem.products);
        packageItem.products = [];
      }

      const palletIndex = this.selectedPallets.findIndex(
        (p) => p.id === packageItem.pallet?.id
      );
      if (palletIndex !== -1) {
        this.selectedPallets.splice(palletIndex, 1);
      }

      packageItem.pallet = null;
    }
  }

  addNewEmptyPackage() {
    const emptyPackages = this.packages.filter((p) => p.pallet === null);

    if (emptyPackages.length < 2) {
      const newPackage = new UiPackage({
        id: Guid(),
        pallet: null,
        products: [],
        order: package1.order,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        deleted_time: null,
      });

      this.packages.push(newPackage);
    }
  }

  // Tüm palet ürün listelerini getir
  get palletProductsLists(): string[] {
    const allPalletIds: string[] = ['productsList']; // Ürün listesi de bağlantılı olsun
    this.packages.forEach((pkg) => {
      if (pkg.pallet) {
        allPalletIds.push(pkg.pallet.id);
      }
    });
    return allPalletIds;
  }

  // Boş paket listeleri
  get packageIds(): string[] {
    return this.packages
      .filter((pkg) => pkg.pallet === null) // Sadece boş paketler
      .map((pkg) => pkg.id);
  }

  getPackageData(): any {
    return {
      orderId: this.order_id,
      packages: this.packages
        .filter((pkg) => pkg.pallet !== null) // Sadece doldurulmuş paketleri gönder
        .map((pkg) => ({
          packageId: pkg.id,
          pallet: pkg.pallet
            ? {
                palletId: pkg.pallet.id[0], // Orijinal palet ID'sini al
                products: pkg.products.map((product) => ({
                  productId: product.id,
                  productName: product.name,
                  dimension: product.dimension,
                  count: product.count,
                  productType: product.product_type,
                  weightType: product.weight_type,
                })),
              }
            : null,
        })),
    };
  }

  submitForm() {
    const packageData = this.getPackageData();
    console.log('Gönderilecek veri:', packageData);
    // this.http.post('api-endpoint', packageData).subscribe(...)
  }

  ngOnInit(): void {
    console.log('Sipariş ID alındı:', this.order_id);

    this.repository.calculatePackageDetail().subscribe({
      next: (response) => {
        this.packages = response;

        response.forEach((pkg: UiPackage) => {
          if (pkg.products && pkg.products.length > 0) {
            // İhtiyac
          }
        });
        this.addNewEmptyPackage();
      },
    });
    this.loadPallets();
  }

  calculateUsedSpace(products: UiProduct[]): {
    volume: number;
    maxWidth: number;
    maxDepth: number;
  } {
    let totalVolume = 0;
    let maxWidthUsed = 0;
    let maxDepthUsed = 0;

    //burasi basit suan
    products.forEach((product) => {
      totalVolume +=
        product.dimension.width *
        product.dimension.depth *
        product.dimension.height * product.count;
      maxWidthUsed = Math.max(maxWidthUsed, product.dimension.width);
      maxDepthUsed = Math.max(maxDepthUsed, product.dimension.depth);
    });

    return {
      volume: totalVolume,
      maxWidth: maxWidthUsed,
      maxDepth: maxDepthUsed,
    };
  }

  canFitProductToPallet(product: UiProduct,pallet: UiPallet,existingProducts: UiProduct[]): boolean {
    const usedSpace = this.calculateUsedSpace(existingProducts);
    const palletVolume = pallet.dimension.width * pallet.dimension.depth * pallet.dimension.height;
    const remainingVolume = palletVolume - usedSpace.volume;
    const productVolume =product.dimension.width * product.dimension.depth * product.dimension.height * product.count;

    if (productVolume > remainingVolume) {
      console.log('Ürün hacmi paletin kalan hacminden büyük!');
      return false;
    }

    if (product.dimension.height > pallet.dimension.height) {
      console.log('Ürün yüksekliği paletin yüksekliğinden büyük!');
      return false;
    }

    const remainingWidth = pallet.dimension.width - usedSpace.maxWidth;
    const remainingDepth = pallet.dimension.depth - usedSpace.maxDepth;

    if ((product.dimension.width <= remainingWidth && product.dimension.depth <= pallet.dimension.depth) ||
      (product.dimension.width <= pallet.dimension.width && product.dimension.depth <= remainingDepth)) {
        console.log('Ürün palete sığıyor!');
      return true;
    }
    console.log('Ürün palete sığmıyor!');
    return false;
  }

  // Sürükleme başladığında çağrılacak metot - önizleme için
  dragStarted(event: CdkDragStart) {
    const product = event.source.data as UiProduct;

    this.currentDraggedProduct = product;
    this.packages.forEach((pkg) => {
      if (pkg.pallet) {
        const canFit = this.canFitProductToPallet(
          product,
          pkg.pallet,
          pkg.products
        );

        const palletElement = document.getElementById(pkg.pallet.id);
        if (palletElement) {
          if (canFit) {
            palletElement.classList.add('can-drop');
            palletElement.classList.remove('cannot-drop');
          } else {
            palletElement.classList.add('cannot-drop');
            palletElement.classList.remove('can-drop');
          }
        }
      }
    });
  }

  dragEnded() {
    this.currentDraggedProduct = null;
    document.querySelectorAll('.can-drop, .cannot-drop').forEach((el) => {
      el.classList.remove('can-drop');
      el.classList.remove('cannot-drop');
    });
  }
}

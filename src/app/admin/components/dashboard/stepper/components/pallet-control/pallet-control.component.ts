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
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

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

  packages: UiPackage[] = [];
  availableProducts: UiProduct[] = [];
  currentDraggedProduct: UiProduct | null = null;
  remainingVolume:number = 0; // Paletin kalan hacmi
  // DB'den gelen sabit palet listesi
  availablePallets: UiPallet[] = [];

  // Seçilen paletlerin klonlarını tutacağımız bir dizi
  selectedPallets: UiPallet[] = [];

  repository: RepositoryService = inject(RepositoryService);
  toastService: ToastService = inject(ToastService);

  // Paket sayacı
  private packageCounter: number = 4;

  secondFormGroup: FormGroup;

  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });
  }

  // DB'den paletleri al
  loadPallets() {
    this.repository.pallets().subscribe({
      next: (response) => {
        this.availablePallets = response;
      },
    });
  }

  // Ürünleri paletlere taşıma
  dropProductToPallet(event: CdkDragDrop<UiProduct[]>) {
    // Drag edilmekte olan ürün
    const product = event.previousContainer.data[event.previousIndex];

    // Hedef paletin bulunduğu paketi bul
    const targetPalletId = event.container.id.replace('pallet-', '');
    const targetPackage = this.packages.find(
      (p) => p.pallet && p.pallet.id === targetPalletId
    );

    if (targetPackage && targetPackage.pallet) {
      // Ürünün palete sığıp sığmadığını kontrol et
      const canFit = this.canFitProductToPallet(
        product,
        targetPackage.pallet,
        targetPackage.products
      );

      if (!canFit) {
        // Kullanıcıya bildirim göster
        this.toastService.error(
          'Bu ürün seçilen palete boyutlarından dolayı sığmıyor.',
          'Bu ürün palete sığmıyor!'
        );
        return; // Drop işlemini iptal et
      }
    }

    // Normal drop işlemini devam ettir
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

  // Paleti pakete taşıma - artık orijinal palet listesini değiştirmeden klon kullanarak
  dropPalletToPackage(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      return; // Aynı konteyner içinde hareketi engelle
    }

    // Hedef paketin indexini bul
    const packageIndex = this.packages.findIndex(
      (p) => p.id === event.container.id.replace('package-', '')
    );

    if (packageIndex === -1 || this.packages[packageIndex].pallet !== null) {
      return; // Geçersiz paket veya paket zaten dolu
    }

    // Orijinal paleti al
    const originalPallet = event.previousContainer.data[event.previousIndex];

    // Paletin derin bir kopyasını oluştur (klon)
    const palletClone = new UiPallet({
      ...originalPallet,
      id: originalPallet.id + '-clone-' + new Date().getTime(), // Benzersiz ID ekliyoruz
      //TODO buraya guid ekle
    });

    // Klonlanmış paleti pakete yerleştir
    this.packages[packageIndex].pallet = palletClone;

    // Klonlanmış paleti seçilen paletler listesine ekle
    this.selectedPallets.push(palletClone);

    // Yeni boş paket oluştur
    this.addNewEmptyPackage();
  }

  // Ürünü paletten geri çıkart
  removeProductFromPackage(package1: UiPackage, productIndex: number) {
    const removedProduct = package1.products.splice(productIndex, 1)[0];
    this.availableProducts.push(removedProduct);
  }

  // Paleti paketten çıkart
  removePalletFromPackage(packageItem: UiPackage) {
    if (packageItem.pallet) {
      // Palet içindeki tüm ürünleri ürün listesine geri ekle
      if (packageItem.products && packageItem.products.length > 0) {
        this.availableProducts.push(...packageItem.products);
        packageItem.products = [];
      }

      // Klonlanmış paleti seçilen paletler listesinden kaldır
      const palletIndex = this.selectedPallets.findIndex(
        (p) => p.id === packageItem.pallet?.id
      );
      if (palletIndex !== -1) {
        this.selectedPallets.splice(palletIndex, 1);
      }

      // Paketten paleti kaldır
      packageItem.pallet = null;
    }
  }

  // Yeni boş paket ekle
  addNewEmptyPackage() {
    // Boş paket sayısını kontrol et
    const emptyPackages = this.packages.filter((p) => p.pallet === null);

    // Eğer 2'den az boş paket varsa yeni paket ekle
    if (emptyPackages.length < 2) {
      // Yeni bir UiPackage oluşturalim
      const newPackage = new UiPackage({
        id: 'package-' + this.packageCounter++,
        pallet: null,
        products: [],
        order: package1.order, // Mevcut sipariş bilgisini kullanıyoruz
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

    // Paketlerdeki paletlerin ürün liste ID'lerini topla
    this.packages.forEach((pkg) => {
      if (pkg.pallet) {
        allPalletIds.push('pallet-' + pkg.pallet.id);
      }
    });

    return allPalletIds;
  }

  // Boş paket listeleri
  get packageIds(): string[] {
    return this.packages
      .filter((pkg) => pkg.pallet === null) // Sadece boş paketler
      .map((pkg) => 'package-' + pkg.id);
  }

  // Paket verilerini JSON olarak al (backend'e gönderme işlemi için)
  getPackageData(): any {
    return {
      orderId: this.order_id,
      packages: this.packages
        .filter((pkg) => pkg.pallet !== null) // Sadece doldurulmuş paketleri gönder
        .map((pkg) => ({
          packageId: pkg.id,
          pallet: pkg.pallet
            ? {
                palletId: pkg.pallet.id.split('-clone-')[0], // Orijinal palet ID'sini al
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

  // Formu gönder (Backend'e veri gönderme işlemi için)
  submitForm() {
    const packageData = this.getPackageData();
    console.log('Gönderilecek veri:', packageData);
    // Burada HTTP isteği ile backend'e veri gönderebilirsiniz
    // this.http.post('api-endpoint', packageData).subscribe(...)
  }

  ngOnInit(): void {
    console.log('Sipariş ID alındı:', this.order_id);

    // Paketleri ve ürünleri yükle
    this.repository.calculatePackageDetail().subscribe({
      next: (response) => {
        this.packages = response;

        // Paketlerden ürünleri çıkart (gerekiyorsa)
        response.forEach((pkg: UiPackage) => {
          if (pkg.products && pkg.products.length > 0) {
            // İhtiyaca göre ürünleri availableProducts'a ekleyebilirsin
            // this.availableProducts.push(...pkg.products);
          }
        });

        // En az 2 boş paket olduğundan emin ol
        this.addNewEmptyPackage();
      },
    });

    // Paletleri yükle
    this.loadPallets();
  }

  // Ürünün palete sığıp sığmadığını kontrol eden metot
  canFitProductToPallet(
    product: UiProduct,
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): boolean {
    // Paletin kalan kullanılabilir boyutlarını hesapla
    const usedSpace = this.calculateUsedSpace(existingProducts);

    // Paletin toplam hacmi
    const palletVolume = pallet.dimension.width * pallet.dimension.depth * pallet.dimension.height;

    // Paletin kalan hacmi
    const remainingVolume = palletVolume - usedSpace.volume;
    // Ürünün hacmi
    const productVolume =
      product.dimension.width *
      product.dimension.depth *
      product.dimension.height;

    // Hacim kontrolü
    if (productVolume > remainingVolume) {
      return false;
    }

    // Boyut kontrolü (yüksek ürünler palete sığmalı)
    if (product.dimension.height > pallet.dimension.height) {
      return false;
    }

    // Genişlik ve derinlik kontrolü (2D yerleşim kuralları)
    // Bu kısmı siz kendi yerleşim kurallarınıza göre özelleştirebilirsiniz
    // Örneğin basit bir kontrol:
    const remainingWidth = pallet.dimension.width - usedSpace.maxWidth;
    const remainingDepth = pallet.dimension.depth - usedSpace.maxDepth;

    if (
      (product.dimension.width <= remainingWidth &&
        product.dimension.depth <= pallet.dimension.depth) ||
      (product.dimension.width <= pallet.dimension.width &&
        product.dimension.depth <= remainingDepth)
    ) {
      return true;
    }

    return false;
  }

  // Bir paletteki mevcut ürünlerin kapladığı alanı hesaplayan yardımcı metot
  calculateUsedSpace(products: UiProduct[]): {
    volume: number;
    maxWidth: number;
    maxDepth: number;
  } {
    let totalVolume = 0;
    let maxWidthUsed = 0;
    let maxDepthUsed = 0;

    // Bu basit bir hesaplama - gerçek kullanımda daha karmaşık bin-packing
    // algoritmaları kullanabilirsiniz
    products.forEach((product) => {
      totalVolume +=
        product.dimension.width *
        product.dimension.depth *
        product.dimension.height;
      maxWidthUsed = Math.max(maxWidthUsed, product.dimension.width);
      maxDepthUsed = Math.max(maxDepthUsed, product.dimension.depth);
    });

    return {
      volume: totalVolume,
      maxWidth: maxWidthUsed,
      maxDepth: maxDepthUsed,
    };
  }

  // Sürükleme başladığında çağrılacak metot - önizleme için
  dragStarted(event: CdkDragStart) {
    const product = event.source.data as UiProduct;
    this.currentDraggedProduct = product;

    // Tüm paletlerin drop alanlarını kontrol et
    this.packages.forEach((pkg) => {
      if (pkg.pallet) {
        const canFit = this.canFitProductToPallet(
          product,
          pkg.pallet,
          pkg.products
        );

        // DOM manipülasyonu ile görsel geri bildirim ekle
        const palletElement = document.getElementById(
          'pallet-' + pkg.pallet.id
        );
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

  // Sürükleme bittiğinde stil sınıflarını temizle
  dragEnded() {
    this.currentDraggedProduct = null;

    // Tüm highlight'ları temizle
    document.querySelectorAll('.can-drop, .cannot-drop').forEach((el) => {
      el.classList.remove('can-drop');
      el.classList.remove('cannot-drop');
    });
  }
}

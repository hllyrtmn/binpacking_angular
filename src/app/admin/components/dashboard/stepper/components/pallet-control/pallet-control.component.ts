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
import { v4 as Guid } from 'uuid';
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
import { ToastService } from '../../../../../../services/toast.service';
import { mapPackageToPackageDetail } from '../../../../../../models/mappers/package-detail.mapper';
import { StepperStore, STATUSES } from '../../services/stepper.store';

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
  // TODO:
  // 1. next e basildiginda ng content ve benzeri birsey ile
  // componenti create etmen gerekebilir.
  // 2. bir behaviour subject data bind yaptiginda
  // diger component subscribe oldugunda veriyi islemesi gerek


  repository: RepositoryService = inject(RepositoryService);
  toastService: ToastService = inject(ToastService);
  stepperService = inject(StepperStore);

  packages: UiPackage[] = [];
  availableProducts: UiProduct[] = [];
  availablePallets: UiPallet[] = [];
  currentDraggedProduct: UiProduct | null = null;
  selectedPallets: UiPallet[] = [];
  secondFormGroup: FormGroup;
  trailer = { width: 11800, depth: 2350, height: 2400, weighLimit: 25000 };
  remainingVolume: any;
  remainingWeight: any;
  totalWeight: number = 0;
  totalMeter: number = 0;
  order:any;
  private cloneCount = 1;

  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });
  }

  configureComponent() {
    this.loadPallets();
    this.repository.calculatePackageDetail()
      .subscribe({
        next: (response) => {
          this.packages = response;
          this.order = this.packages[0].order;
          console.log("ana data",this.packages);

          this.packages.forEach((pkg, index) => {
            if (pkg.pallet) {
              pkg.pallet.id = pkg.pallet.id + '/' + index;
            }
            pkg.name = 'Palet'+ index;
          });
          this.addNewEmptyPackage();
          this.calculateVolume();
          this.calculateWeight();
          this.calculateTotalMeter();
        }
      })
  }

  calculateVolume() {
    let totalVolume = 0;
    this.packages.forEach(pkg => {
      totalVolume += Math.floor(pkg.pallet?.dimension.volume ?? 0)
      pkg.products.forEach(product => {
        totalVolume += Math.floor(product.dimension.volume);
      })
    })
    this.remainingVolume = Math.floor(((this.trailer.depth * this.trailer.height * this.trailer.width) - totalVolume) / 1000);
  }

  calculateWeight() {
    let totalWeight = 0;
    this.packages.forEach(pkg => {
      totalWeight += Math.floor(pkg.pallet?.weight ?? 0);
      pkg.products.forEach(product => {
        totalWeight += Math.floor(product.weight_type.std * product.count)
      })
    })
    this.totalWeight = totalWeight;
    this.remainingWeight = Math.floor(this.trailer.weighLimit - totalWeight);
  }

  calculateTotalMeter() {
    this.packages.forEach(pkg => {
      if (pkg.products.length > 0) {
        pkg.products.forEach(product => {
          this.totalMeter += Math.round(Math.floor(product.count * Math.floor(product.dimension.depth)));
        })
      }
    })
    this.totalMeter = this.totalMeter / 1000;
  }

  packageTotalWeight(pkg: UiPackage) {
    return pkg.totalWeight + Math.floor(pkg.pallet?.weight ?? 0);
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
      const canFit = this.canFitProductToPallet(
        product,
        targetPackage.pallet,
        targetPackage.products
      );

      if (!canFit) {
        this.toastService.error('Bu ürün seçilen palete boyutlarından dolayı sığmıyor.', 'Bu ürün palete sığmıyor!');
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

    if (targetPackage) {
      targetPackage.products = this.consolidateProducts(targetPackage.products);
    }
    this.calculateVolume();
    this.calculateWeight();
    this.calculateTotalMeter();
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
      id: originalPallet.id + '/' + this.cloneCount++, // Benzersiz ID ekliyoruz
    });

    this.packages[packageIndex].pallet = palletClone;
    this.selectedPallets.push(palletClone);
    this.addNewEmptyPackage();
  }

  removeProductFromPackage(pkg: UiPackage, productIndex: number) {
    const removedProduct = pkg.products.splice(productIndex, 1)[0];
    this.availableProducts.push(removedProduct);
    this.calculateVolume();
    this.calculateWeight();
    this.calculateTotalMeter();
  }

  removeAllPackage() {
    this.packages.forEach(pkg => {
      if (pkg.products && pkg.products.length > 0) {
        this.availableProducts.push(...pkg.products);
        pkg.products = [];
      }

      if (pkg.pallet) {
        const palletIndex = this.selectedPallets.findIndex(
          (p) => p.id === pkg.pallet?.id
        );
        if (palletIndex !== -1) {
          this.selectedPallets.splice(palletIndex, 1);
        }
        pkg.pallet = null;
      }
    });

    this.availableProducts = this.consolidateProducts(this.availableProducts);

    this.packages = [];
    const newPackage = new UiPackage({
      id: Guid(),
      pallet: null,
      products: [],
      order: this.order
    });

    this.packages.push(newPackage);
    this.calculateVolume();
    this.calculateWeight();
    this.totalMeter = 0;
    this.calculateTotalMeter();

    this.toastService.success('Tüm paketler temizlendi.', 'Başarılı');
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
      this.calculateVolume();
      this.calculateWeight();
      this.calculateTotalMeter();
    }
  }

  addNewEmptyPackage() {
    const emptyPackages = this.packages.filter((p) => p.pallet === null);

    if (emptyPackages.length < 2) {
      const newPackage = new UiPackage({
        id: Guid(),
        pallet: null,
        products: [],
        order: this.order
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
    return mapPackageToPackageDetail(this.packages);
  }

  submitForm() {
    const packageData = this.getPackageData();
    console.log('Submitteki data',packageData)
    this.repository.bulkCreatePackageDetail(packageData).subscribe({
      next: response => {
        this.toastService.success("Kaydedildi", "Basarili")
        this.stepperService.setStepStatus(2,STATUSES.completed,true);
      }
    });
    // this.http.post('api-endpoint', packageData).subscribe(...)
  }

  ngOnInit(): void {
  }

  // Python:
  //TODO : bu kisim komple python ile ayni
  calculateUsedSpace(products: UiProduct[]): {
    volume: number;
    maxWidth: number;
    maxDepth: number;
    layeredItems: number;
  } {
    let totalVolume = 0;
    let maxWidthUsed = 0;
    let maxDepthUsed = 0;

    products.forEach((product) => {
      totalVolume +=
        product.dimension.width *
        product.dimension.depth *
        product.dimension.height * product.count;
      maxWidthUsed = Math.max(maxWidthUsed, product.dimension.width);
      maxDepthUsed = Math.max(maxDepthUsed, product.dimension.depth);
    });

    const layeredItems = this.calculateCurrentLayerUsage(products);

    return {
      volume: totalVolume,
      maxWidth: maxWidthUsed,
      maxDepth: maxDepthUsed,
      layeredItems: layeredItems
    };
  }

  calculateCurrentLayerUsage(products: UiProduct[]): number {
    if (products.length === 0) return 0;
    const standardProduct = products[0];
    const totalArea = products.reduce((total, product) => {
      return total + (product.dimension.width * product.dimension.depth * product.count);
    }, 0);

    return totalArea / (standardProduct.dimension.width * standardProduct.dimension.depth);
  }

  canFitProductToPallet(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): boolean {
    const usedSpace = this.calculateUsedSpace(existingProducts);
    const palletVolume = pallet.dimension.width * pallet.dimension.depth * pallet.dimension.height;
    const remainingVolume = palletVolume - usedSpace.volume;
    const productVolume = product.dimension.width * product.dimension.depth * product.dimension.height * product.count;

    if (productVolume > remainingVolume) {
      console.log('Ürün hacmi paletin kalan hacminden büyük!');
      return false;
    }

    if (product.dimension.height > pallet.dimension.height) {
      console.log('Ürün yüksekliği paletin yüksekliğinden büyük!');
      return false;
    }

    if (this.canFitExactly(product, pallet)) {
      const itemsPerLayer = this.calculateItemsPerLayerExactly(product, pallet);
      const layersPerBox = Math.floor(pallet.dimension.height / product.dimension.height);
      const totalCapacity = itemsPerLayer * layersPerBox;

      const existingCapacity = existingProducts.reduce((total, existingProduct) => {
        if (this.areSimilarDimensions(existingProduct, product)) {
          return total + existingProduct.count;
        }
        return total;
      }, 0);

      const totalRequiredCapacity = existingCapacity + product.count;

      if (totalRequiredCapacity > totalCapacity) {
        console.log('Toplam ürün sayısı paletin kapasitesinden fazla!');
        return false;
      }

      console.log('Ürün palete tam olarak sığıyor!');
      return true;
    }

    if (existingProducts.length > 0) {
      const differentDimensionProducts = existingProducts.filter(
        existingProduct => !this.areSimilarDimensions(existingProduct, product)
      );

      if (differentDimensionProducts.length > 0) {
        console.log('Palete farklı boyutta ürünler yerleştirilemez!');
        return false;
      }
    }

    const groupedProducts = this.groupProductsByDimension([...existingProducts, product]);
    if (groupedProducts.length <= 1) {
      // Eğer tüm ürünler aynı boyut grubundaysa, optimize bir şekilde yerleştirebiliriz
      console.log('Ürün palete benzer ürünlerle birlikte sığabilir.');
      return true;
    }

    console.log('Ürün palete sığmıyor!');
    return false;
  }

  areSimilarDimensions(product1: UiProduct, product2: UiProduct): boolean {
    return (
      (Math.abs(product1.dimension.width - product2.dimension.width) < 0.01 &&
        Math.abs(product1.dimension.depth - product2.dimension.depth) < 0.01) ||
      (Math.abs(product1.dimension.width - product2.dimension.depth) < 0.01 &&
        Math.abs(product1.dimension.depth - product2.dimension.width) < 0.01)
    );
  }

  canFitExactly(product: UiProduct, pallet: UiPallet): boolean {
    return (pallet.dimension.width % product.dimension.width === 0 &&
      pallet.dimension.depth % product.dimension.depth === 0) ||
      (pallet.dimension.width % product.dimension.depth === 0 &&
        pallet.dimension.depth % product.dimension.width === 0);
  }

  calculateItemsPerLayerExactly(product: UiProduct, pallet: UiPallet): number {
    if (pallet.dimension.width % product.dimension.width === 0 &&
      pallet.dimension.depth % product.dimension.depth === 0) {
      return Math.floor(pallet.dimension.width / product.dimension.width) *
        Math.floor(pallet.dimension.depth / product.dimension.depth);
    } else {
      return Math.floor(pallet.dimension.width / product.dimension.depth) *
        Math.floor(pallet.dimension.depth / product.dimension.width);
    }
  }

  groupProductsByDimension(products: UiProduct[]): UiProduct[][] {
    const groupedByWidth: { [key: number]: UiProduct[] } = {};

    products.forEach(product => {
      const widthKey = Math.floor(product.dimension.width);
      if (!groupedByWidth[widthKey]) {
        groupedByWidth[widthKey] = [];
      }
      groupedByWidth[widthKey].push(product);
    });

    Object.keys(groupedByWidth).forEach(widthKey => {
      groupedByWidth[Number(widthKey)].sort((a, b) =>
        b.dimension.depth - a.dimension.depth
      );
    });

    return Object.values(groupedByWidth);
  }

  findBestBoxForGroup(group: UiProduct[], pallets: UiPallet[]): UiPallet | null {
    if (group.length === 0) return null;

    const maxDepth = Math.max(...group.map(product => product.dimension.depth));
    const maxWidth = Math.max(...group.map(product => product.dimension.width));

    for (const pallet of pallets) {
      if ((pallet.dimension.width % maxWidth === 0 && pallet.dimension.depth % maxDepth === 0) ||
        (pallet.dimension.width % maxDepth === 0 && pallet.dimension.depth % maxWidth === 0)) {

        const palletCopy = { ...pallet };
        if (pallet.dimension.width % maxDepth === 0 && pallet.dimension.depth % maxWidth === 0) {
          palletCopy.dimension.width = pallet.dimension.depth
          palletCopy.dimension.depth = pallet.dimension.width
          palletCopy.dimension.height = pallet.dimension.height
        }

        return palletCopy;
      }
    }

    return null;
  }
  //TODO : Yukarisi python ile ayni

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

  consolidateProducts(products: UiProduct[]) {
    const groupedProducts = new Map();

    products.forEach(product => {
      const mainId = product.id.split('/')[0];

      if (groupedProducts.has(mainId)) {
        const existingProduct = groupedProducts.get(mainId);
        existingProduct.count += product.count;
      } else {
        const newProduct = { ...product };
        newProduct.id = mainId;
        groupedProducts.set(mainId, newProduct);
      }
    });
    return Array.from(groupedProducts.values());
  }


  dragEnded() {
    this.currentDraggedProduct = null;
    document.querySelectorAll('.can-drop, .cannot-drop').forEach((el) => {
      el.classList.remove('can-drop');
      el.classList.remove('cannot-drop');
    });
  }

  splitProduct(product: UiProduct) {
    const products = product.split();

    const index = this.availableProducts.indexOf(product);
    if (index !== -1) {
      this.availableProducts.splice(index, 1);
    }
    this.availableProducts.push(...products);

  }
}

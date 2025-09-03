import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, computed, signal, effect, AfterViewInit, OnDestroy, WritableSignal } from '@angular/core';
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
import { LocalStorageService } from '../../services/local-storage.service';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../../../store';
import * as StepperSelectors from '../../../../../../store/stepper/stepper.selectors';
import { skip, takeUntil } from 'rxjs/operators';

import {
  selectStep2Packages, selectStep2RemainingProducts, selectStep2IsDirty,
  selectStep2Changes
} from '../../../../../../store/stepper/stepper.selectors';
import * as StepperActions from '../../../../../../store/stepper/stepper.actions';
import { of, Subject } from 'rxjs';

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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PalletControlComponent implements OnInit, AfterViewInit, OnDestroy {
  // Service injections
  repository: RepositoryService = inject(RepositoryService);
  toastService: ToastService = inject(ToastService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly store = inject(Store<AppState>);
  private readonly cdr = inject(ChangeDetectorRef);


  uiPackages = this.store.selectSignal(StepperSelectors.selectUiPackages)
  remainingProducts = this.store.selectSignal(StepperSelectors.selectStep2RemainingProducts)

  // NgRx Step2 Migration Observables
  public step2Packages$ = this.store.select(selectStep2Packages);
  public step2RemainingProducts$ = this.store.select(selectStep2RemainingProducts);
  public step2IsDirty$ = this.store.select(selectStep2IsDirty);
  public step2Changes$ = this.store.select(selectStep2Changes);

  public isDirtySignal = this.store.selectSignal(selectStep2IsDirty);
  public orderSignal = this.store.selectSignal(StepperSelectors.selectOrder);

  private lastPackageState: string = '';
  private autoSaveTimeout: any;
  private isDragInProgress: boolean = false;
  private destroy$ = new Subject<void>();

  public availablePallets = signal<UiPallet[]>([]);
  public selectedPallets = signal<UiPallet[]>([]);

  public hasPackage = this.store.selectSignal(StepperSelectors.hasPackage);
  public uiPackageCount = this.store.selectSignal(StepperSelectors.uiPackageCount);
  public hasRemainingProduct = this.store.selectSignal(StepperSelectors.hasRemainingProduct);
  public remainingProductCount = this.store.selectSignal(StepperSelectors.remainingProductCount);
  public allDropListIds = this.store.selectSignal(StepperSelectors.allDropListIds);
  public packageDropListIds = this.store.selectSignal(StepperSelectors.packageDropListIds);
  public palletDropListIds = this.store.selectSignal(StepperSelectors.palletDropListIds);

  // Form and other properties
  secondFormGroup: FormGroup;
  currentDraggedProduct: UiProduct | null = null;

  // Weight and dimension calculations
  public totalWeight = this.store.selectSignal(StepperSelectors.selectTotalWeight);


  public remainingWeight = this.store.selectSignal(StepperSelectors.selectRemainingWeight);
  public totalMeter = this.store.selectSignal(StepperSelectors.selectTotalMeter);
  public remainingArea = this.store.selectSignal(StepperSelectors.selectRemainingArea);

  public heaviestPalletWeight = this.store.selectSignal(StepperSelectors.selectHeaviestPalletWeight);
  public lightestPalletWeight = this.store.selectSignal(StepperSelectors.selectLightestPalletWeight);
  public averagePalletWeight = this.store.selectSignal(StepperSelectors.selectAveragePalletWeight);


  // Pallet weight analytics
  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });

  }


  ngOnInit(): void {
    this.loadPallets()
  }

  ngAfterViewInit(): void {

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }



  loadPallets(): void {
    this.repository.pallets().subscribe({
      next: (response) => {
        this.availablePallets.set(response);
      },
    });
  }

  forceSaveStep2(): void {
    const autoSaveData = {
      packages: this.uiPackages(),
      availableProducts: this.remainingProducts(),
      totalWeight: this.totalWeight(),
      totalMeter: this.totalMeter(),
      remainingArea: this.remainingArea(),
      remainingWeight: this.remainingWeight(),
    };

    this.store.dispatch(StepperActions.forceSave({
      stepNumber: 1,
      data: autoSaveData
    }));
  }


  // Dimension and fit checking methods
  canFitProductToPallet(
    product: UiProduct,
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): boolean {
    if (!this.checkDimensionsFit(product, pallet)) {
      return false;
    }
    return this.checkVolumeAvailable(product, pallet, existingProducts);
  }

  private checkDimensionsFit(product: UiProduct, pallet: UiPallet): boolean {
    if (!product?.dimension || !pallet?.dimension) {
      return false;
    }

    const safeProductWidth = this.safeNumber(product.dimension.width);
    const safeProductDepth = this.safeNumber(product.dimension.depth);
    const safeProductHeight = this.safeNumber(product.dimension.height);
    const safePalletWidth = this.safeNumber(pallet.dimension.width);
    const safePalletDepth = this.safeNumber(pallet.dimension.depth);
    const safePalletHeight = this.safeNumber(pallet.dimension.height);

    if (safeProductHeight > safePalletHeight) {
      return false;
    }

    const normalFit =
      safeProductWidth <= safePalletWidth &&
      safeProductDepth <= safePalletDepth;
    const rotatedFit =
      safeProductWidth <= safePalletDepth &&
      safeProductDepth <= safePalletWidth;

    return normalFit || rotatedFit;
  }

  private checkVolumeAvailable(
    product: UiProduct,
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): boolean {
    if (!product?.dimension || !pallet?.dimension) {
      return false;
    }

    const palletTotalVolume =
      this.safeNumber(pallet.dimension.width) *
      this.safeNumber(pallet.dimension.depth) *
      this.safeNumber(pallet.dimension.height);

    const usedVolume = this.calculateUsedVolume(existingProducts);

    const newProductVolume =
      this.safeNumber(product.dimension.width) *
      this.safeNumber(product.dimension.depth) *
      this.safeNumber(product.dimension.height) *
      this.safeNumber(product.count);

    return newProductVolume <= palletTotalVolume - usedVolume;
  }

  private calculateUsedVolume(products: UiProduct[]): number {
    if (products.length === 0) return 0;

    return products.reduce((total, product) => {
      if (!product?.dimension) {
        return total;
      }
      const volume =
        this.safeNumber(product.dimension.width) *
        this.safeNumber(product.dimension.depth) *
        this.safeNumber(product.dimension.height) *
        this.safeNumber(product.count);
      return total + volume;
    }, 0);
  }

  private safeNumber(value: any): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }

    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }

    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'object' && value.value !== undefined) {
      return this.safeNumber(value.value);
    }

    return 0;
  }

  getRemainingPalletVolume(
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): number {
    if (!pallet?.dimension) {
      return 0;
    }
    const palletTotalVolume =
      this.safeNumber(pallet.dimension.width) *
      this.safeNumber(pallet.dimension.depth) *
      this.safeNumber(pallet.dimension.height);
    const usedVolume = this.calculateUsedVolume(existingProducts);
    return Math.max(0, palletTotalVolume - usedVolume);
  }

  getPalletFillPercentage(
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): number {
    if (!pallet?.dimension) {
      return 0;
    }
    const palletTotalVolume =
      this.safeNumber(pallet.dimension.width) *
      this.safeNumber(pallet.dimension.depth) *
      this.safeNumber(pallet.dimension.height);
    const usedVolume = this.calculateUsedVolume(existingProducts);
    return Math.round((usedVolume / palletTotalVolume) * 100);
  }

  getMaxProductCount(
    product: UiProduct,
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): number {
    if (!product?.dimension || !pallet?.dimension) {
      return 0;
    }

    if (!this.checkDimensionsFit(product, pallet)) {
      return 0;
    }

    const remainingVolume = this.getRemainingPalletVolume(
      pallet,
      existingProducts
    );
    const singleProductVolume =
      this.safeNumber(product.dimension.width) *
      this.safeNumber(product.dimension.depth) *
      this.safeNumber(product.dimension.height);

    return Math.floor(remainingVolume / singleProductVolume);
  }

  consolidateProducts(products: UiProduct[]): UiProduct[] {
    const consolidatedMap = new Map<string, UiProduct>();

    for (const product of products) {
      const uiProduct = product
      const mainId = uiProduct.id.split('/')[0];

      const existing = consolidatedMap.get(mainId);
      if (existing) {
        existing.count += uiProduct.count;
      } else {
        consolidatedMap.set(
          mainId,
          new UiProduct({
            ...uiProduct,
            id: mainId,
          })
        );
      }
    }

    return Array.from(consolidatedMap.values());
  }

  // Drag & Drop Event Handlers
  dropProductToPallet(event: CdkDragDrop<UiProduct[]>): void {

    if (event.previousContainer === event.container) {
      if (event.container.id === 'productsList') {
        this.store.dispatch(StepperActions.remainingProductMoveProduct({
          previousIndex: event.previousIndex,
          currentIndex: event.currentIndex
        }));
      } else {
        this.store.dispatch(StepperActions.moveUiProductInSamePackage({
          currentIndex: event.currentIndex,
          previousIndex: event.previousIndex,
          containerId: event.container.id,
        }))
      }
      return;
    }

    // Paletten available products'a geri alma
    if (event.container.id === 'productsList') {
      this.store.dispatch(StepperActions.moveProductToRemainingProducts({
        uiProducts: event.previousContainer.data,
        previousIndex: event.previousIndex,
        previousContainerId: event.previousContainer.id
      }))
      return;
    }

    // Hedef palet bulma
    const targetPalletId = event.container.id;
    const currentPackages = this.uiPackages();
    const targetPackage = currentPackages.find(p => p.pallet && p.pallet.id === targetPalletId);

    if (!targetPackage) {
      console.error('target package bulma hatasi')
      return;
    };

    // Source container'ın palet mi yoksa productsList mi olduğunu kontrol et
    const isSourceFromPallet = event.previousContainer.id !== 'productsList';
    const product = event.previousContainer.data[event.previousIndex];

    if (isSourceFromPallet) {
      // Palet-to-palet transfer
      const sourcePackage = currentPackages.find(pkg =>
        pkg.pallet && pkg.pallet.id === event.previousContainer.id
      );

      if (sourcePackage) {
        // Sığma kontrolü
        if (targetPackage.pallet) {
          const canFit = this.canFitProductToPallet(product, targetPackage.pallet, targetPackage.products);
          if (!canFit) {
            const fillPercentage = this.getPalletFillPercentage(targetPackage.pallet, targetPackage.products);
            this.toastService.error(`Ürün bu palete sığmıyor. Palet doluluk: %${fillPercentage}`, 'Boyut Hatası');
            return;
          }
        }
        this.store.dispatch(StepperActions.moveUiProductInPackageToPackage({
          sourcePackage: sourcePackage,
          targetPackage: targetPackage,
          previousIndex: event.previousIndex
        }))
        return;
      }
    }

    // Available products'tan palete transfer
    if (targetPackage.pallet) {
      const canFit = this.canFitProductToPallet(product, targetPackage.pallet, targetPackage.products);
      if (!canFit) {
        const fillPercentage = this.getPalletFillPercentage(targetPackage.pallet, targetPackage.products);
        this.toastService.error(`Ürün bu palete sığmıyor. Palet doluluk: %${fillPercentage}`, 'Boyut Hatası');
        return;
      }
    }
    this.store.dispatch(StepperActions.moveRemainingProductFromPackage({
      targetPackage: targetPackage,
      previousIndex: event.previousIndex
    }));
    return
  }

  dropPalletToPackage(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) return;
    this.store.dispatch(StepperActions.movePalletToPackage({
      containerId: event.container.id,
      previousIndex: event.previousIndex,
      previousContainerData: event.previousContainer.data
    }))

  }

  dragStarted(event: CdkDragStart): void {
    this.isDragInProgress = true;

    const product = event.source.data as UiProduct;

    this.currentDraggedProduct = product;

    const palletElements = new Map<string, HTMLElement>();

    if (!product?.dimension) {
      this.toastService.error('Ürün boyut bilgisi eksik');
      return;
    }

    this.uiPackages().forEach((pkg, index) => {
      if (pkg.pallet) {
        const palletElement = document.getElementById(pkg.pallet.id);
        if (palletElement) {
          palletElements.set(pkg.pallet.id, palletElement);
        }
      }
    });

    this.uiPackages().forEach((pkg, index) => {
      if (pkg.pallet) {
        const canFit = this.canFitProductToPallet(
          product,
          pkg.pallet,
          pkg.products
        );
        const palletElement = palletElements.get(pkg.pallet.id);

        if (palletElement) {
          if (canFit) {
            palletElement.classList.add('can-drop');
            palletElement.classList.remove('cannot-drop');

            const maxCount = this.getMaxProductCount(
              product,
              pkg.pallet,
              pkg.products
            );
            palletElement.title = `✅ Bu palete maksimum ${maxCount} adet sığabilir`;
          } else {
            palletElement.classList.add('cannot-drop');
            palletElement.classList.remove('can-drop');

            const fillPercentage = this.getPalletFillPercentage(
              pkg.pallet,
              pkg.products
            );
            const singleVolume =
              this.safeNumber(product.dimension.width) *
              this.safeNumber(product.dimension.depth) *
              this.safeNumber(product.dimension.height);
            const remainingVolume = this.getRemainingPalletVolume(
              pkg.pallet,
              pkg.products
            );
            const maxCount = Math.floor(remainingVolume / singleVolume);

            if (maxCount > 0) {
              palletElement.title = `⚠️ Sadece ${maxCount} adet sığar (Doluluk: %${fillPercentage})`;
            } else {
              palletElement.title = `❌ Sığmaz - Palet doluluk: %${fillPercentage}`;
            }
          }
        }
      }
    });
  }

  dragEnded(): void {
    this.isDragInProgress = false;
    this.currentDraggedProduct = null;

    document.querySelectorAll('.can-drop, .cannot-drop').forEach((el) => {
      el.classList.remove('can-drop', 'cannot-drop');
    });

  }

  // Product manipulation methods
  splitProduct(product: UiProduct, splitCount?: number | null): void {
    // const uiProduct = this.ensureUiProductInstance(product);
    // const validatedCount = this.validateSplitCount(uiProduct, splitCount);

    // if (validatedCount === null) return;

    // const currentProducts = this.remainingProductsSignal();
    // const isCustomSplit = splitCount !== Math.floor(product.count / 2);

    // if (isCustomSplit) {
    //   const firstPart = new UiProduct({
    //     ...product,
    //     count: validatedCount,
    //     id: `${product.id}/1`,
    //   });

    //   const secondPart = new UiProduct({
    //     ...product,
    //     count: product.count - validatedCount,
    //     id: `${product.id}/2`,
    //   });

    //   const updatedProducts = currentProducts.filter(p => p !== product);
    //   updatedProducts.push(firstPart, secondPart);
    //   this.remainingProductsSignal.set(updatedProducts);

    //   this.toastService.success(
    //     `${product.name} ${validatedCount} ve ${product.count - validatedCount
    //     } adet olarak bölündü.`,
    //     'Başarılı'
    //   );
    // } else {
    //   if (typeof product.split !== 'function') return;

    //   const splitProducts = product.split();
    //   const updatedProducts = currentProducts.filter(p => p !== product);
    //   updatedProducts.push(...splitProducts);
    //   this.remainingProductsSignal.set(updatedProducts);

    //   this.toastService.success(`${product.name} yarıya bölündü.`, 'Başarılı');
    // }

    // this.store.dispatch(StepperActions.updateAvailableProducts({
    //   availableProducts: this.remainingProductsSignal()
    // }));

  }

  private validateSplitCount(
    product: UiProduct,
    splitCount?: number | null
  ): number | null {
    if (splitCount !== undefined && splitCount !== null) {
      if (splitCount <= 0 || splitCount >= product.count) {
        this.toastService.warning(
          `Geçersiz adet girişi. 1 ile ${product.count - 1
          } arasında bir değer giriniz.`,
          'Uyarı'
        );
        return null;
      }
      return splitCount;
    }

    if (product.count <= 1) {
      this.toastService.warning('Bu ürün bölünemez (1 adet)', 'Uyarı');
      return null;
    }

    return Math.floor(product.count / 2);
  }

  removeProductFromPackage(pkg: UiPackage, productIndex: number): void {
    // const currentPackages = this.packagesSignal();
    // const currentAvailableProducts = this.remainingProductsSignal();

    // const productToRemove = pkg.products[productIndex];
    // if (!productToRemove) return;

    // const updatedPackageProducts = [...pkg.products];
    // const removedProduct = updatedPackageProducts.splice(productIndex, 1)[0];

    // const updatedPackage = { ...pkg, products: updatedPackageProducts };
    // const updatedPackages = currentPackages.map(p =>
    //   p.id === pkg.id ? updatedPackage : p
    // ) as UiPackage[];

    // const updatedAvailableProducts = [...currentAvailableProducts, removedProduct];

    // this.packagesSignal.set(updatedPackages);
    // this.remainingProductsSignal.set(updatedAvailableProducts);

    // this.store.dispatch(StepperActions.updatePackage({ package: updatedPackage }));
    // this.store.dispatch(StepperActions.updateAvailableProducts({ availableProducts: updatedAvailableProducts }));

    // this.toastService.success(`${removedProduct.name} ürünü çıkarıldı`);
  }


  removeAllPackage(): void {
    // const currentPackages = this.packagesSignal();
    // const allProducts: UiProduct[] = [];

    // currentPackages.forEach((pkg) => {
    //   if (pkg.products?.length > 0) {
    //     allProducts.push(...this.ensureUiProducts(pkg.products));
    //   }
    // });

    // const consolidatedProducts = this.consolidateProducts([
    //   ...this.remainingProductsSignal(),
    //   ...allProducts
    // ]);

    // this.packagesSignal.set([]);
    // this.remainingProductsSignal.set(consolidatedProducts);
    // this.selectedPallets.set([]);

    // this.store.dispatch(StepperActions.initializeStep2State({
    //   packages: [],
    //   remainingProducts: consolidatedProducts
    // }));

    // this.addNewEmptyPackage();
    // this.toastService.success('Tüm paletler temizlendi.', 'Başarılı');
  }

  removePackage(packageToRemove: any): void {
    // const currentPackages = this.packagesSignal();
    // const packageIndex = currentPackages.findIndex(
    //   (pkg) => pkg === packageToRemove || (pkg.id && packageToRemove.id && pkg.id === packageToRemove.id)
    // );

    // if (packageIndex === -1) {
    //   this.toastService.error('Paket bulunamadı.', 'Hata');
    //   return;
    // }

    // const pkg = currentPackages[packageIndex];

    // if (pkg.products?.length > 0) {
    //   const productsToReturn = this.ensureUiProducts(pkg.products);
    //   const updatedProducts = [...this.remainingProductsSignal(), ...productsToReturn];
    //   const consolidatedProducts = this.consolidateProducts(updatedProducts);
    //   this.remainingProductsSignal.set(consolidatedProducts);
    // }

    // if (pkg.pallet) {
    //   const currentSelectedPallets = this.selectedPallets();
    //   const palletIndex = currentSelectedPallets.findIndex(pallet => pallet === pkg.pallet);
    //   if (palletIndex !== -1) {
    //     const updatedSelectedPallets = [...currentSelectedPallets];
    //     updatedSelectedPallets.splice(palletIndex, 1);
    //     this.selectedPallets.set(updatedSelectedPallets);
    //   }
    // }

    // const updatedPackages = currentPackages.filter((_, index) => index !== packageIndex);
    // this.packagesSignal.set(updatedPackages);

    // this.store.dispatch(StepperActions.deletePackage({ packageId: pkg.id }));

    // if (this.packagesSignal().length === 0) {
    //   this.addNewEmptyPackage();
    // }

    // this.toastService.success('Paket silindi.', 'Başarılı');
  }

  removePalletFromPackage(packageItem: UiPackage): void {
    // if (!packageItem.pallet) return;

    // if (packageItem.products?.length > 0) {
    //   const uiProducts = this.ensureUiProducts(packageItem.products);
    //   const currentAvailableProducts = this.remainingProductsSignal();
    //   const updatedProducts = [...currentAvailableProducts, ...uiProducts];
    //   this.remainingProductsSignal.set(updatedProducts);
    // }

    // const currentSelectedPallets = this.selectedPallets();
    // const palletIndex = currentSelectedPallets.findIndex(p => p.id === packageItem.pallet?.id);
    // if (palletIndex !== -1) {
    //   const updatedSelectedPallets = [...currentSelectedPallets];
    //   updatedSelectedPallets.splice(palletIndex, 1);
    //   this.selectedPallets.set(updatedSelectedPallets);
    // }

    // const currentPackages = this.packagesSignal();
    // const updatedPackages = currentPackages.map(pkg =>
    //   pkg.id === packageItem.id ? { ...pkg, pallet: null, products: [] } : pkg
    // ) as UiPackage[];
    // this.packagesSignal.set(updatedPackages);

    // this.store.dispatch(StepperActions.updatePackage({
    //   package: { ...packageItem, pallet: null, products: [] }
    // }));
  }


  submitForm(): void {
    //   const currentPackages = this.uiPackages();
    //   const packageData = mapPackageToPackageDetail(currentPackages);

    // this.repository.bulkCreatePackageDetail(packageData).subscribe({
    //     next: (response) => {
    //       this.toastService.success('Kaydedildi', 'Başarılı');

    //       this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 1 }));
    //       this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 1, isValid: true }));

    //       this.store.dispatch(StepperActions.triggerAutoSave({
    //         stepNumber: 1,
    //         data: {
    //           packages: currentPackages,
    //           availableProducts: this.remainingProductsSignal()
    //         },
    //         changeType: 'api-response'
    //       }));

    //     },
    //     error: (error) => {
    //       this.store.dispatch(StepperActions.setGlobalError({
    //         error: {
    //           message: 'Paket verileri kaydedilirken hata oluştu: ' + (error.message || error),
    //           code: error.status?.toString(),
    //           stepIndex: 1
    //         }
    //       }));

    //       this.toastService.error('Paket verileri kaydedilemedi');
    //     }
    //   });
    // }
  }
}

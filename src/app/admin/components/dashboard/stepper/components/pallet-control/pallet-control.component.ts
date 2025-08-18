import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, computed, signal, effect, AfterViewInit } from '@angular/core';
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
import { LocalStorageService } from '../../services/local-storage.service';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../../../store';
import * as StepperSelectors from '../../../../../../store/stepper/stepper.selectors';
import { map, shareReplay, skip, switchMap, take, takeUntil } from 'rxjs/operators';

import { selectStep2Packages, selectStep2AvailableProducts, selectStep2IsDirty,
         selectStep2Changes } from '../../../../../../store/stepper/stepper.selectors';
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
export class PalletControlComponent implements OnInit,AfterViewInit {
  // Service injections
  repository: RepositoryService = inject(RepositoryService);
  toastService: ToastService = inject(ToastService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly store = inject(Store<AppState>);
  private readonly cdr = inject(ChangeDetectorRef);

  // NgRx Step2 Migration Observables
  public step2Packages$ = this.store.select(selectStep2Packages);
  public step2AvailableProducts$ = this.store.select(selectStep2AvailableProducts);
  public step2IsDirty$ = this.store.select(selectStep2IsDirty);
  public step2Changes$ = this.store.select(selectStep2Changes);

  // NgRx Observables
  public isEditMode$ = this.store.select(StepperSelectors.selectIsEditMode);
  public editOrderId$ = this.store.select(StepperSelectors.selectEditOrderId);
  public autoSaveStatus$ = this.store.select(StepperSelectors.selectStepAutoSaveStatus(1));
  public autoSaveStatusText$ = this.store.select(StepperSelectors.selectAutoSaveStatusText(1));
  public hasPendingChanges$ = this.store.select(StepperSelectors.selectStepHasPendingChanges(1));

  // YENİ: Form change tracking
  private lastPackageState: string = '';
  private autoSaveTimeout: any;
  private isDragInProgress: boolean = false;
  private destroy$ = new Subject<void>();
  // Main data properties

  public packages = signal<UiPackage[]>([], { equal: (a, b) => {
    if (a.length !== b.length) return false;
    return a.every((pkg, i) => pkg.id === b[i]?.id && pkg.products.length === b[i]?.products.length);
  }});
  public availableProducts = signal<UiProduct[]>([], { equal: (a, b) => {
    if (a.length !== b.length) return false;
    return a.every((prod, i) => prod.id === b[i]?.id && prod.count === b[i]?.count);
  }});

  // Computed signals ekleyin performans için
  public packageCount = computed(() => this.packages().length);
  public availableProductCount = computed(() => this.availableProducts().length);
  public hasPackages = computed(() => this.packages().length > 0);
  public hasAvailableProducts = computed(() => this.availableProducts().length > 0);

  public availablePallets = signal<UiPallet[]>([]);
  public selectedPallets = signal<UiPallet[]>([]);

  public availablePalletCount = computed(() => this.availablePallets().length);
  public selectedPalletCount = computed(() => this.selectedPallets().length);
  public hasAvailablePallets = computed(() => this.availablePallets().length > 0);
  public hasSelectedPallets = computed(() => this.selectedPallets().length > 0);

  secondFormGroup: FormGroup;
  order: any;

  // Drag & Drop
  currentDraggedProduct: UiProduct | null = null;

  // Trailer specifications

  // Utility
  private cloneCount = 1;

  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });
  }

  trackByPackageId(index: number, item: UiPackage): string {
    return item.id;
  }

  trackByProductId(index: number, item: UiProduct): string {
    return item.id;
  }

  trackByPalletId(index: number, item: UiPallet): string {
    return item.id;
  }

  public totalWeight = computed(() => {
    const packages = this.packages();
    if (packages.length === 0) return 0;

    return packages.reduce((total, pkg) => {
      const palletWeight = Math.floor(pkg.pallet?.weight ?? 0);
      const productsWeight = pkg.products.reduce((pTotal, product) => {
        let weight = 0;
        if (this.order?.weight_type === 'eco') {
          weight = product.weight_type.eco;
        } else if (this.order?.weight_type === 'std') {
          weight = product.weight_type.std;
        } else if (this.order?.weight_type === 'pre') {
          weight = product.weight_type.pre;
        }
        return pTotal + Math.floor(weight * product.count);
      }, 0);
      return total + palletWeight + productsWeight;
    }, 0);
  });

  public remainingWeight = computed(() => {
    const trailerWeightLimit = this.order.truck?.weight_limit ?? 0;
    return Math.floor(trailerWeightLimit - this.totalWeight());
  });

  public totalMeter = computed(() => {
    const packages = this.packages();
    return packages.reduce((total, pkg) => {
      if (pkg.products.length === 0) return total;

      const packageMeter = pkg.products.reduce((pTotal, product) => {
        const productDepth = product.dimension?.depth ?? 0;
        return pTotal + Math.round(Math.floor(product.count * Math.floor(productDepth)));
      }, 0);

      return total + packageMeter;
    }, 0) / 1000;
  });

  public remainingArea = computed(() => {
    const packages = this.packages();
    const totalArea = packages.reduce((total, pkg) => {
      const palletArea = Math.floor(
        (pkg.pallet?.dimension.width ?? 0) * (pkg.pallet?.dimension.depth ?? 0)
      );
      return total + palletArea;
    }, 0);

    const trailerArea = (this.order.truck?.dimension?.width ?? 0) * (this.order.truck?.dimension?.depth ?? 0);
    return Math.floor((trailerArea - totalArea) / 1000000);
  });

  forceSaveStep2(): void {
    const autoSaveData = {
      packages: this.packages(),
      availableProducts: this.availableProducts(),
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  ngOnInit(): void {
    if (!this.checkPrerequisites()) return;
    this.loadPallets();
    // İlk yükleme için store'dan veri kontrol et
    this.step2Packages$.pipe(
      take(1),
      switchMap(storePackages => {
        if (storePackages.length > 0) {
          // Store'da data var, signal'ları initialize et
          const uiPackages = storePackages.map(pkg => new UiPackage(pkg));
          this.packages.set(uiPackages);
          this.order = this.packages()[0].order
          // Available products'ı da yükle
          this.step2AvailableProducts$.pipe(take(1)).subscribe(storeProducts => {
            const uiProducts = storeProducts.map(product => new UiProduct(product));
            this.availableProducts.set(uiProducts);
          });

          this.restoreFromSession();
          return of(true);
        } else {
          // Store'da data yok, configure et
          this.restoreFromSession();
          this.configureComponent();
          return of(false);
        }
      })
    ).subscribe();

    this.setupStoreSubscriptions();
    this.setupAutoSaveListeners();
  }

  ngAfterViewInit(): void {
      this.saveCurrentStateToSession();

  }

  private setupStoreSubscriptions(): void {
    // Packages değiştiğinde component'i güncelle
    this.step2Packages$.pipe(
      skip(1), // İlk değeri skip et (ngOnInit'de zaten handle ettik)
      takeUntil(this.destroy$)
    ).subscribe(packages => {
      if (packages.length > 0) {
        const uiPackages = packages.map(pkg => new UiPackage(pkg));
        this.packages.set(uiPackages);
      }
    });

    // Available products değiştiğinde güncelle
    this.step2AvailableProducts$.pipe(
      skip(1),
      takeUntil(this.destroy$)
    ).subscribe(products => {
      const uiProducts = products.map(product => new UiProduct(product));
      this.availableProducts.set(uiProducts);
    });
  }

  private checkPrerequisites(): boolean {
    if (!this.localStorageService.isStepCompleted(1)) {
      this.toastService.warning('Önce sipariş bilgilerini tamamlayın');
      return false;
    }
    return true;
  }

  resetComponentState(): void {
    try {
      // Tüm signal'ları temizle
      this.packages.set([]);
      this.availableProducts.set([]);
      this.selectedPallets.set([]); // Yeni eklenen
      this.availablePallets.set([]); // Yeni eklenen

      this.store.dispatch(StepperActions.initializeStep2State({
        packages: [],
        availableProducts: []
      }));

      this.order = null;

      this.currentDraggedProduct = null;
      this.isDragInProgress = false;

      this.secondFormGroup.reset();

      this.lastPackageState = '';
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = null;
      }
      this.cloneCount = 1;
    } catch (error) {
      // Fallback
      this.packages.set([]);
      this.availableProducts.set([]);
      this.selectedPallets.set([]);
      this.availablePallets.set([]);
      this.store.dispatch(StepperActions.initializeStep2State({
        packages: [],
        availableProducts: []
      }));
      this.order = null;
    }
  }

  private setupAutoSaveListeners(): void {
    this.watchPackageChanges();
    this.secondFormGroup.valueChanges.subscribe(() => {
      this.triggerAutoSave('form');
    });
  }

  private watchPackageChanges(): void {
    setInterval(() => {
      if (this.isDragInProgress) {
        return;
      }
      const currentState = this.getCurrentPackageState();
      if (currentState !== this.lastPackageState && this.packages.length > 0) {
        this.triggerAutoSave('user-action');
        this.lastPackageState = currentState;
      }
    }, 5000);
  }

  private getCurrentPackageState(): string {
    try {
      const currentPackages = this.packages();
      const packageSummary = currentPackages.map((pkg) => ({
        id: pkg.id,
        palletId: pkg.pallet?.id,
        productCount: pkg.products.length
      }));

      return JSON.stringify({
        packages: packageSummary,
        totalPackages: currentPackages.length,
        totalWeight: this.totalWeight(),
        remainingArea: this.remainingArea(),
      });
    } catch (error) {
      return '';
    }
  }

  private triggerAutoSave(
    changeType: 'form' | 'drag-drop' | 'user-action' | 'api-response' = 'user-action'
  ): void {
    // Signal'lardan direkt değerleri al
    const currentPackages = this.packages();
    const currentAvailableProducts = this.availableProducts();

    if (currentPackages.length > 0) {
      const autoSaveData = {
        packages: currentPackages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          pallet: pkg.pallet ? {
            id: pkg.pallet.id,
            name: pkg.pallet.name,
            dimension: pkg.pallet.dimension
          } : null,
          products: pkg.products.map(product => ({
            id: product.id,
            name: product.name,
            count: product.count
          }))
        })),
        availableProducts: currentAvailableProducts.map(product => ({
          id: product.id,
          name: product.name,
          count: product.count
        })),
        // Computed signal'lardan değerleri al
        totalWeight: this.totalWeight() || 0,
        totalMeter: this.totalMeter() || 0,
        remainingArea: this.remainingArea() || 0,
        remainingWeight: this.remainingWeight() || 0
      };

      this.store.dispatch(StepperActions.triggerAutoSave({
        stepNumber: 1,
        data: autoSaveData,
        changeType: changeType
      }));
    }
  }

  private restoreFromSession(): void {
    try {
      let hasNgRxData = false;
      this.step2Packages$.pipe(take(1)).subscribe(packages => {
        hasNgRxData = packages.length > 0;
      });

      if (hasNgRxData) {
        this.toastService.info('NgRx store\'dan paket verileri yüklendi');
        this.cdr.detectChanges();
        return;
      }
      const restoredPackages = this.localStorageService.restoreStep2Data();
      if (
        restoredPackages &&
        ((restoredPackages.availableProducts &&
          restoredPackages.availableProducts.length > 0) ||
          (restoredPackages.packages && restoredPackages.packages.length > 0))
      ) {
        this.store.dispatch(StepperActions.initializeStep2State({
          packages: restoredPackages.packages || [],
          availableProducts: restoredPackages.availableProducts || []
        }));

        this.toastService.info('LocalStorage\'dan NgRx\'e restore edildi');
      } else {
        this.configureComponent();
      }
    } catch (error) {
      this.configureComponent();
    }
  }

  private saveCurrentStateToSession(): void {
    try {
      this.localStorageService.saveStep2Data(
        this.packages(),  // Signal'dan direkt al
        this.availableProducts()  // Signal'dan direkt al
      );
    } catch (error) {}
  }

  configureComponent(): void {
    this.repository.calculatePackageDetail().subscribe({
      next: (response) => {
        if (
          !response ||
          !response.packages ||
          !Array.isArray(response.packages) ||
          response.packages.length === 0
        ) {
          this.addNewEmptyPackage();
          return;
        }

        this.store.dispatch(StepperActions.initializeStep2State({
          packages: response.packages || [],
          availableProducts: response.remainingProducts || []
        }));

        if (
          this.packages.length > 0 &&
          this.packages()[0] &&
          this.packages()[0].order
        ) {
          this.order = this.packages()[0].order;
        } else {
          this.order = null;
        }

        this.addNewEmptyPackage();

        this.triggerAutoSave('api-response');
      },
      error: (error) => {
        this.toastService.error('Paket hesaplaması sırasında hata oluştu');
        this.order = null;
        this.addNewEmptyPackage();
      },
    });
  }

  loadPallets(): void {
    this.repository.pallets().subscribe({
      next: (response) => {
        this.availablePallets.set(response); // Signal güncelle
      },
    });
  }

  public activePalletWeights = computed(() => {
    const packages = this.packages();
    return packages
      .filter(pkg => pkg.pallet && pkg.products?.length > 0)
      .map(pkg => this.packageTotalWeight(pkg));
  });

  public heaviestPalletWeight = computed(() => {
    const weights = this.activePalletWeights();
    return weights.length > 0 ? Math.max(...weights) : 0;
  });

  public lightestPalletWeight = computed(() => {
    const weights = this.activePalletWeights();
    return weights.length > 0 ? Math.min(...weights) : 0;
  });

  public averagePalletWeight = computed(() => {
    const weights = this.activePalletWeights();
    if (weights.length === 0) return 0;
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return Math.round((totalWeight / weights.length) * 100) / 100;
  });

  public activePalletCount = computed(() => this.activePalletWeights().length);
  public totalPalletWeight = computed(() =>
    this.activePalletWeights().reduce((sum, weight) => sum + weight, 0)
  );

  packageTotalWeight(pkg: UiPackage): number {
    const palletWeight = Math.floor(pkg.pallet?.weight ?? 0);
    const productsWeight = pkg.products.reduce(
      (total, product) => {
        if(this.order.weight_type == 'std'){
          return total + Math.floor(product.weight_type.std * product.count)
        }
        else if(this.order.weight_type == 'eco'){
          return total + Math.floor(product.weight_type.eco * product.count)
        }
        else {
          return total + Math.floor(product.weight_type.pre * product.count)
        }
      },0
    );

    const totalWeight = palletWeight + productsWeight;
    return totalWeight;
  }



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
    // Safe number conversion
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

  private ensureUiProduct(product: any): UiProduct {
    return product instanceof UiProduct ? product : new UiProduct(product);
  }

  private ensureUiProducts(products: any[]): UiProduct[] {
    return products.map((product) => this.ensureUiProduct(product));
  }

  private ensureUiProductInstance(product: any): UiProduct {
    if (!(product instanceof UiProduct)) {
      const uiProduct = new UiProduct(product);

      // Signal'dan değeri al
      const currentProducts = this.availableProducts();
      const index = currentProducts.indexOf(product);

      if (index !== -1) {
        // Array'i kopyala, güncelle ve signal'ı set et
        const updatedProducts = [...currentProducts];
        updatedProducts[index] = uiProduct;
        this.availableProducts.set(updatedProducts);
      }

      return uiProduct;
    }
    return product;
  }

  consolidateProducts(products: UiProduct[]): UiProduct[] {
    const consolidatedMap = new Map<string, UiProduct>();

    for (const product of products) {
      const uiProduct = this.ensureUiProduct(product);
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

  dropProductToPallet(event: CdkDragDrop<UiProduct[]>): void {
    const product = event.previousContainer.data[event.previousIndex];
    const targetPalletId = event.container.id;
    const currentPackages = this.packages();
    const targetPackage = currentPackages.find(
      (p) => p.pallet && p.pallet.id === targetPalletId
    );

    if (targetPackage && targetPackage.pallet) {
      const canFit = this.canFitProductToPallet(
        product,
        targetPackage.pallet,
        targetPackage.products
      );

      if (!canFit) {
        // Error handling aynı kalır
        const remainingVolume = this.getRemainingPalletVolume(
          targetPackage.pallet,
          targetPackage.products
        );
        const fillPercentage = this.getPalletFillPercentage(
          targetPackage.pallet,
          targetPackage.products
        );
        // ... error message logic
        return;
      }
    }

    // Array manipülasyonları
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
      const consolidatedProducts = this.consolidateProducts(targetPackage.products);
      const updatedPackage = { ...targetPackage, products: consolidatedProducts };

      // Signal güncellemeleri
      const updatedPackages = currentPackages.map(pkg =>
        pkg.id === updatedPackage.id ? updatedPackage : pkg
      ) as UiPackage[];
      this.packages.set(updatedPackages);

      // Store dispatch'leri kaldırın, sadece signal güncelleyin
      this.store.dispatch(StepperActions.updatePackage({ package: updatedPackage }));
      this.store.dispatch(StepperActions.updateAvailableProducts({
        availableProducts: this.availableProducts()
      }));
    }

    this.triggerAutoSave('drag-drop');
  }

  dropPalletToPackage(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const currentPackages = this.packages();
    const packageIndex = currentPackages.findIndex(
      (p) => p.id === event.container.id
    );

    if (packageIndex === -1 || currentPackages[packageIndex].pallet !== null) {
      return;
    }

    const originalPallet = event.previousContainer.data[event.previousIndex];
    const palletClone = new UiPallet({
      ...originalPallet,
      id: originalPallet.id + '/' + this.cloneCount++,
    });

    // Package'ı güncelle
    const updatedPackages = [...currentPackages];
    updatedPackages[packageIndex].pallet = palletClone;
    this.packages.set(updatedPackages);

    // selectedPallets signal'ını güncelle
    const currentSelectedPallets = this.selectedPallets();
    this.selectedPallets.set([...currentSelectedPallets, palletClone]);

    this.addNewEmptyPackage();
    this.triggerAutoSave('drag-drop');
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

    this.packages().forEach((pkg, index) => {
      if (pkg.pallet) {
        const palletElement = document.getElementById(pkg.pallet.id);
        if (palletElement) {
          palletElements.set(pkg.pallet.id, palletElement);
        }
      }
    });

    this.packages().forEach((pkg, index) => {
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

    setTimeout(() => {
      this.triggerAutoSave('drag-drop');
    }, 500); // 500ms sonra kaydet
  }

  splitProduct(product: UiProduct, splitCount?: number | null): void {
    const uiProduct = this.ensureUiProductInstance(product);
    const validatedCount = this.validateSplitCount(uiProduct, splitCount);

    if (validatedCount === null) return;

    const currentProducts = this.availableProducts();
    const isCustomSplit = splitCount !== Math.floor(product.count / 2);

    if (isCustomSplit) {
      const firstPart = new UiProduct({
        ...product,
        count: validatedCount,
        id: `${product.id}/1`,
      });

      const secondPart = new UiProduct({
        ...product,
        count: product.count - validatedCount,
        id: `${product.id}/2`,
      });

      const updatedProducts = currentProducts.filter(p => p !== product);
      updatedProducts.push(firstPart, secondPart);
      this.availableProducts.set(updatedProducts);

      this.toastService.success(
        `${product.name} ${validatedCount} ve ${
          product.count - validatedCount
        } adet olarak bölündü.`,
        'Başarılı'
      );
    } else {
      if (typeof product.split !== 'function') return;

      const splitProducts = product.split();
      const updatedProducts = currentProducts.filter(p => p !== product);
      updatedProducts.push(...splitProducts);
      this.availableProducts.set(updatedProducts);

      this.toastService.success(`${product.name} yarıya bölündü.`, 'Başarılı');
    }

    this.store.dispatch(StepperActions.updateAvailableProducts({
      availableProducts: this.availableProducts()
    }));

    this.triggerAutoSave('user-action');
  }

  private validateSplitCount(
    product: UiProduct,
    splitCount?: number | null
  ): number | null {
    if (splitCount !== undefined && splitCount !== null) {
      if (splitCount <= 0 || splitCount >= product.count) {
        this.toastService.warning(
          `Geçersiz adet girişi. 1 ile ${
            product.count - 1
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

  private performSplit(product: UiProduct, splitCount: number): void {
    const isCustomSplit = splitCount !== Math.floor(product.count / 2);

    if (isCustomSplit) {
      const firstPart = new UiProduct({
        ...product,
        count: splitCount,
        id: `${product.id}/1`,
      });

      const secondPart = new UiProduct({
        ...product,
        count: product.count - splitCount,
        id: `${product.id}/2`,
      });

      const updatedProducts = this.availableProducts().filter(p => p !== product);
      updatedProducts.push(firstPart, secondPart);

      this.store.dispatch(StepperActions.updateAvailableProducts({
        availableProducts: updatedProducts
      }));

      this.toastService.success(
        `${product.name} ${splitCount} ve ${
          product.count - splitCount
        } adet olarak bölündü.`,
        'Başarılı'
      );
    } else {
      if (typeof product.split !== 'function') {
        return;
      }

      const splitProducts = product.split();
      const updatedProducts = this.availableProducts().filter(p => p !== product);
      updatedProducts.push(...splitProducts);

      this.store.dispatch(StepperActions.updateAvailableProducts({
        availableProducts: updatedProducts
      }));

      this.toastService.success(`${product.name} yarıya bölündü.`, 'Başarılı');
    }
  }

  removeProductFromPackage(pkg: UiPackage, productIndex: number): void {
    const currentPackages = this.packages();
    const currentAvailableProducts = this.availableProducts();

    const removedProduct = pkg.products.splice(productIndex, 1)[0];
    const uiProduct = this.ensureUiProduct(removedProduct);

    // Package'ı güncelle
    const updatedPackages = currentPackages.map(p =>
      p.id === pkg.id ? { ...p, products: [...pkg.products] } : p
    ) as UiPackage[];
    this.packages.set(updatedPackages);

    // Available products'ı güncelle
    const updatedProducts = [...currentAvailableProducts, uiProduct];
    this.availableProducts.set(updatedProducts);

    this.store.dispatch(StepperActions.updatePackage({
      package: { ...pkg, products: [...pkg.products] }
    }));

    this.triggerAutoSave('user-action');
  }

  removeAllPackage(): void {
    const currentPackages = this.packages();
    const allProducts: UiProduct[] = [];

    currentPackages.forEach((pkg) => {
      if (pkg.products?.length > 0) {
        allProducts.push(...this.ensureUiProducts(pkg.products));
      }
    });

    const consolidatedProducts = this.consolidateProducts([
      ...this.availableProducts(),
      ...allProducts
    ]);

    // Signal'ları güncelle
    this.packages.set([]);
    this.availableProducts.set(consolidatedProducts);
    this.selectedPallets.set([]); // Signal güncelle

    // Store'u da güncelle
    this.store.dispatch(StepperActions.initializeStep2State({
      packages: [],
      availableProducts: consolidatedProducts
    }));

    this.addNewEmptyPackage();
    this.toastService.success('Tüm paletler temizlendi.', 'Başarılı');
    this.triggerAutoSave('user-action');
  }

  removePackage(packageToRemove: any): void {
    const currentPackages = this.packages();
    const packageIndex = currentPackages.findIndex(
      (pkg) => pkg === packageToRemove ||
      (pkg.id && packageToRemove.id && pkg.id === packageToRemove.id)
    );

    if (packageIndex === -1) {
      this.toastService.error('Paket bulunamadı.', 'Hata');
      return;
    }

    const pkg = currentPackages[packageIndex];

    // Ürünleri geri döndür
    if (pkg.products?.length > 0) {
      const productsToReturn = this.ensureUiProducts(pkg.products);
      const updatedProducts = [...this.availableProducts(), ...productsToReturn];
      const consolidatedProducts = this.consolidateProducts(updatedProducts);
      this.availableProducts.set(consolidatedProducts);
    }

    // Paleti kaldır
    if (pkg.pallet) {
      const currentSelectedPallets = this.selectedPallets();
      const palletIndex = currentSelectedPallets.findIndex(
        (pallet) => pallet === pkg.pallet
      );
      if (palletIndex !== -1) {
        const updatedSelectedPallets = [...currentSelectedPallets];
        updatedSelectedPallets.splice(palletIndex, 1);
        this.selectedPallets.set(updatedSelectedPallets);
      }
    }

    // Package'ı kaldır
    const updatedPackages = currentPackages.filter((_, index) => index !== packageIndex);
    this.packages.set(updatedPackages);

    this.store.dispatch(StepperActions.deletePackage({ packageId: pkg.id }));

    if (this.packages().length === 0) {
      this.addNewEmptyPackage();
    }

    this.toastService.success('Paket silindi.', 'Başarılı');
    this.triggerAutoSave('user-action');
  }

  removePalletFromPackage(packageItem: UiPackage): void {
    if (packageItem.pallet) {
      if (packageItem.products?.length > 0) {
        const uiProducts = this.ensureUiProducts(packageItem.products);
        const currentAvailableProducts = this.availableProducts();
        const updatedProducts = [...currentAvailableProducts, ...uiProducts];
        this.availableProducts.set(updatedProducts);
      }

      // selectedPallets'dan kaldır
      const currentSelectedPallets = this.selectedPallets();
      const palletIndex = currentSelectedPallets.findIndex(
        (p) => p.id === packageItem.pallet?.id
      );
      if (palletIndex !== -1) {
        const updatedSelectedPallets = [...currentSelectedPallets];
        updatedSelectedPallets.splice(palletIndex, 1);
        this.selectedPallets.set(updatedSelectedPallets);
      }

      const currentPackages = this.packages();
      const updatedPackages = currentPackages.map(pkg =>
        pkg.id === packageItem.id ? { ...pkg, pallet: null, products: [] } : pkg
      ) as UiPackage[];
      this.packages.set(updatedPackages);

      this.store.dispatch(StepperActions.updatePackage({
        package: { ...packageItem, pallet: null, products: [] }
      }));

      this.triggerAutoSave('user-action');
    }
  }

  addNewEmptyPackage(): void {
    const currentPackages = this.packages();
    const emptyPackages = currentPackages.filter((p) => p.pallet === null);

    if (emptyPackages.length < 2) {
      const newPackage = new UiPackage({
        id: Guid(),
        pallet: null,
        products: [],
        order: this.order,
        name: (currentPackages.length + 1).toString()
      });

      // Signal'ı güncelle
      const updatedPackages = [...currentPackages, newPackage];
      this.packages.set(updatedPackages);

      this.store.dispatch(StepperActions.addPackage({ package: newPackage }));
    }
  }

  public palletProductsLists = computed(() => {
    const allPalletIds: string[] = ['productsList'];
    const currentPackages = this.packages();

    for (const pkg of currentPackages) {
      if (pkg.pallet) {
        allPalletIds.push(pkg.pallet.id);
      }
    }
    return allPalletIds;
  });

  public packageIds = computed(() => {
    return this.packages()
      .filter((pkg) => pkg.pallet === null)
      .map((pkg) => pkg.id);
  });

  getPackageData(): any {
    return mapPackageToPackageDetail(this.packages()); // Signal'dan direkt al
  }

  submitForm(): void {
    // Signal'dan direkt veri al
    const currentPackages = this.packages();
    const packageData = mapPackageToPackageDetail(currentPackages);

    this.repository.bulkCreatePackageDetail(packageData).subscribe({
      next: (response) => {
        this.toastService.success('Kaydedildi', 'Başarılı');

        this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 1 }));
        this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 1, isValid: true }));

        // Signal'lardan güncel veriyi al
        this.store.dispatch(StepperActions.triggerAutoSave({
          stepNumber: 1,
          data: {
            packages: currentPackages,
            availableProducts: this.availableProducts()
          },
          changeType: 'api-response'
        }));

        this.saveCurrentStateToSession();
      },
      error: (error) => {
        this.store.dispatch(StepperActions.setGlobalError({
          error: {
            message: 'Paket verileri kaydedilirken hata oluştu: ' + (error.message || error),
            code: error.status?.toString(),
            stepIndex: 1
          }
        }));

        this.toastService.error('Paket verileri kaydedilemedi');
      }
    });
  }
}

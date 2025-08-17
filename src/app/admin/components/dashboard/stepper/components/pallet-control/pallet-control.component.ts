import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { take } from 'rxjs/operators';

import { selectStep2Packages, selectStep2AvailableProducts, selectStep2IsDirty,
         selectStep2Changes } from '../../../../../../store/stepper/stepper.selectors';
import * as StepperActions from '../../../../../../store/stepper/stepper.actions';

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
export class PalletControlComponent implements OnInit {
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
  // Main data properties

  availablePallets: UiPallet[] = [];
  selectedPallets: UiPallet[] = [];
  secondFormGroup: FormGroup;
  order: any;

  // Drag & Drop
  currentDraggedProduct: UiProduct | null = null;

  // Trailer specifications
  trailer: any;

  // Calculated values - cached
  private _calculationCache = new Map<string, any>();
  remainingArea: number = 0;
  remainingWeight: number = 0;
  totalWeight: number = 0;
  totalMeter: number = 0;

  // Utility
  private cloneCount = 1;

  // Performance optimization - cached calculation results
  private _activePalletWeights: number[] = [];
  private _lastCalculationHash: string = '';

  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });
  }

  get packages(): UiPackage[] {
    let currentPackages: UiPackage[] = [];
    this.step2Packages$.pipe(take(1)).subscribe(packages => {
      currentPackages = packages.map(pkg => new UiPackage(pkg));
    });
    return currentPackages;
  }

  get availableProducts(): UiProduct[] {
    let currentProducts: UiProduct[] = [];
    this.step2AvailableProducts$.pipe(take(1)).subscribe(products => {
      currentProducts = products.map(product => new UiProduct(product));
    });
    return currentProducts;
  }

  forceSaveStep2(): void {
    const autoSaveData = {
      packages: this.packages,
      availableProducts: this.availableProducts,
      totalWeight: this.totalWeight,
      totalMeter: this.totalMeter,
      remainingArea: this.remainingArea,
      remainingWeight: this.remainingWeight,
    };

    this.store.dispatch(StepperActions.forceSave({
      stepNumber: 1,
      data: autoSaveData
    }));


  }

  ngOnDestroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  ngOnInit(): void {
    if (!this.checkPrerequisites()) return;
    this.restoreFromSession();
    this.setupAutoSaveListeners();
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
      this.store.dispatch(StepperActions.initializeStep2State({
        packages: [],
        availableProducts: []
      }));

      this.selectedPallets = [];
      this.order = null;
      this.trailer = null;
      this.remainingArea = 0;
      this.remainingWeight = 0;
      this.totalWeight = 0;
      this.totalMeter = 0;

      this.currentDraggedProduct = null;
      this.isDragInProgress = false;

      this.secondFormGroup.reset();

      this._calculationCache.clear();
      this._lastCalculationHash = '';
      this._activePalletWeights = [];

      this.lastPackageState = '';
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = null;
      }
      this.cloneCount = 1;
    } catch (error) {
      this.store.dispatch(StepperActions.initializeStep2State({
        packages: [],
        availableProducts: []
      }));
      this.selectedPallets = [];
      this.order = null;
      this.trailer = null;
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
      const packageSummary = this.packages.map((pkg) => ({
        id: pkg.id,
        palletId: pkg.pallet?.id,
        productCount: pkg.products.length,
        totalWeight: pkg.totalWeight,
        totalVolume: pkg.totalVolume,
      }));

      return JSON.stringify({
        packages: packageSummary,
        totalPackages: this.packages.length,
        totalWeight: this.totalWeight,
        remainingArea: this.remainingArea,
      });
    } catch (error) {
      return '';
    }
  }

  private triggerAutoSave(
  changeType: 'form' | 'drag-drop' | 'user-action' | 'api-response' = 'user-action'
): void {
  if (this.packages.length > 0) {
    const autoSaveData = {
      packages: this.packages.map(pkg => ({
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
      availableProducts: this.availableProducts.map(product => ({
        id: product.id,
        name: product.name,
        count: product.count
      })),
      totalWeight: this.totalWeight || 0,
      totalMeter: this.totalMeter || 0,
      remainingArea: this.remainingArea || 0,
      remainingWeight: this.remainingWeight || 0
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
        this.loadPallets();
        this.updateAllCalculations();
        this.toastService.info('NgRx store\'dan paket verileri yüklendi');
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

        this.loadPallets();
        this.updateAllCalculations();
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
        this.packages,
        this.availableProducts
      );
    } catch (error) {}
  }

  configureComponent(): void {
    this.loadPallets();
    this.repository.calculatePackageDetail().subscribe({
      next: (response) => {
        if (
          !response ||
          !response.packages ||
          !Array.isArray(response.packages) ||
          response.packages.length === 0
        ) {
          this.addNewEmptyPackage();
          this.updateAllCalculations();
          return;
        }

        this.store.dispatch(StepperActions.initializeStep2State({
          packages: response.packages || [],
          availableProducts: response.remainingProducts || []
        }));

        if (
          this.packages.length > 0 &&
          this.packages[0] &&
          this.packages[0].order
        ) {
          this.order = this.packages[0].order;
          this.trailer = this.order?.truck || null;
        } else {
          this.order = null;
          this.trailer = null;
        }

        this.addNewEmptyPackage();
        this.updateAllCalculations();

        this.triggerAutoSave('api-response');
      },
      error: (error) => {
        this.toastService.error('Paket hesaplaması sırasında hata oluştu');
        this.order = null;
        this.trailer = null;
        this.addNewEmptyPackage();
        this.updateAllCalculations();
      },
    });
  }

  loadPallets(): void {
    this.repository.pallets().subscribe({
      next: (response) => {
        this.availablePallets = response;
      },
    });
  }

  private getCalculationHash(): string {
    return this.packages
      .map(
        (pkg) =>
          `${pkg.pallet?.id || 'null'}-${
            pkg.products.length
          }-${pkg.products.reduce((sum, p) => sum + p.count, 0)}`
      )
      .join('|');
  }

  private getActivePalletWeights(): number[] {
    const currentHash = this.getCalculationHash();

    if (this._lastCalculationHash === currentHash) {
      return this._activePalletWeights;
    }

    this._activePalletWeights = this.packages
      .filter((pkg) => pkg.pallet && pkg.products?.length > 0)
      .map((pkg) => this.packageTotalWeight(pkg));

    this._lastCalculationHash = currentHash;
    return this._activePalletWeights;
  }

  getHeaviestPalletWeight(): number {
    const weights = this.getActivePalletWeights();
    return weights.length > 0 ? Math.max(...weights) : 0;
  }

  getLightestPalletWeight(): number {
    const weights = this.getActivePalletWeights();
    return weights.length > 0 ? Math.min(...weights) : 0;
  }

  getAveragePalletWeight(): number {
    const weights = this.getActivePalletWeights();
    if (weights.length === 0) return 0;

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return Math.round((totalWeight / weights.length) * 100) / 100;
  }

  getActivePalletCount(): number {
    return this.getActivePalletWeights().length;
  }

  getTotalPalletWeight(): number {
    const weights = this.getActivePalletWeights();
    return weights.reduce((sum, weight) => sum + weight, 0);
  }

  calculateArea(): void {
    const cacheKey = `area-${this.getCalculationHash()}`;

    if (this._calculationCache.has(cacheKey)) {
      this.remainingArea = this._calculationCache.get(cacheKey);
      return;
    }

    const totalArea = this.packages.reduce((total, pkg) => {
      const palletArea = Math.floor(
        (pkg.pallet?.dimension.width ?? 0) * (pkg.pallet?.dimension.depth ?? 0)
      );
      return total + palletArea;
    }, 0);

    const trailerArea =
      (this.trailer?.dimension?.width ?? 0) *
      (this.trailer?.dimension?.depth ?? 0);

    this.remainingArea = Math.floor((trailerArea - totalArea) / 1000000);

    this._calculationCache.set(cacheKey, this.remainingArea);
  }

  calculateWeight(): void {
    const cacheKey = `weight-${this.getCalculationHash()}`;

    if (this._calculationCache.has(cacheKey)) {
      const cached = this._calculationCache.get(cacheKey);
      this.totalWeight = cached.total;
      this.remainingWeight = cached.remaining;
      return;
    }

    const totalWeight = this.packages.reduce((total, pkg) => {
    const palletWeight = Math.floor(pkg.pallet?.weight ?? 0);

    const productsWeight = pkg.products.reduce(
      (pTotal, product) => {
        let weight = 0;
        if (this.order.weight_type === 'eco') {
          weight = product.weight_type.eco;
        } else if (this.order.weight_type === 'std') {
          weight = product.weight_type.std;
        } else if (this.order.weight_type === 'pre') {
          weight = product.weight_type.pre;
        }
          return pTotal + Math.floor(weight * product.count);
        },0
      );
      return total + palletWeight + productsWeight;
    }, 0);

    this.totalWeight = totalWeight;
    const trailerWeightLimit = this.trailer?.weight_limit ?? 0;
    this.remainingWeight = Math.floor(trailerWeightLimit - totalWeight);

    this._calculationCache.set(cacheKey, {
      total: this.totalWeight,
      remaining: this.remainingWeight,
    });
  }

  calculateTotalMeter(): void {
    const cacheKey = `meter-${this.getCalculationHash()}`;

    if (this._calculationCache.has(cacheKey)) {
      this.totalMeter = this._calculationCache.get(cacheKey);
      return;
    }

    this.totalMeter =
      this.packages.reduce((total, pkg) => {
        if (pkg.products.length === 0) return total;

        const packageMeter = pkg.products.reduce((pTotal, product) => {
          // Product dimension kontrolü
          const productDepth = product.dimension?.depth ?? 0;
          return (
            pTotal +
            Math.round(Math.floor(product.count * Math.floor(productDepth)))
          );
        }, 0);

        return total + packageMeter;
      }, 0) / 1000;

    this._calculationCache.set(cacheKey, this.totalMeter);
  }

  packageTotalWeight(pkg: UiPackage): number {
    type WeightTypeKey = 'std' | 'pre' | 'eco';
    const selectedWeightType = this.order?.weight_type as WeightTypeKey;

    const cacheKey = `pkg-weight-${pkg.pallet?.id || 'null'}-${
      pkg.products.length
    }`;
    if (this._calculationCache.has(cacheKey)) {
      return this._calculationCache.get(cacheKey);
    }

    const palletWeight = Math.floor(pkg.pallet?.weight ?? 0);
    const productsWeight = pkg.products.reduce(
      (total, product) =>
        total + Math.floor(product.weight_type.std * product.count),
      0
    );

    const totalWeight = palletWeight + productsWeight;
    this._calculationCache.set(cacheKey, totalWeight);
    return totalWeight;
  }

  private updateAllCalculations(): void {
    this._calculationCache.clear();
    this._lastCalculationHash = '';

    this.calculateArea();
    this.calculateWeight();
    this.calculateTotalMeter();
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
      const index = this.availableProducts.indexOf(product);
      if (index !== -1) {
        this.availableProducts[index] = uiProduct;
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
        const remainingVolume = this.getRemainingPalletVolume(
          targetPackage.pallet,
          targetPackage.products
        );
        const fillPercentage = this.getPalletFillPercentage(
          targetPackage.pallet,
          targetPackage.products
        );
        const singleVolume =
          this.safeNumber(product.dimension.width) *
          this.safeNumber(product.dimension.depth) *
          this.safeNumber(product.dimension.height);
        const maxCount = Math.floor(remainingVolume / singleVolume);

        let errorMessage = `Bu ürün palete sığmıyor. Palet doluluk: %${fillPercentage}`;

        if (maxCount > 0 && maxCount < this.safeNumber(product.count)) {
          errorMessage += `. Maksimum ${maxCount} adet sığabilir, ürünü bölebilirsiniz.`;
        } else if (maxCount === 0) {
          errorMessage += `. Kalan hacim: ${remainingVolume.toFixed(
            2
          )} - çok küçük.`;
        }

        this.toastService.error(errorMessage, 'Ürün Palete Sığmıyor!');
        return;
      }
      this.cdr.markForCheck();
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
      const consolidatedProducts = this.consolidateProducts(targetPackage.products);
      const updatedPackage = { ...targetPackage, products: consolidatedProducts };

      this.store.dispatch(StepperActions.updatePackage({
        package: updatedPackage
      }));

      this.store.dispatch(StepperActions.updateAvailableProducts({
        availableProducts: this.availableProducts
      }));
    }

    this.updateAllCalculations();
    this.triggerAutoSave('drag-drop');
  }

  dropPalletToPackage(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const packageIndex = this.packages.findIndex(
      (p) => p.id === event.container.id
    );

    if (packageIndex === -1 || this.packages[packageIndex].pallet !== null) {
      return;
    }

    const originalPallet = event.previousContainer.data[event.previousIndex];
    const palletClone = new UiPallet({
      ...originalPallet,
      id: originalPallet.id + '/' + this.cloneCount++,
    });

    const updatedPackage = { ...this.packages[packageIndex], pallet: palletClone };
    this.store.dispatch(StepperActions.updatePackage({
      package: updatedPackage
    }));

    this.selectedPallets.push(palletClone);
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

    this.packages.forEach((pkg, index) => {
      if (pkg.pallet) {
        const palletElement = document.getElementById(pkg.pallet.id);
        if (palletElement) {
          palletElements.set(pkg.pallet.id, palletElement);
        }
      }
    });

    this.packages.forEach((pkg, index) => {
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

    this.performSplit(uiProduct, validatedCount);

    this.triggerAutoSave('user-action');
    this.cdr.markForCheck();
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

      const updatedProducts = this.availableProducts.filter(p => p !== product);
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
      const updatedProducts = this.availableProducts.filter(p => p !== product);
      updatedProducts.push(...splitProducts);

      this.store.dispatch(StepperActions.updateAvailableProducts({
        availableProducts: updatedProducts
      }));

      this.toastService.success(`${product.name} yarıya bölündü.`, 'Başarılı');
    }
  }

  removeProductFromPackage(pkg: UiPackage, productIndex: number): void {
    const removedProduct = pkg.products.splice(productIndex, 1)[0];
    const uiProduct = this.ensureUiProduct(removedProduct);

    const updatedPackage = { ...pkg, products: [...pkg.products] };
    this.store.dispatch(StepperActions.updatePackage({
      package: updatedPackage
    }));

    const updatedProducts = [...this.availableProducts, uiProduct];
    this.store.dispatch(StepperActions.updateAvailableProducts({
      availableProducts: updatedProducts
    }));

    this.updateAllCalculations();
    this.triggerAutoSave('user-action');
    this.cdr.markForCheck();
  }

  removeAllPackage(): void {
    const allProducts: UiProduct[] = [];

    this.packages.forEach((pkg) => {
      if (pkg.products?.length > 0) {
        allProducts.push(...this.ensureUiProducts(pkg.products));
        pkg.products = [];
      }
      pkg.pallet = null;
    });

    const consolidatedProducts = this.consolidateProducts([...this.availableProducts, ...allProducts]);

    this.store.dispatch(StepperActions.initializeStep2State({
      packages: [],
      availableProducts: consolidatedProducts
    }));

    this.selectedPallets = [];
    this.addNewEmptyPackage();

    this.updateAllCalculations();

    this.toastService.success('Tüm paletler temizlendi.', 'Başarılı');

    this.triggerAutoSave('user-action');
  }
  removePackage(packageToRemove: any): void {
    const packageIndex = this.packages.findIndex(
      (pkg) =>
        pkg === packageToRemove ||
        (pkg.id && packageToRemove.id && pkg.id === packageToRemove.id)
    );

    if (packageIndex === -1) {
      this.toastService.error('Paket bulunamadı.', 'Hata');
      return;
    }

    const pkg = this.packages[packageIndex];

    if (pkg.products?.length > 0) {
      const productsToReturn = this.ensureUiProducts(pkg.products);
      const updatedProducts = [...this.availableProducts, ...productsToReturn];
      const consolidatedProducts = this.consolidateProducts(updatedProducts);
      this.store.dispatch(StepperActions.updateAvailableProducts({
        availableProducts: consolidatedProducts
      }));
    }

    if (pkg.pallet) {
      const palletIndex = this.selectedPallets.findIndex(
        (pallet) => pallet === pkg.pallet
      );
      if (palletIndex !== -1) {
        this.selectedPallets.splice(palletIndex, 1);
      }
    }

    this.store.dispatch(StepperActions.deletePackage({
      packageId: pkg.id
    }));

    if (this.packages.length === 0) {
      this.addNewEmptyPackage();
    }

    this.updateAllCalculations();
    this.toastService.success('Paket silindi.', 'Başarılı');

    this.triggerAutoSave('user-action');
  }

  removePalletFromPackage(packageItem: UiPackage): void {
    if (packageItem.pallet) {
      if (packageItem.products?.length > 0) {
        const uiProducts = this.ensureUiProducts(packageItem.products);
        const updatedProducts = [...this.availableProducts, ...uiProducts];
        this.store.dispatch(StepperActions.updateAvailableProducts({
          availableProducts: updatedProducts
        }));
      }

      const palletIndex = this.selectedPallets.findIndex(
        (p) => p.id === packageItem.pallet?.id
      );
      if (palletIndex !== -1) {
        this.selectedPallets.splice(palletIndex, 1);
      }

      const updatedPackage = { ...packageItem, pallet: null, products: [] };
      this.store.dispatch(StepperActions.updatePackage({
        package: updatedPackage
      }));

      this.updateAllCalculations();
      this.triggerAutoSave('user-action');
    }
  }

  addNewEmptyPackage(): void {
    const emptyPackages = this.packages.filter((p) => p.pallet === null);

    if (emptyPackages.length < 2) {
      const newPackage = new UiPackage({
        id: Guid(),
        pallet: null,
        products: [],
        order: this.order,
        name: (this.packages.length + 1).toString()
      });

      this.store.dispatch(StepperActions.addPackage({
        package: newPackage
      }));
    }
  }

  get palletProductsLists(): string[] {
    const allPalletIds: string[] = ['productsList'];
    for (const pkg of this.packages) {
      if (pkg.pallet) {
        allPalletIds.push(pkg.pallet.id);
      }
    }
    return allPalletIds;
  }

  get packageIds(): string[] {
    return this.packages
      .filter((pkg) => pkg.pallet === null)
      .map((pkg) => pkg.id);
  }

  getPackageData(): any {
    return mapPackageToPackageDetail(this.packages);
  }

  submitForm(): void {
    const packageData = this.getPackageData();

    this.repository.bulkCreatePackageDetail(packageData).subscribe({
      next: (response) => {
        this.toastService.success('Kaydedildi', 'Başarılı');

        this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 1 }));
        this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 1, isValid: true }));

        this.store.dispatch(StepperActions.triggerAutoSave({
          stepNumber: 1,
          data: {
            packages: this.packages,
            availableProducts: this.availableProducts
          },
          changeType: 'api-response'
        }));

        this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 1 }));
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
        this.cdr.markForCheck();
      }
    });
  }
}

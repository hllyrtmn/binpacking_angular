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
import { LocalStorageService } from '../../services/local-storage.service';
import { AutoSaveService } from '../../services/auto-save.service';

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
  // Service injections
  repository: RepositoryService = inject(RepositoryService);
  toastService: ToastService = inject(ToastService);
  stepperService = inject(StepperStore);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly autoSaveService = inject(AutoSaveService);

  // YENİ: Form change tracking
  private lastPackageState: string = '';
  private autoSaveTimeout: any;
  private isDragInProgress: boolean = false;
  // Main data properties
  packages: UiPackage[] = [];
  availableProducts: UiProduct[] = [];
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

  // YENİ METHOD: Force save (emergency durumlar için)
  forceSaveStep2(): void {
    this.autoSaveService.forceSave(2, {
      packages: this.packages,
      totalWeight: this.totalWeight,
      totalMeter: this.totalMeter,
      remainingArea: this.remainingArea,
      remainingWeight: this.remainingWeight,
    });

    this.toastService.success('Pallet verileri zorla kaydedildi');
  }

  /**
   * Component destroy'da cleanup
   */
  ngOnDestroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  ngOnInit(): void {
    if (!this.checkPrerequisites()) {
      return;
    }

    // Session restore
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
      // 1. Ana data properties'i reset et
      this.packages = [];
      this.availableProducts = [];
      this.availablePallets = [];
      this.selectedPallets = [];
      this.order = null;
      this.trailer = null;

      // 2. Calculation values'ı reset et
      this.remainingArea = 0;
      this.remainingWeight = 0;
      this.totalWeight = 0;
      this.totalMeter = 0;

      // 3. Drag state'i reset et
      this.currentDraggedProduct = null;
      this.isDragInProgress = false;

      // 4. Form'u reset et
      this.secondFormGroup.reset();

      // 5. Cache'i temizle
      this._calculationCache.clear();
      this._lastCalculationHash = '';
      this._activePalletWeights = [];

      // 6. Auto-save state'ini reset et
      this.lastPackageState = '';
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = null;
      }

      // 7. Clone count'ı reset et
      this.cloneCount = 1;
    } catch (error) {}
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
    }, 1500);
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
    changeType:
      | 'form'
      | 'drag-drop'
      | 'user-action'
      | 'api-response' = 'user-action'
  ): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(
      () => {
        if (this.packages.length > 0) {
          this.autoSaveService.triggerStep2AutoSave(
            {
              packages: this.packages,
              availableProducts: this.availableProducts,
              totalWeight: this.totalWeight,
              totalMeter: this.totalMeter,
              remainingArea: this.remainingArea,
              remainingWeight: this.remainingWeight,
            },
            changeType
          );
        }
      },
      changeType === 'drag-drop' ? 1000 : 500
    );
  }

  private restoreFromSession(): void {
    try {
      const restoredPackages = this.localStorageService.restoreStep2Data();

      if (
        restoredPackages &&
        ((restoredPackages.availableProducts &&
          restoredPackages.availableProducts.length > 0) ||
          (restoredPackages.packages && restoredPackages.packages.length > 0))
      ) {
        this.packages =
          restoredPackages && restoredPackages.packages
            ? restoredPackages.packages.map((pkg) => new UiPackage(pkg))
            : [];
        this.availableProducts =
          restoredPackages && restoredPackages.availableProducts
            ? restoredPackages.availableProducts.map(
                (prod) => new UiProduct(prod)
              )
            : [];
        this.loadPallets();
        this.updateAllCalculations();

        this.toastService.info('Pallet konfigürasyonunuz restore edildi');
      } else {
        console.log(
          "ℹ️ Step 2 session'da veri yok, component'i yapılandırıyoruz"
        );
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

  /* =====================
     COMPONENT SETUP
  ===================== */
  configureComponent(): void {
    this.loadPallets();
    this.repository.calculatePackageDetail().subscribe({
      next: (response) => {
        // **GÜVENLİK: Response kontrolü**
        if (
          !response ||
          !response.packages ||
          !Array.isArray(response.packages) ||
          response.packages.length === 0
        ) {
          this.packages = [];
          this.addNewEmptyPackage();
          this.updateAllCalculations();
          return;
        }

        this.availableProducts = response.remainingProducts;

        this.packages = response.packages;

        // **GÜVENLİK: Order kontrolü**
        if (
          this.packages.length > 0 &&
          this.packages[0] &&
          this.packages[0].order
        ) {
          this.order = this.packages[0].order;
          this.trailer = this.order.truck
        } else {
          this.order = null;
          this.trailer = null;
        }

        this.packages.forEach((pkg, index) => {
          if (pkg && pkg.pallet) {
            pkg.pallet.id = pkg.pallet.id + '/' + index;
          }
          if (pkg) {
            pkg.name = 'Palet' + index;
            pkg.products = this.ensureUiProducts(pkg.products || []);
          }
        });

        this.addNewEmptyPackage();
        this.updateAllCalculations();

        // YENİ: Configuration sonrası auto-save
        this.triggerAutoSave('api-response');
      },
      error: (error) => {
        this.toastService.error('Paket hesaplaması sırasında hata oluştu');

        // **GÜVENLİK: Hata durumunda fallback**
        this.packages = [];
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

  /* =====================
     PALLET STATISTICS - OPTIMIZED WITH CACHING
  ===================== */

  /**
   * Get calculation hash for cache validation
   */
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

  /**
   * Get active pallet weights (cached calculation)
   */
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

  /**
   * Get heaviest pallet weight
   */
  getHeaviestPalletWeight(): number {
    const weights = this.getActivePalletWeights();
    return weights.length > 0 ? Math.max(...weights) : 0;
  }

  /**
   * Get lightest pallet weight
   */
  getLightestPalletWeight(): number {
    const weights = this.getActivePalletWeights();
    return weights.length > 0 ? Math.min(...weights) : 0;
  }

  /**
   * Get average pallet weight
   */
  getAveragePalletWeight(): number {
    const weights = this.getActivePalletWeights();
    if (weights.length === 0) return 0;

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return Math.round((totalWeight / weights.length) * 100) / 100;
  }

  /**
   * Get active pallet count
   */
  getActivePalletCount(): number {
    return this.getActivePalletWeights().length;
  }

  /**
   * Get total pallet weight
   */
  getTotalPalletWeight(): number {
    const weights = this.getActivePalletWeights();
    return weights.reduce((sum, weight) => sum + weight, 0);
  }

  /* =====================
     CALCULATIONS - OPTIMIZED WITH CACHING
  ===================== */

  /**
   * Calculate remaining volume with caching
   */
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

    const trailerArea = this.trailer.dimension.width * this.trailer.dimension.depth;

    this.remainingArea = Math.floor((trailerArea - totalArea) / 1000000);

    this._calculationCache.set(cacheKey, this.remainingArea);
  }

  /**
   * Calculate total and remaining weight with caching
   */
  calculateWeight(): void {
    type WeightTypeKey = 'std' | 'pre' | 'eco';
    const selectedWeightType = this.order?.weight_type as WeightTypeKey;

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
        (pTotal, product) =>
          pTotal + Math.floor(product.weight_type.std * product.count),
        0
      );
      return total + palletWeight + productsWeight;
    }, 0);

    this.totalWeight = totalWeight;
    this.remainingWeight = Math.floor(this.trailer.weight_limit - totalWeight);

    this._calculationCache.set(cacheKey, {
      total: this.totalWeight,
      remaining: this.remainingWeight,
    });
  }

  /**
   * Calculate total meter with caching
   */
  calculateTotalMeter(): void {
    const cacheKey = `meter-${this.getCalculationHash()}`;

    if (this._calculationCache.has(cacheKey)) {
      this.totalMeter = this._calculationCache.get(cacheKey);
      return;
    }

    this.totalMeter =
      this.packages.reduce((total, pkg) => {
        if (pkg.products.length === 0) return total;

        const packageMeter = pkg.products.reduce(
          (pTotal, product) =>
            pTotal +
            Math.round(
              Math.floor(product.count * Math.floor(product.dimension.depth))
            ),
          0
        );

        return total + packageMeter;
      }, 0) / 1000;

    this._calculationCache.set(cacheKey, this.totalMeter);
  }

  /**
   * Calculate package total weight with caching
   */
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

  /**
   * Update all calculations at once and clear cache
   */
  private updateAllCalculations(): void {
    this._calculationCache.clear();
    this._lastCalculationHash = '';

    this.calculateArea();
    this.calculateWeight();
    this.calculateTotalMeter();
  }

  /* =====================
     PRODUCT FITTING METHODS - OPTIMIZED
  ===================== */

  /**
   * Main product fitting check method - Optimized version
   */
  canFitProductToPallet(
    product: UiProduct,
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): boolean {
    // Quick dimension check first (most likely to fail)
    if (!this.checkDimensionsFit(product, pallet)) {
      return false;
    }

    // Volume check only if dimension check passes
    return this.checkVolumeAvailable(product, pallet, existingProducts);
  }

  /**
   * Dimension check - Optimized version
   */
  private checkDimensionsFit(product: UiProduct, pallet: UiPallet): boolean {
    // Safe number conversion
    const safeProductWidth = this.safeNumber(product.dimension.width);
    const safeProductDepth = this.safeNumber(product.dimension.depth);
    const safeProductHeight = this.safeNumber(product.dimension.height);
    const safePalletWidth = this.safeNumber(pallet.dimension.width);
    const safePalletDepth = this.safeNumber(pallet.dimension.depth);
    const safePalletHeight = this.safeNumber(pallet.dimension.height);

    // Height check first (most restrictive)
    if (safeProductHeight > safePalletHeight) {
      return false;
    }

    // Check both normal and rotated orientations
    const normalFit =
      safeProductWidth <= safePalletWidth &&
      safeProductDepth <= safePalletDepth;
    const rotatedFit =
      safeProductWidth <= safePalletDepth &&
      safeProductDepth <= safePalletWidth;

    return normalFit || rotatedFit;
  }

  /**
   * Volume check - Optimized version
   */
  private checkVolumeAvailable(
    product: UiProduct,
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): boolean {
    // Calculate pallet total volume
    const palletTotalVolume =
      this.safeNumber(pallet.dimension.width) *
      this.safeNumber(pallet.dimension.depth) *
      this.safeNumber(pallet.dimension.height);

    // Calculate used volume
    const usedVolume = this.calculateUsedVolume(existingProducts);

    // Calculate new product volume
    const newProductVolume =
      this.safeNumber(product.dimension.width) *
      this.safeNumber(product.dimension.depth) *
      this.safeNumber(product.dimension.height) *
      this.safeNumber(product.count);

    // Check if it fits
    return newProductVolume <= palletTotalVolume - usedVolume;
  }

  /**
   * Calculate used volume - Optimized version
   */
  private calculateUsedVolume(products: UiProduct[]): number {
    if (products.length === 0) return 0;

    return products.reduce((total, product) => {
      const volume =
        this.safeNumber(product.dimension.width) *
        this.safeNumber(product.dimension.depth) *
        this.safeNumber(product.dimension.height) *
        this.safeNumber(product.count);
      return total + volume;
    }, 0);
  }

  /**
   * Safe number conversion - Optimized
   */
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

  /**
   * Get remaining pallet volume
   */
  getRemainingPalletVolume(
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): number {
    const palletTotalVolume =
      this.safeNumber(pallet.dimension.width) *
      this.safeNumber(pallet.dimension.depth) *
      this.safeNumber(pallet.dimension.height);
    const usedVolume = this.calculateUsedVolume(existingProducts);
    return Math.max(0, palletTotalVolume - usedVolume);
  }

  /**
   * Get pallet fill percentage
   */
  getPalletFillPercentage(
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): number {
    const palletTotalVolume =
      this.safeNumber(pallet.dimension.width) *
      this.safeNumber(pallet.dimension.depth) *
      this.safeNumber(pallet.dimension.height);
    const usedVolume = this.calculateUsedVolume(existingProducts);
    return Math.round((usedVolume / palletTotalVolume) * 100);
  }

  /**
   * Get maximum product count that fits in pallet
   */
  getMaxProductCount(
    product: UiProduct,
    pallet: UiPallet,
    existingProducts: UiProduct[]
  ): number {
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

  /* =====================
     UTILITY FUNCTIONS
  ===================== */

  /**
   * Ensure UiProduct instance
   */
  private ensureUiProduct(product: any): UiProduct {
    return product instanceof UiProduct ? product : new UiProduct(product);
  }

  /**
   * Ensure UiProduct instances array
   */
  private ensureUiProducts(products: any[]): UiProduct[] {
    return products.map((product) => this.ensureUiProduct(product));
  }

  /**
   * Ensure UiProduct instance with list update
   */
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

  /**
   * Replace product in list
   */
  private replaceProductInList(
    oldProduct: UiProduct,
    newProducts: UiProduct[]
  ): void {
    const index = this.availableProducts.indexOf(oldProduct);
    if (index !== -1) {
      this.availableProducts.splice(index, 1, ...newProducts);
    } else {
      this.availableProducts.push(...newProducts);
    }
  }

  /**
   * Consolidate products by combining same IDs - Optimized
   */
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

  /* =====================
     DRAG & DROP OPERATIONS
  ===================== */

  /**
   * Drop product to pallet - Optimized
   */
  dropProductToPallet(event: CdkDragDrop<UiProduct[]>): void {
    // Mevcut drop logic'i aynı kalacak...
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
    }

    // Perform drop operation
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

    this.updateAllCalculations();

    // YENİ: Drop sonrası auto-save
    this.triggerAutoSave('drag-drop');
  }

  /**
   * Drop pallet to package
   */
  dropPalletToPackage(event: CdkDragDrop<any>): void {
    // Mevcut logic aynı kalacak...
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

    this.packages[packageIndex].pallet = palletClone;
    this.selectedPallets.push(palletClone);
    this.addNewEmptyPackage();

    // YENİ: Pallet drop sonrası auto-save
    this.triggerAutoSave('drag-drop');
  }

  /**
   * Drag started - Optimized
   */
  dragStarted(event: CdkDragStart): void {
    this.isDragInProgress = true;

    const product = event.source.data as UiProduct;
    this.currentDraggedProduct = product;

    // Mevcut fitting logic...
    const palletElements = new Map<string, HTMLElement>();

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

  /**
   * Drag ended event
   */
  dragEnded(): void {
    this.isDragInProgress = false;
    this.currentDraggedProduct = null;

    document.querySelectorAll('.can-drop, .cannot-drop').forEach((el) => {
      el.classList.remove('can-drop', 'cannot-drop');
    });

    // YENİ: Drag işlemi bitince auto-save trigger et
    setTimeout(() => {
      this.triggerAutoSave('drag-drop');
    }, 500); // 500ms sonra kaydet
  }

  /* =====================
     PRODUCT MANAGEMENT
  ===================== */

  /**
   * Optimized split product method
   */
  splitProduct(product: UiProduct, splitCount?: number | null): void {
    // Mevcut split logic...
    const uiProduct = this.ensureUiProductInstance(product);
    const validatedCount = this.validateSplitCount(uiProduct, splitCount);

    if (validatedCount === null) return;

    this.performSplit(uiProduct, validatedCount);

    // YENİ: Split sonrası auto-save
    this.triggerAutoSave('user-action');
  }

  /**
   * Validate split count
   */
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

  /**
   * Perform split operation
   */
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

      this.replaceProductInList(product, [firstPart, secondPart]);

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
      this.replaceProductInList(product, splitProducts);

      this.toastService.success(`${product.name} yarıya bölündü.`, 'Başarılı');
    }
  }

  /**
   * Remove product from package
   */
  removeProductFromPackage(pkg: UiPackage, productIndex: number): void {
    const removedProduct = pkg.products.splice(productIndex, 1)[0];
    const uiProduct = this.ensureUiProduct(removedProduct);
    this.availableProducts.push(uiProduct);
    this.updateAllCalculations();

    // YENİ: Remove sonrası auto-save
    this.triggerAutoSave('user-action');
  }

  /**
   * Remove all packages
   */
  removeAllPackage(): void {
    const allProducts: UiProduct[] = [];

    this.packages.forEach((pkg) => {
      if (pkg.products?.length > 0) {
        allProducts.push(...this.ensureUiProducts(pkg.products));
        pkg.products = [];
      }
      pkg.pallet = null;
    });

    this.availableProducts.push(...allProducts);
    this.availableProducts = this.consolidateProducts(this.availableProducts);

    this.packages = [];
    this.selectedPallets = [];
    this.addNewEmptyPackage();
    this.updateAllCalculations();

    this.toastService.success('Tüm paletler temizlendi.', 'Başarılı');

    // YENİ: Remove all sonrası auto-save
    this.triggerAutoSave('user-action');
  }
  removePackage(packageToRemove: any): void {
    // Mevcut logic...
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
      this.availableProducts.push(...productsToReturn);
      this.availableProducts = this.consolidateProducts(this.availableProducts);
    }

    if (pkg.pallet) {
      const palletIndex = this.selectedPallets.findIndex(
        (pallet) => pallet === pkg.pallet
      );
      if (palletIndex !== -1) {
        this.selectedPallets.splice(palletIndex, 1);
      }
    }

    this.packages.splice(packageIndex, 1);

    if (this.packages.length === 0) {
      this.addNewEmptyPackage();
    }

    this.updateAllCalculations();
    this.toastService.success('Paket silindi.', 'Başarılı');

    // YENİ: Remove package sonrası auto-save
    this.triggerAutoSave('user-action');
  }
  /**
   * Remove pallet from package
   */
  removePalletFromPackage(packageItem: UiPackage): void {
    // Mevcut logic...
    if (packageItem.pallet) {
      if (packageItem.products?.length > 0) {
        const uiProducts = this.ensureUiProducts(packageItem.products);
        this.availableProducts.push(...uiProducts);
        packageItem.products = [];
      }

      const palletIndex = this.selectedPallets.findIndex(
        (p) => p.id === packageItem.pallet?.id
      );
      if (palletIndex !== -1) {
        this.selectedPallets.splice(palletIndex, 1);
      }

      packageItem.pallet = null;
      this.updateAllCalculations();

      // YENİ: Remove pallet sonrası auto-save
      this.triggerAutoSave('user-action');
    }
  }

  /**
   * Add new empty package
   */
  addNewEmptyPackage(): void {
    const emptyPackages = this.packages.filter((p) => p.pallet === null);

    if (emptyPackages.length < 2) {
      const newPackage = new UiPackage({
        id: Guid(),
        pallet: null,
        products: [],
        order: this.order,
      });

      this.packages.push(newPackage);
    }
  }

  /* =====================
     GETTERS
  ===================== */

  /**
   * Get all pallet product lists
   */
  get palletProductsLists(): string[] {
    const allPalletIds: string[] = ['productsList'];
    for (const pkg of this.packages) {
      if (pkg.pallet) {
        allPalletIds.push(pkg.pallet.id);
      }
    }
    return allPalletIds;
  }

  /**
   * Get empty package IDs
   */
  get packageIds(): string[] {
    return this.packages
      .filter((pkg) => pkg.pallet === null)
      .map((pkg) => pkg.id);
  }

  /* =====================
     FORM OPERATIONS
  ===================== */

  getPackageData(): any {
    return mapPackageToPackageDetail(this.packages);
  }

  submitForm(): void {
    const packageData = this.getPackageData();

    this.repository.bulkCreatePackageDetail(packageData).subscribe({
      next: (response) => {
        this.toastService.success('Kaydedildi', 'Başarılı');
        this.stepperService.setStepStatus(2, STATUSES.completed, true);

        this.saveCurrentStateToSession();
      },
    });
  }
}

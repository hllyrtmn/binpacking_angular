import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, computed, signal, effect, AfterViewInit, OnDestroy } from '@angular/core';
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
import { map, shareReplay, skip, switchMap, take, takeUntil, tap } from 'rxjs/operators';

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
export class PalletControlComponent implements OnInit, AfterViewInit, OnDestroy {
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
  public order$ = this.store.select(StepperSelectors.selectStep1Order);

  // Form change tracking
  private lastPackageState: string = '';
  private autoSaveTimeout: any;
  private isDragInProgress: boolean = false;
  private destroy$ = new Subject<void>();

  // Main data properties - Signals
  public packages = signal<UiPackage[]>([], {
    equal: (a, b) => {
      if (a.length !== b.length) return false;
      return a.every((pkg, i) =>
        pkg.id === b[i]?.id &&
        pkg.products.length === b[i]?.products.length &&
        pkg.pallet?.id === b[i]?.pallet?.id  // Bu satırı ekle
      );
    }
  });

  public availableProducts = signal<UiProduct[]>([], {
    equal: (a, b) => {
      if (a.length !== b.length) return false;
      return a.every((prod, i) => prod.id === b[i]?.id && prod.count === b[i]?.count);
    }
  });

  public availablePallets = signal<UiPallet[]>([]);
  public selectedPallets = signal<UiPallet[]>([]);

  // Computed signals for performance
  public packageCount = computed(() => this.packages().length);
  public availableProductCount = computed(() => this.availableProducts().length);
  public hasPackages = computed(() => this.packages().length > 0);
  public hasAvailableProducts = computed(() => this.availableProducts().length > 0);
  public availablePalletCount = computed(() => this.availablePallets().length);
  public selectedPalletCount = computed(() => this.selectedPallets().length);
  public hasAvailablePallets = computed(() => this.availablePallets().length > 0);
  public hasSelectedPallets = computed(() => this.selectedPallets().length > 0);

  // Drag-Drop computed signals
  public allDropListIds = computed(() => {
    const ids = ['productsList', 'availablePalletsList'];

    // Package container'ları ekle (boş paketler için)
    this.packages()
      .filter(pkg => pkg.pallet === null)
      .forEach(pkg => ids.push(pkg.id));

    // Pallet container'ları ekle
    this.packages()
      .filter(pkg => pkg.pallet !== null)
      .forEach(pkg => {
        if (pkg.pallet) {
          ids.push(pkg.pallet.id);
        }
      });

    return ids;
  });

  public packageDropListIds = computed(() => {
    return this.packages()
      .filter(pkg => pkg.pallet === null)
      .map(pkg => pkg.id);
  });

  public palletDropListIds = computed(() => {
  const ids = ['productsList'];

  this.packages()
    .filter(pkg => pkg.pallet !== null)
    .forEach(pkg => {
      if (pkg.pallet) {
        ids.push(pkg.pallet.id);
      }
    });
  return ids;
});

  // Form and other properties
  secondFormGroup: FormGroup;
  order: any;
  currentDraggedProduct: UiProduct | null = null;
  private cloneCount = 1;

  // Weight and dimension calculations
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
    if (this.order) {
      const trailerWeightLimit = this.order.truck?.weight_limit ?? 0;
      return Math.floor(trailerWeightLimit - this.totalWeight());
    }
    return 0;
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

    let trailerArea = 0;
    if (this.order) {
      trailerArea = (this.order.truck?.dimension?.width ?? 0) * (this.order.truck?.dimension?.depth ?? 0);
    }

    return Math.floor((trailerArea - totalArea) / 1000000);
  });

  // Pallet weight analytics
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

  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });
    effect(() => {
    const currentPackages = this.packages();
    const emptyPackages = currentPackages.filter(p => p.pallet === null);

    // Eğer hiç boş package yoksa ve component initialize olduysa
    if (emptyPackages.length === 0 && currentPackages.length >= 0) {
      // Async olarak boş package ekle (infinite loop önlemek için)
      setTimeout(() => {
        this.addNewEmptyPackage();
      }, 0);
    }
  });
  }

  // Track by functions
  trackByPackageId(index: number, item: UiPackage): string {
    return item.id;
  }

  trackByProductId(index: number, item: UiProduct): string {
    return item.id;
  }

  trackByPalletId(index: number, item: UiPallet): string {
    return item.id;
  }

  ngOnInit(): void {
    this.loadPallets();

    // Store'dan veri yükleme işlemi
    this.step2Packages$.pipe(
      take(1),
      switchMap(storePackages => {
        if (storePackages.length > 0) {
          // Store'da data var, signal'ları initialize et
          const uiPackages = storePackages.map(pkg => new UiPackage(pkg));
          this.packages.set(uiPackages);
          this.order = this.packages()[0].order;

          // Available products'ı da yükle
          return this.step2AvailableProducts$.pipe(
            take(1),
            tap(storeProducts => {
              const uiProducts = storeProducts.map(product => new UiProduct(product));
              this.availableProducts.set(uiProducts);
            })
          );
        } else {
          // Store'da data yok
          this.restoreFromSession();
          this.configureComponent();
          return of(null);
        }
      })
    ).subscribe(() => {
      this.restoreFromSession();
      this.setupStoreSubscriptions();
      this.setupAutoSaveListeners();
    });
  }

  ngAfterViewInit(): void {
    this.saveCurrentStateToSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  private setupStoreSubscriptions(): void {
    // Packages değiştiğinde component'i güncelle
    this.step2Packages$.pipe(
      skip(1),
      takeUntil(this.destroy$)
    ).subscribe(packages => {
      if (packages.length > 0) {
        const uiPackages = packages.map(pkg => new UiPackage(pkg));
        this.packages.set(uiPackages);
        this.refreshDropLists();
      }
    });

    // Available products değiştiğinde güncelle
    this.step2AvailableProducts$.pipe(
      skip(1),
      takeUntil(this.destroy$)
    ).subscribe(products => {
      const uiProducts = products.map(product => new UiProduct(product));
      this.availableProducts.set(uiProducts);
      this.refreshDropLists();
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
      this.selectedPallets.set([]);
      this.availablePallets.set([]);

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
      if (currentState !== this.lastPackageState && this.packages().length > 0) {
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
        this.packages(),
        this.availableProducts()
      );
    } catch (error) {}
  }

  configureComponent(): void {
    this.repository.calculatePackageDetail().subscribe({
      next: (response) => {
        if (response.packages.length === 0) {
          this.addNewEmptyPackage();
          return;
        }

        this.store.dispatch(StepperActions.initializeStep2State({
          packages: response.packages || [],
          availableProducts: response.remainingProducts || []
        }));

        if (
          this.packages().length > 0 &&
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
        this.availablePallets.set(response);
      },
    });
  }

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

  packageTotalWeight(pkg: UiPackage): number {
    const palletWeight = Math.floor(pkg.pallet?.weight ?? 0);
    const productsWeight = pkg.products.reduce(
      (total, product) => {
        if (!this.order) { return 0; }
        if (this.order.weight_type == 'std') {
          return total + Math.floor(product.weight_type.std * product.count);
        }
        else if (this.order.weight_type == 'eco') {
          return total + Math.floor(product.weight_type.eco * product.count);
        }
        else {
          return total + Math.floor(product.weight_type.pre * product.count);
        }
      }, 0
    );

    return palletWeight + productsWeight;
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

  // Helper methods for UI models
  private ensureUiProduct(product: any): UiProduct {
    return product instanceof UiProduct ? product : new UiProduct(product);
  }

  private ensureUiProducts(products: any[]): UiProduct[] {
    return products.map((product) => this.ensureUiProduct(product));
  }

  private ensureUiProductInstance(product: any): UiProduct {
    if (!(product instanceof UiProduct)) {
      const uiProduct = new UiProduct(product);
      const currentProducts = this.availableProducts();
      const index = currentProducts.indexOf(product);

      if (index !== -1) {
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

  // Refresh drop lists after signal changes
  private refreshDropLists(): void {
    this.cdr.detectChanges();

    // DOM'un güncellenmesi için kısa bir delay
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  // Drag & Drop Event Handlers
dropProductToPallet(event: CdkDragDrop<UiProduct[]>): void {
  // Aynı container içinde taşıma - pozisyon değiştirme
  if (event.previousContainer === event.container) {
    if (event.container.id === 'productsList') {
      // Available products içinde sıralama değişikliği
      const reorderedProducts = [...this.availableProducts()];
      moveItemInArray(reorderedProducts, event.previousIndex, event.currentIndex);
      this.availableProducts.set(reorderedProducts);
    } else {
      // Palet içinde sıralama değişikliği
      const currentPackages = this.packages();
      const targetPackage = currentPackages.find(pkg =>
        pkg.pallet && pkg.pallet.id === event.container.id
      );

      if (targetPackage) {
        const reorderedProducts = [...targetPackage.products];
        moveItemInArray(reorderedProducts, event.previousIndex, event.currentIndex);

        const updatedPackage = { ...targetPackage, products: reorderedProducts };
        const updatedPackages = currentPackages.map(pkg =>
          pkg.id === updatedPackage.id ? updatedPackage : pkg
        ) as UiPackage[];
        this.packages.set(updatedPackages);

        this.store.dispatch(StepperActions.updatePackage({ package: updatedPackage }));
      }
    }

    this.triggerAutoSave('drag-drop');
    return;
  }

  const product = event.previousContainer.data[event.previousIndex];

  // Paletten available products'a geri alma
  if (event.container.id === 'productsList') {
    const sourceProducts = [...event.previousContainer.data];
    const targetProducts = [...this.availableProducts()];

    const removedProduct = sourceProducts.splice(event.previousIndex, 1)[0];
    targetProducts.push(removedProduct);

    this.availableProducts.set(targetProducts);

    const currentPackages = this.packages();
    const sourcePackage = currentPackages.find(pkg =>
      pkg.pallet && pkg.pallet.id === event.previousContainer.id
    );

    if (sourcePackage) {
      const updatedPackages = currentPackages.map(pkg =>
        pkg.id === sourcePackage.id ? { ...pkg, products: sourceProducts } : pkg
      ) as UiPackage[];
      this.packages.set(updatedPackages);

      this.store.dispatch(StepperActions.updatePackage({ package: { ...sourcePackage, products: sourceProducts } }));
    }

    this.store.dispatch(StepperActions.updateAvailableProducts({
      availableProducts: targetProducts
    }));

    this.triggerAutoSave('drag-drop');
    return;
  }

  // Hedef palet bulma
  const targetPalletId = event.container.id;
  const currentPackages = this.packages();
  const targetPackage = currentPackages.find(p => p.pallet && p.pallet.id === targetPalletId);

  if (!targetPackage) return;

  // Source container'ın palet mi yoksa productsList mi olduğunu kontrol et
  const isSourceFromPallet = event.previousContainer.id !== 'productsList';

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

      const sourceProducts = [...sourcePackage.products];
      const targetProducts = [...targetPackage.products];

      const removedProduct = sourceProducts.splice(event.previousIndex, 1)[0];
      targetProducts.push(removedProduct);

      const updatedPackages = currentPackages.map(pkg => {
        if (pkg.id === sourcePackage.id) return { ...pkg, products: sourceProducts };
        if (pkg.id === targetPackage.id) return { ...pkg, products: targetProducts };
        return pkg;
      }) as UiPackage[];

      this.packages.set(updatedPackages);

      this.store.dispatch(StepperActions.updatePackage({ package: { ...sourcePackage, products: sourceProducts } }));
      this.store.dispatch(StepperActions.updatePackage({ package: { ...targetPackage, products: targetProducts } }));

      this.triggerAutoSave('drag-drop');
      this.toastService.success(`${removedProduct.name} başka palete taşındı`);
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

  const sourceProducts = [...this.availableProducts()];
  const targetProducts = [...targetPackage.products];

  const removedProduct = sourceProducts.splice(event.previousIndex, 1)[0];
  targetProducts.push(removedProduct);

  this.availableProducts.set(sourceProducts);

  const updatedPackage = { ...targetPackage, products: targetProducts };
  const updatedPackages = currentPackages.map(pkg =>
    pkg.id === updatedPackage.id ? updatedPackage : pkg
  ) as UiPackage[];
  this.packages.set(updatedPackages);

  this.store.dispatch(StepperActions.updatePackage({ package: updatedPackage }));
  this.store.dispatch(StepperActions.updateAvailableProducts({ availableProducts: sourceProducts }));

  this.triggerAutoSave('drag-drop');
  this.toastService.success(`${removedProduct.name} palete eklendi`);
}

  dropPalletToPackage(event: CdkDragDrop<any>): void {
  if (event.previousContainer === event.container) return;

  const currentPackages = this.packages();
  const targetPackage = currentPackages.find(p => p.id === event.container.id);

  if (!targetPackage) return;

  if (targetPackage.pallet !== null) {
    this.toastService.warning('Bu pakette zaten bir palet var');
    return;
  }

  const originalPallet = event.previousContainer.data[event.previousIndex];
  const palletClone = new UiPallet({
    ...originalPallet,
    id: originalPallet.id + '/' + this.cloneCount++,
  });

  const updatedPackages = currentPackages.map(pkg =>
    pkg.id === targetPackage.id ? { ...targetPackage, pallet: palletClone } : pkg
  ) as UiPackage[];

  this.packages.set(updatedPackages);

  const currentSelectedPallets = this.selectedPallets();
  this.selectedPallets.set([...currentSelectedPallets, palletClone]);

  this.store.dispatch(StepperActions.updatePackage({
    package: { ...targetPackage, pallet: palletClone }
  }));

  this.addNewEmptyPackage();
  this.triggerAutoSave('drag-drop');
  this.cdr.detectChanges();

  this.toastService.success(`${palletClone.name} paleti eklendi`);
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
    }, 500);
  }

  // Product manipulation methods
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

  removeProductFromPackage(pkg: UiPackage, productIndex: number): void {
    const currentPackages = this.packages();
    const currentAvailableProducts = this.availableProducts();

    const productToRemove = pkg.products[productIndex];
    if (!productToRemove) return;

    const updatedPackageProducts = [...pkg.products];
    const removedProduct = updatedPackageProducts.splice(productIndex, 1)[0];

    const updatedPackage = { ...pkg, products: updatedPackageProducts };
    const updatedPackages = currentPackages.map(p =>
      p.id === pkg.id ? updatedPackage : p
    ) as UiPackage[];

    const updatedAvailableProducts = [...currentAvailableProducts, removedProduct];

    this.packages.set(updatedPackages);
    this.availableProducts.set(updatedAvailableProducts);

    this.store.dispatch(StepperActions.updatePackage({ package: updatedPackage }));
    this.store.dispatch(StepperActions.updateAvailableProducts({ availableProducts: updatedAvailableProducts }));

    this.triggerAutoSave('user-action');
    this.toastService.success(`${removedProduct.name} ürünü çıkarıldı`);
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

    this.packages.set([]);
    this.availableProducts.set(consolidatedProducts);
    this.selectedPallets.set([]);

    this.store.dispatch(StepperActions.initializeStep2State({
      packages: [],
      availableProducts: consolidatedProducts
    }));

    this.addNewEmptyPackage();
    this.triggerAutoSave('user-action');
    this.toastService.success('Tüm paletler temizlendi.', 'Başarılı');
  }

  removePackage(packageToRemove: any): void {
    const currentPackages = this.packages();
    const packageIndex = currentPackages.findIndex(
      (pkg) => pkg === packageToRemove || (pkg.id && packageToRemove.id && pkg.id === packageToRemove.id)
    );

    if (packageIndex === -1) {
      this.toastService.error('Paket bulunamadı.', 'Hata');
      return;
    }

    const pkg = currentPackages[packageIndex];

    if (pkg.products?.length > 0) {
      const productsToReturn = this.ensureUiProducts(pkg.products);
      const updatedProducts = [...this.availableProducts(), ...productsToReturn];
      const consolidatedProducts = this.consolidateProducts(updatedProducts);
      this.availableProducts.set(consolidatedProducts);
    }

    if (pkg.pallet) {
      const currentSelectedPallets = this.selectedPallets();
      const palletIndex = currentSelectedPallets.findIndex(pallet => pallet === pkg.pallet);
      if (palletIndex !== -1) {
        const updatedSelectedPallets = [...currentSelectedPallets];
        updatedSelectedPallets.splice(palletIndex, 1);
        this.selectedPallets.set(updatedSelectedPallets);
      }
    }

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
    if (!packageItem.pallet) return;

    if (packageItem.products?.length > 0) {
      const uiProducts = this.ensureUiProducts(packageItem.products);
      const currentAvailableProducts = this.availableProducts();
      const updatedProducts = [...currentAvailableProducts, ...uiProducts];
      this.availableProducts.set(updatedProducts);
    }

    const currentSelectedPallets = this.selectedPallets();
    const palletIndex = currentSelectedPallets.findIndex(p => p.id === packageItem.pallet?.id);
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

  addNewEmptyPackage(): void {
    const currentPackages = this.packages();
    const emptyPackages = currentPackages.filter(p => p.pallet === null);

    if (emptyPackages.length < 2) {
      const newPackage = new UiPackage({
        id: Guid(),
        pallet: null,
        products: [],
        order: this.order,
        name: (currentPackages.length + 1).toString()
      });

      const updatedPackages = [...currentPackages, newPackage];
      this.packages.set(updatedPackages);

      this.store.dispatch(StepperActions.addPackage({ package: newPackage }));
    }
  }

  getPackageData(): any {
    return mapPackageToPackageDetail(this.packages());
  }

  submitForm(): void {
    const currentPackages = this.packages();
    const packageData = mapPackageToPackageDetail(currentPackages);

    this.repository.bulkCreatePackageDetail(packageData).subscribe({
      next: (response) => {
        this.toastService.success('Kaydedildi', 'Başarılı');

        this.store.dispatch(StepperActions.setStepCompleted({ stepIndex: 1 }));
        this.store.dispatch(StepperActions.setStepValidation({ stepIndex: 1, isValid: true }));

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

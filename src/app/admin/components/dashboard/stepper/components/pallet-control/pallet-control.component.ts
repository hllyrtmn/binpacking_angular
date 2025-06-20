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
  // Servis injections
  repository: RepositoryService = inject(RepositoryService);
  toastService: ToastService = inject(ToastService);
  stepperService = inject(StepperStore);

  // Ana data properties
  packages: UiPackage[] = [];
  availableProducts: UiProduct[] = [];
  availablePallets: UiPallet[] = [];
  selectedPallets: UiPallet[] = [];
  secondFormGroup: FormGroup;
  order: any;

  // Drag & Drop
  currentDraggedProduct: UiProduct | null = null;

  // Trailer specifications
  trailer = {
    width: 11800,
    depth: 2350,
    height: 2400,
    weighLimit: 25000
  };

  // Calculated values
  remainingVolume: number = 0;
  remainingWeight: number = 0;
  totalWeight: number = 0;
  totalMeter: number = 0;

  // Utility
  private cloneCount = 1;

  // Debug mode - Production'da false yapın
  debugMode: boolean = true;

  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.debugMode) {
      this.setupDebugConsole();
    }
  }

  /* =====================
     COMPONENT SETUP
  ===================== */
  configureComponent(): void {
    this.loadPallets();
    this.repository.calculatePackageDetail().subscribe({
      next: (response) => {
        this.packages = response;
        this.order = this.packages[0].order;
        console.log("ana data", this.packages);

        // Convert all products to UiProduct instances
        this.packages.forEach((pkg, index) => {
          if (pkg.pallet) {
            pkg.pallet.id = pkg.pallet.id + '/' + index;
          }
          pkg.name = 'Palet' + index;
          pkg.products = this.ensureUiProducts(pkg.products);
        });

        this.availableProducts = this.ensureUiProducts(this.availableProducts);
        this.addNewEmptyPackage();
        this.updateAllCalculations();

        // Debug setup
        if (this.debugMode) {
          setTimeout(() => {
            this.setupDebugConsole();
            console.log('🎯 Component yüklendi, debug hazır!');
          }, 1000);
        }
      }
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
     PALLET STATISTICS - OPTIMIZED
  ===================== */

  /**
   * Get active pallet weights (single calculation)
   */
  private getActivePalletWeights(): number[] {
    if (!this.packages?.length) return [];

    return this.packages
      .filter(pkg => pkg.pallet && pkg.products?.length > 0)
      .map(pkg => this.packageTotalWeight(pkg));
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
     CALCULATIONS - OPTIMIZED
  ===================== */

  /**
   * Calculate remaining volume
   */
  calculateVolume(): void {
    const totalVolume = this.packages.reduce((total, pkg) => {
      const palletVolume = Math.floor(pkg.pallet?.dimension.volume ?? 0);
      const productsVolume = pkg.products.reduce((pTotal, product) =>
        pTotal + Math.floor(product.dimension.volume), 0);
      return total + palletVolume + productsVolume;
    }, 0);

    const trailerVolume = this.trailer.depth * this.trailer.height * this.trailer.width;
    this.remainingVolume = Math.floor((trailerVolume - totalVolume) / 1000);
  }

  /**
   * Calculate total and remaining weight
   */
  calculateWeight(): void {
    const totalWeight = this.packages.reduce((total, pkg) => {
      const palletWeight = Math.floor(pkg.pallet?.weight ?? 0);
      const productsWeight = pkg.products.reduce((pTotal, product) =>
        pTotal + Math.floor(product.weight_type.std * product.count), 0);
      return total + palletWeight + productsWeight;
    }, 0);

    this.totalWeight = totalWeight;
    this.remainingWeight = Math.floor(this.trailer.weighLimit - totalWeight);
  }

  /**
   * Calculate total meter
   */
  calculateTotalMeter(): void {
    this.totalMeter = this.packages.reduce((total, pkg) => {
      if (pkg.products.length === 0) return total;

      const packageMeter = pkg.products.reduce((pTotal, product) =>
        pTotal + Math.round(Math.floor(product.count * Math.floor(product.dimension.depth))), 0);

      return total + packageMeter;
    }, 0) / 1000;
  }

  /**
   * Calculate package total weight
   */
  packageTotalWeight(pkg: UiPackage): number {
    const palletWeight = Math.floor(pkg.pallet?.weight ?? 0);
    const productsWeight = pkg.products.reduce((total, product) =>
      total + Math.floor(product.weight_type.std * product.count), 0);

    return palletWeight + productsWeight;
  }

  /**
   * Update all calculations at once
   */
  private updateAllCalculations(): void {
    this.calculateVolume();
    this.calculateWeight();
    this.calculateTotalMeter();
  }

  /* =====================
     ENHANCED PRODUCT FITTING METHODS WITH DEBUG
  ===================== */

  /**
   * Ana ürün sığma kontrol metodu - Enhanced Debug Version
   */
  canFitProductToPallet(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): boolean {
    if (this.debugMode) {
      console.group(`🔍 FITTING CHECK: ${product.name} -> ${pallet.name}`);

      // Dimension debug
      this.debugDimensions(product, pallet);

      // Unit detection
      this.detectUnits(product, pallet);

      // Ürün bilgileri
      console.log('📦 ÜRÜN BİLGİLERİ:', {
        name: product.name,
        count: product.count,
        dimensions: {
          width: product.dimension.width,
          depth: product.dimension.depth,
          height: product.dimension.height,
          volume: product.dimension.width * product.dimension.depth * product.dimension.height
        },
        totalVolume: product.dimension.width * product.dimension.depth * product.dimension.height * product.count
      });

      // Palet bilgileri
      console.log('📋 PALET BİLGİLERİ:', {
        name: pallet.name,
        dimensions: {
          width: pallet.dimension.width,
          depth: pallet.dimension.depth,
          height: pallet.dimension.height,
          volume: pallet.dimension.width * pallet.dimension.depth * pallet.dimension.height
        }
      });

      // Mevcut ürünler bilgisi
      console.log('📚 MEVCUT ÜRÜNLER:', {
        count: existingProducts.length,
        products: existingProducts.map(p => ({
          name: p.name,
          count: p.count,
          volume: p.dimension.width * p.dimension.depth * p.dimension.height * p.count
        })),
        totalUsedVolume: this.calculateUsedVolumeEnhanced(existingProducts)
      });
    }

    // 1. Boyut kontrolü
    if (this.debugMode) {
      console.log('\n🔍 ADIM 1: BOYUT KONTROLÜ');
    }
    const dimensionResult = this.checkDimensionsFit(product, pallet);

    if (!dimensionResult) {
      if (this.debugMode) {
        console.error('❌ BOYUT KONTROLÜ BAŞARISIZ!');
        console.groupEnd();
      }
      return false;
    }

    if (this.debugMode) {
      console.log('✅ Boyut kontrolü başarılı');
    }

    // 2. Hacim kontrolü
    if (this.debugMode) {
      console.log('\n🔍 ADIM 2: HACİM KONTROLÜ');
    }
    const volumeResult = this.checkVolumeAvailable(product, pallet, existingProducts);

    if (!volumeResult) {
      if (this.debugMode) {
        console.error('❌ HACİM KONTROLÜ BAŞARISIZ!');
        console.groupEnd();
      }
      return false;
    }

    if (this.debugMode) {
      console.log('✅ Hacim kontrolü başarılı');
      console.log('🎉 SONUÇ: Ürün palete sığıyor!');
      console.groupEnd();
    }
    return true;
  }

  /**
   * Boyut kontrolü - Enhanced Debug Version
   */
  private checkDimensionsFit(product: UiProduct, pallet: UiPallet): boolean {
    // Ham verileri çek
    const productWidth = product.dimension.width;
    const productDepth = product.dimension.depth;
    const productHeight = product.dimension.height;

    const palletWidth = pallet.dimension.width;
    const palletDepth = pallet.dimension.depth;
    const palletHeight = pallet.dimension.height;

    if (this.debugMode) {
      console.log('🔍 RAW DATA INSPECTION:');
      console.log('Product raw data:', {
        width: productWidth,
        width_type: typeof productWidth,
        width_constructor: productWidth?.constructor?.name,
        depth: productDepth,
        depth_type: typeof productDepth,
        height: productHeight,
        height_type: typeof productHeight
      });

      console.log('Pallet raw data:', {
        width: palletWidth,
        width_type: typeof palletWidth,
        width_constructor: palletWidth?.constructor?.name,
        depth: palletDepth,
        depth_type: typeof palletDepth,
        height: palletHeight,
        height_type: typeof palletHeight
      });

      // String karşılaştırması kontrolü
      console.log('🧪 STRING COMPARISON TEST:');
      console.log(`   "${productWidth}" <= "${palletWidth}" = ${productWidth <= palletWidth}`);
      console.log(`   "${productDepth}" <= "${palletDepth}" = ${productDepth <= palletDepth}`);

      // Number'a zorla çevirme testi
      const productWidthNum = Number(productWidth);
      const productDepthNum = Number(productDepth);
      const productHeightNum = Number(productHeight);
      const palletWidthNum = Number(palletWidth);
      const palletDepthNum = Number(palletDepth);
      const palletHeightNum = Number(palletHeight);

      console.log('🔢 NUMBER CONVERSION TEST:');
      console.log('Product numbers:', {
        width: productWidthNum,
        width_isNaN: isNaN(productWidthNum),
        depth: productDepthNum,
        depth_isNaN: isNaN(productDepthNum),
        height: productHeightNum,
        height_isNaN: isNaN(productHeightNum)
      });

      console.log('Pallet numbers:', {
        width: palletWidthNum,
        width_isNaN: isNaN(palletWidthNum),
        depth: palletDepthNum,
        depth_isNaN: isNaN(palletDepthNum),
        height: palletHeightNum,
        height_isNaN: isNaN(palletHeightNum)
      });

      console.log('🧮 NUMBER COMPARISON TEST:');
      console.log(`   ${productWidthNum} <= ${palletWidthNum} = ${productWidthNum <= palletWidthNum}`);
      console.log(`   ${productDepthNum} <= ${palletDepthNum} = ${productDepthNum <= palletDepthNum}`);
      console.log(`   ${productHeightNum} <= ${palletHeightNum} = ${productHeightNum <= palletHeightNum}`);
    }

    // Güvenli sayı çevirimi
    const safeProductWidth = this.safeNumber(productWidth);
    const safeProductDepth = this.safeNumber(productDepth);
    const safeProductHeight = this.safeNumber(productHeight);
    const safePalletWidth = this.safeNumber(palletWidth);
    const safePalletDepth = this.safeNumber(palletDepth);
    const safePalletHeight = this.safeNumber(palletHeight);

    if (this.debugMode) {
      console.log('📏 SAFE NUMBER COMPARISON:');
      console.log('Safe product dimensions:', {
        width: safeProductWidth,
        depth: safeProductDepth,
        height: safeProductHeight
      });
      console.log('Safe pallet dimensions:', {
        width: safePalletWidth,
        depth: safePalletDepth,
        height: safePalletHeight
      });
    }

    // Yükseklik kontrolü
    if (this.debugMode) {
      console.log(`📐 Yükseklik kontrolü: ${safeProductHeight} <= ${safePalletHeight}`);
    }
    if (safeProductHeight > safePalletHeight) {
      if (this.debugMode) {
        console.error(`❌ Ürün yüksekliği (${safeProductHeight}) palet yüksekliğinden (${safePalletHeight}) büyük!`);
      }
      return false;
    }
    if (this.debugMode) {
      console.log('✅ Yükseklik kontrolü geçti');
    }

    // Normal yönlendirme kontrolü
    const normalWidthFit = safeProductWidth <= safePalletWidth;
    const normalDepthFit = safeProductDepth <= safePalletDepth;
    const fitsNormal = normalWidthFit && normalDepthFit;

    if (this.debugMode) {
      console.log(`🔄 Normal yönlendirme:`);
      console.log(`   width: ${safeProductWidth} <= ${safePalletWidth} = ${normalWidthFit}`);
      console.log(`   depth: ${safeProductDepth} <= ${safePalletDepth} = ${normalDepthFit}`);
      console.log(`   Normal fit: ${fitsNormal}`);
    }

    // Döndürülmüş yönlendirme kontrolü
    const rotatedWidthFit = safeProductWidth <= safePalletDepth;
    const rotatedDepthFit = safeProductDepth <= safePalletWidth;
    const fitsRotated = rotatedWidthFit && rotatedDepthFit;

    if (this.debugMode) {
      console.log(`🔃 Döndürülmüş yönlendirme:`);
      console.log(`   width: ${safeProductWidth} <= ${safePalletDepth} = ${rotatedWidthFit}`);
      console.log(`   depth: ${safeProductDepth} <= ${safePalletWidth} = ${rotatedDepthFit}`);
      console.log(`   Rotated fit: ${fitsRotated}`);
    }

    const finalResult = fitsNormal || fitsRotated;
    if (this.debugMode) {
      console.log(`📊 BOYUT SONUÇ: ${finalResult ? '✅ SİĞİYOR' : '❌ SİĞMİYOR'} (normal: ${fitsNormal}, rotated: ${fitsRotated})`);
    }

    return finalResult;
  }

  /**
   * Hacim kontrolü - Enhanced Debug Version
   */
  private checkVolumeAvailable(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): boolean {
    // Güvenli boyut değerleri al
    const palletWidth = this.safeNumber(pallet.dimension.width);
    const palletDepth = this.safeNumber(pallet.dimension.depth);
    const palletHeight = this.safeNumber(pallet.dimension.height);
    const palletTotalVolume = palletWidth * palletDepth * palletHeight;

    const productWidth = this.safeNumber(product.dimension.width);
    const productDepth = this.safeNumber(product.dimension.depth);
    const productHeight = this.safeNumber(product.dimension.height);
    const productCount = this.safeNumber(product.count);

    if (this.debugMode) {
      console.log(`📦 Palet toplam hacmi: ${palletTotalVolume.toFixed(2)} (${palletWidth} x ${palletDepth} x ${palletHeight})`);

      // Birim kontrolü
      if (palletTotalVolume > 1000000) {
        console.warn(`⚠️  Palet hacmi çok büyük (${palletTotalVolume}), birim problemi olabilir (mm³ vs m³)`);
      }
    }

    // Mevcut ürünlerin toplam hacmi
    const usedVolume = this.calculateUsedVolumeEnhanced(existingProducts);
    if (this.debugMode) {
      console.log(`📚 Kullanılan hacim: ${usedVolume.toFixed(2)}`);
    }

    // Yeni ürünün hacmi
    const newProductVolume = productWidth * productDepth * productHeight * productCount;
    if (this.debugMode) {
      console.log(`📦 Yeni ürün hacmi: ${newProductVolume.toFixed(2)} (${productWidth} x ${productDepth} x ${productHeight} x ${productCount})`);

      // Birim kontrolü
      if (newProductVolume > 1000000) {
        console.warn(`⚠️  Ürün hacmi çok büyük (${newProductVolume}), birim problemi olabilir`);
      }
    }

    // Kalan hacim
    const remainingVolume = palletTotalVolume - usedVolume;
    if (this.debugMode) {
      console.log(`💾 Kalan hacim: ${remainingVolume.toFixed(2)}`);
    }

    // Kontrol
    const fits = newProductVolume <= remainingVolume;
    if (this.debugMode) {
      console.log(`🔍 Hacim kontrolü: ${newProductVolume.toFixed(2)} <= ${remainingVolume.toFixed(2)} = ${fits}`);
    }

    if (!fits) {
      if (this.debugMode) {
        const shortage = newProductVolume - remainingVolume;
        console.error(`❌ Hacim yetersiz! ${shortage.toFixed(2)} fazla hacim gerekiyor`);

        // Kaç adet sığabileceğini hesapla
        const singleProductVolume = productWidth * productDepth * productHeight;
        const maxCount = Math.floor(remainingVolume / singleProductVolume);
        console.warn(`⚠️  Bu ürünün maksimum ${maxCount} adedi sığabilir`);
      }
    } else {
      if (this.debugMode) {
        console.log(`✅ Hacim yeterli! ${(remainingVolume - newProductVolume).toFixed(2)} hacim kalacak`);
      }
    }

    return fits;
  }

  /**
   * Enhanced version of calculateUsedVolume
   */
  private calculateUsedVolumeEnhanced(products: UiProduct[]): number {
    if (this.debugMode) {
      console.log('🧮 Kullanılan hacim hesaplanıyor (enhanced):');
    }

    if (products.length === 0) {
      if (this.debugMode) {
        console.log('   📭 Hiç ürün yok, kullanılan hacim: 0');
      }
      return 0;
    }

    let totalVolume = 0;
    products.forEach((product, index) => {
      const width = this.safeNumber(product.dimension.width);
      const depth = this.safeNumber(product.dimension.depth);
      const height = this.safeNumber(product.dimension.height);
      const count = this.safeNumber(product.count);

      const productVolume = width * depth * height * count;
      totalVolume += productVolume;

      if (this.debugMode) {
        console.log(`   📦 ${index + 1}. ${product.name}: ${productVolume.toFixed(2)} (${width} x ${depth} x ${height} x ${count})`);

        if (productVolume > 1000000) {
          console.warn(`      ⚠️  Bu ürünün hacmi çok büyük, birim problemi olabilir`);
        }
      }
    });

    if (this.debugMode) {
      console.log(`   📊 Toplam kullanılan hacim: ${totalVolume.toFixed(2)}`);
    }
    return totalVolume;
  }

  /**
   * calculateUsedVolume metodunu güncelle
   */
  private calculateUsedVolume(products: UiProduct[]): number {
    return this.calculateUsedVolumeEnhanced(products);
  }

  /**
   * Güvenli sayı çevirimi
   */
  private safeNumber(value: any): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }

    if (typeof value === 'string') {
      const num = parseFloat(value.toString());
      return isNaN(num) ? 0 : num;
    }

    if (value === null || value === undefined) {
      return 0;
    }

    // Object ise value property'sini dene
    if (typeof value === 'object' && value.value !== undefined) {
      return this.safeNumber(value.value);
    }

    // Son çare: 0 döndür
    console.warn('⚠️ Boyut değeri çevrilemedi:', value, typeof value);
    return 0;
  }

  /**
   * Dimension debug helper
   */
  debugDimensions(product: UiProduct, pallet: UiPallet): void {
    console.group('🔍 DIMENSION DEEP DIVE');

    // Product inspection
    console.log('📦 PRODUCT OBJECT INSPECTION:');
    console.log('   Full product object:', product);
    console.log('   product.dimension:', product.dimension);
    console.log('   Object.keys(product.dimension):', Object.keys(product.dimension || {}));

    // Dimension property direct access
    try {
      console.log('   Direct access test:');
      console.log('     product.dimension.width:', product.dimension.width);
      console.log('     product.dimension.depth:', product.dimension.depth);
      console.log('     product.dimension.height:', product.dimension.height);
    } catch (e) {
      console.error('   ❌ Error accessing product dimensions:', e);
    }

    // Pallet inspection
    console.log('\n📋 PALLET OBJECT INSPECTION:');
    console.log('   Full pallet object:', pallet);
    console.log('   pallet.dimension:', pallet.dimension);
    console.log('   Object.keys(pallet.dimension):', Object.keys(pallet.dimension || {}));

    // Dimension property direct access
    try {
      console.log('   Direct access test:');
      console.log('     pallet.dimension.width:', pallet.dimension.width);
      console.log('     pallet.dimension.depth:', pallet.dimension.depth);
      console.log('     pallet.dimension.height:', pallet.dimension.height);
    } catch (e) {
      console.error('   ❌ Error accessing pallet dimensions:', e);
    }

    console.groupEnd();
  }

  /**
   * Unit detection helper
   */
  detectUnits(product: UiProduct, pallet: UiPallet): void {
    const productVolume = this.safeNumber(product.dimension.width) *
                         this.safeNumber(product.dimension.depth) *
                         this.safeNumber(product.dimension.height);

    const palletVolume = this.safeNumber(pallet.dimension.width) *
                        this.safeNumber(pallet.dimension.depth) *
                        this.safeNumber(pallet.dimension.height);

    console.group('📏 UNIT DETECTION');

    console.log(`Product volume: ${productVolume}`);
    console.log(`Pallet volume: ${palletVolume}`);

    if (productVolume > 1000000 || palletVolume > 1000000) {
      console.warn('⚠️  Hacimler çok büyük - muhtemelen mm³ birimi kullanılıyor');
      console.log('💡 Önerilen çözüm: Boyutları 1000 ile böl (mm -> m dönüşümü)');
    } else if (productVolume < 1 || palletVolume < 1) {
      console.warn('⚠️  Hacimler çok küçük - muhtemelen farklı birim problemi var');
    } else {
      console.log('✅ Birimler normal görünüyor');
    }

    console.groupEnd();
  }

  /**
   * Palet için kalan hacmi hesapla
   */
  getRemainingPalletVolume(pallet: UiPallet, existingProducts: UiProduct[]): number {
    const palletTotalVolume = this.safeNumber(pallet.dimension.width) *
                             this.safeNumber(pallet.dimension.depth) *
                             this.safeNumber(pallet.dimension.height);
    const usedVolume = this.calculateUsedVolume(existingProducts);
    return Math.max(0, palletTotalVolume - usedVolume);
  }

  /**
   * Palet doluluk oranını hesapla
   */
  getPalletFillPercentage(pallet: UiPallet, existingProducts: UiProduct[]): number {
    const palletTotalVolume = this.safeNumber(pallet.dimension.width) *
                             this.safeNumber(pallet.dimension.depth) *
                             this.safeNumber(pallet.dimension.height);
    const usedVolume = this.calculateUsedVolume(existingProducts);
    return Math.round((usedVolume / palletTotalVolume) * 100);
  }

  /**
   * Ürünün palete kaç adet sığabileceğini hesapla
   */
  getMaxProductCount(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): number {
    // Boyut kontrolü
    if (!this.checkDimensionsFit(product, pallet)) {
      return 0;
    }

    // Kalan hacim
    const remainingVolume = this.getRemainingPalletVolume(pallet, existingProducts);

    // Tek ürün hacmi
    const singleProductVolume = this.safeNumber(product.dimension.width) *
                               this.safeNumber(product.dimension.depth) *
                               this.safeNumber(product.dimension.height);

    // Maksimum sığabilecek adet
    return Math.floor(remainingVolume / singleProductVolume);
  }

  /* =====================
     DEBUG CONSOLE SETUP
  ===================== */

  /**
   * Console'dan kullanım için global metodlar
   */
  setupDebugConsole(): void {
    if (this.debugMode) {
      // Global window objesine debug metodları ekle
      (window as any).palletDebug = {
        test: (productName: string, palletName: string) => this.testProductFitting(productName, palletName),
        testAll: (productName: string) => this.testAllPallets(productName),
        toggleDebug: () => {
          this.debugMode = !this.debugMode;
          console.log(`🔧 Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
        },
        listProducts: () => {
          console.log('📦 Mevcut ürünler:');
          this.availableProducts.forEach((p, i) => console.log(`   ${i + 1}. ${p.name} (${p.count} adet)`));
        },
        listPallets: () => {
          console.log('📋 Mevcut paletler:');
          this.packages.forEach((pkg, i) => {
            if (pkg.pallet) {
              const productCount = pkg.products.reduce((sum, p) => sum + p.count, 0);
              console.log(`   ${i + 1}. ${pkg.pallet.name} (${productCount} ürün)`);
            }
          });
        }
      };

      console.log(`
🔧 DEBUG MODU AKTİF!

Console'da kullanabileceğin komutlar:
• palletDebug.test("ürün_adı", "palet_adı") - Belirli ürün/palet testi
• palletDebug.testAll("ürün_adı") - Ürünü tüm paletlerde test et
• palletDebug.listProducts() - Mevcut ürünleri listele
• palletDebug.listPallets() - Mevcut paletleri listele
• palletDebug.toggleDebug() - Debug modunu aç/kapat

Örnek: palletDebug.test("22.C.600.2000", "2000 X 1200")
      `);
    }
  }

  /**
   * Manuel debug testi için
   */
  testProductFitting(productName: string, palletName: string): void {
    const product = this.availableProducts.find(p => p.name === productName);
    const packageWithPallet = this.packages.find(pkg => pkg.pallet?.name === palletName);

    if (!product) {
      console.error(`❌ Ürün bulunamadı: ${productName}`);
      return;
    }

    if (!packageWithPallet?.pallet) {
      console.error(`❌ Palet bulunamadı: ${palletName}`);
      return;
    }

    console.log(`\n🧪 MANUEL TEST: ${productName} -> ${palletName}`);
    this.debugProductFitting(product, packageWithPallet.pallet, packageWithPallet.products);
  }

  /**
   * Tüm paletleri test et
   */
  testAllPallets(productName: string): void {
    const product = this.availableProducts.find(p => p.name === productName);

    if (!product) {
      console.error(`❌ Ürün bulunamadı: ${productName}`);
      return;
    }

    console.log(`\n🔍 TÜM PALETLER TESTİ: ${productName}`);
    console.log('='.repeat(60));

    this.packages.forEach((pkg, index) => {
      if (pkg.pallet) {
        console.log(`\n📦 Palet ${index + 1}: ${pkg.pallet.name}`);
        const canFit = this.quickDebug(product, pkg.pallet, pkg.products);

        if (canFit) {
          const maxCount = this.getMaxProductCount(product, pkg.pallet, pkg.products);
          console.log(`   ✅ Maksimum ${maxCount} adet sığar`);
        } else {
          const remainingVolume = this.getRemainingPalletVolume(pkg.pallet, pkg.products);
          const singleVolume = this.safeNumber(product.dimension.width) *
                              this.safeNumber(product.dimension.depth) *
                              this.safeNumber(product.dimension.height);
          const maxCount = Math.floor(remainingVolume / singleVolume);
          console.log(`   ❌ Sığmaz (maksimum ${maxCount} adet)`);
        }
      }
    });
  }

  /**
   * Debug bilgileri için detaylı analiz
   */
  debugProductFitting(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): void {
    console.log('\n='.repeat(80));
    console.log('🔍 DETAYLI ÜRÜN SİĞMA ANALİZİ');
    console.log('='.repeat(80));

    // Temel bilgiler
    this.logBasicInfo(product, pallet, existingProducts);

    // Adım adım kontroller
    this.logStepByStepChecks(product, pallet, existingProducts);

    // Öneriler
    this.logSuggestions(product, pallet, existingProducts);

    console.log('='.repeat(80));
  }

  private logBasicInfo(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): void {
    console.group('📋 TEMEL BİLGİLER');

    console.table({
      'Ürün Adı': product.name,
      'Ürün Adedi': product.count,
      'Palet Adı': pallet.name,
      'Mevcut Ürün Sayısı': existingProducts.length
    });

    const productVolume = this.safeNumber(product.dimension.width) *
                         this.safeNumber(product.dimension.depth) *
                         this.safeNumber(product.dimension.height);
    const palletVolume = this.safeNumber(pallet.dimension.width) *
                        this.safeNumber(pallet.dimension.depth) *
                        this.safeNumber(pallet.dimension.height);

    console.table({
      'Ürün Boyutları': `${this.safeNumber(product.dimension.width)} x ${this.safeNumber(product.dimension.depth)} x ${this.safeNumber(product.dimension.height)}`,
      'Palet Boyutları': `${this.safeNumber(pallet.dimension.width)} x ${this.safeNumber(pallet.dimension.depth)} x ${this.safeNumber(pallet.dimension.height)}`,
      'Ürün Hacmi (tek)': productVolume.toFixed(2),
      'Ürün Hacmi (toplam)': (productVolume * this.safeNumber(product.count)).toFixed(2),
      'Palet Hacmi': palletVolume.toFixed(2)
    });

    console.groupEnd();
  }

  private logStepByStepChecks(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): void {
    console.group('🔍 ADIM ADIM KONTROLLER');

    // Boyut kontrolü detayları
    console.log('1️⃣ BOYUT KONTROLÜ:');
    const safeProductHeight = this.safeNumber(product.dimension.height);
    const safePalletHeight = this.safeNumber(pallet.dimension.height);
    const safeProductWidth = this.safeNumber(product.dimension.width);
    const safeProductDepth = this.safeNumber(product.dimension.depth);
    const safePalletWidth = this.safeNumber(pallet.dimension.width);
    const safePalletDepth = this.safeNumber(pallet.dimension.depth);

    const heightOk = safeProductHeight <= safePalletHeight;
    const normalFit = safeProductWidth <= safePalletWidth && safeProductDepth <= safePalletDepth;
    const rotatedFit = safeProductWidth <= safePalletDepth && safeProductDepth <= safePalletWidth;

    console.log(`   Yükseklik: ${safeProductHeight} <= ${safePalletHeight} = ${heightOk ? '✅' : '❌'}`);
    console.log(`   Normal: ${safeProductWidth} <= ${safePalletWidth} && ${safeProductDepth} <= ${safePalletDepth} = ${normalFit ? '✅' : '❌'}`);
    console.log(`   Döndürülmüş: ${safeProductWidth} <= ${safePalletDepth} && ${safeProductDepth} <= ${safePalletWidth} = ${rotatedFit ? '✅' : '❌'}`);

    // Hacim kontrolü detayları
    console.log('\n2️⃣ HACİM KONTROLÜ:');
    const palletVolume = safePalletWidth * safePalletDepth * safePalletHeight;
    const usedVolume = this.calculateUsedVolume(existingProducts);
    const productVolume = safeProductWidth * safeProductDepth * safeProductHeight * this.safeNumber(product.count);
    const remainingVolume = palletVolume - usedVolume;
    const volumeOk = productVolume <= remainingVolume;

    console.log(`   Palet hacmi: ${palletVolume.toFixed(2)}`);
    console.log(`   Kullanılan: ${usedVolume.toFixed(2)}`);
    console.log(`   Kalan: ${remainingVolume.toFixed(2)}`);
    console.log(`   Ürün ihtiyacı: ${productVolume.toFixed(2)}`);
    console.log(`   Sonuç: ${productVolume.toFixed(2)} <= ${remainingVolume.toFixed(2)} = ${volumeOk ? '✅' : '❌'}`);

    console.groupEnd();
  }

  private logSuggestions(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): void {
    console.group('💡 ÖNERİLER');

    const safePalletWidth = this.safeNumber(pallet.dimension.width);
    const safePalletDepth = this.safeNumber(pallet.dimension.depth);
    const safePalletHeight = this.safeNumber(pallet.dimension.height);
    const palletVolume = safePalletWidth * safePalletDepth * safePalletHeight;
    const usedVolume = this.calculateUsedVolume(existingProducts);
    const remainingVolume = palletVolume - usedVolume;
    const singleProductVolume = this.safeNumber(product.dimension.width) *
                               this.safeNumber(product.dimension.depth) *
                               this.safeNumber(product.dimension.height);
    const maxCount = Math.floor(remainingVolume / singleProductVolume);

    if (maxCount > 0 && maxCount < this.safeNumber(product.count)) {
      console.log(`🔧 Ürünü bölebilirsin: Maksimum ${maxCount} adet sığar`);
      console.log(`📦 Önerilen split: ${maxCount} adet bu palete, ${this.safeNumber(product.count) - maxCount} adet başka palete`);
    } else if (maxCount === 0) {
      console.log(`⚠️  Bu ürün hiç sığmıyor. Farklı palet dene veya mevcut ürünleri başka palete taşı`);
    } else {
      console.log(`✅ Ürün tamamen sığıyor, problem başka bir yerde olabilir`);
    }

    // Palet doluluk oranı
    const fillPercentage = (usedVolume / palletVolume) * 100;
    console.log(`📊 Mevcut palet doluluk: %${fillPercentage.toFixed(1)}`);

    if (fillPercentage > 80) {
      console.log(`⚠️  Palet neredeyse dolu, yeni ürün eklemek zor olabilir`);
    }

    console.groupEnd();
  }

  /**
   * Hızlı debug için kısa versiyon
   */
  quickDebug(product: UiProduct, pallet: UiPallet, existingProducts: UiProduct[]): boolean {
    const dimensionOk = this.checkDimensionsFit(product, pallet);
    const volumeOk = this.checkVolumeAvailable(product, pallet, existingProducts);

    if (this.debugMode) {
      console.log(`🔍 Quick Debug: ${product.name} -> ${pallet.name}`);
      console.log(`   Boyut: ${dimensionOk ? '✅' : '❌'}, Hacim: ${volumeOk ? '✅' : '❌'}`);
    }

    return dimensionOk && volumeOk;
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
    return products.map(product => this.ensureUiProduct(product));
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
  private replaceProductInList(oldProduct: UiProduct, newProducts: UiProduct[]): void {
    const index = this.availableProducts.indexOf(oldProduct);
    if (index !== -1) {
      this.availableProducts.splice(index, 1, ...newProducts);
    } else {
      this.availableProducts.push(...newProducts);
    }
  }

  /**
   * Consolidate products by combining same IDs
   */
  consolidateProducts(products: UiProduct[]): UiProduct[] {
    const consolidatedMap = new Map<string, UiProduct>();

    products.forEach(product => {
      const uiProduct = this.ensureUiProduct(product);
      const mainId = uiProduct.id.split('/')[0];

      const existing = consolidatedMap.get(mainId);
      if (existing) {
        existing.count += uiProduct.count;
      } else {
        consolidatedMap.set(mainId, new UiProduct({
          ...uiProduct,
          id: mainId
        }));
      }
    });

    return Array.from(consolidatedMap.values());
  }

  /* =====================
     DRAG & DROP OPERATIONS
  ===================== */

  /**
   * Drop product to pallet - Debug entegreli
   */
  dropProductToPallet(event: CdkDragDrop<UiProduct[]>): void {
    const product = event.previousContainer.data[event.previousIndex];
    const targetPalletId = event.container.id;
    const targetPackage = this.packages.find(p => p.pallet && p.pallet.id === targetPalletId);

    if (targetPackage && targetPackage.pallet) {

      // Debug mode aktifse detaylı analiz yap
      if (this.debugMode) {
        console.log('\n🎯 DROP EVENT TRIGGERED');
        this.debugProductFitting(product, targetPackage.pallet, targetPackage.products);
      }

      const canFit = this.canFitProductToPallet(product, targetPackage.pallet, targetPackage.products);

      if (!canFit) {
        // Debug mode'da ek bilgiler göster
        if (this.debugMode) {
          console.error('🚫 DROP REJETEDİ - Detaylı analiz yukarıda');

          // Kullanıcı için önerileri de göster
          const singleVolume = this.safeNumber(product.dimension.width) *
                              this.safeNumber(product.dimension.depth) *
                              this.safeNumber(product.dimension.height);
          const remainingVolume = this.getRemainingPalletVolume(targetPackage.pallet, targetPackage.products);
          const maxCount = Math.floor(remainingVolume / singleVolume);

          if (maxCount > 0) {
            console.log(`💡 ÖNERİ: Ürünü böl - ${maxCount} adet bu palete sığabilir`);
          }
        }

        // Daha detaylı hata mesajı
        const remainingVolume = this.getRemainingPalletVolume(targetPackage.pallet, targetPackage.products);
        const fillPercentage = this.getPalletFillPercentage(targetPackage.pallet, targetPackage.products);
        const singleVolume = this.safeNumber(product.dimension.width) *
                            this.safeNumber(product.dimension.depth) *
                            this.safeNumber(product.dimension.height);
        const maxCount = Math.floor(remainingVolume / singleVolume);

        let errorMessage = `Bu ürün palete sığmıyor. Palet doluluk: %${fillPercentage}`;

        if (maxCount > 0 && maxCount < this.safeNumber(product.count)) {
          errorMessage += `. Maksimum ${maxCount} adet sığabilir, ürünü bölebilirsiniz.`;
        } else if (maxCount === 0) {
          errorMessage += `. Kalan hacim: ${remainingVolume.toFixed(2)} - çok küçük.`;
        }

        this.toastService.error(errorMessage, 'Ürün Palete Sığmıyor!');
        return;
      } else {
        if (this.debugMode) {
          console.log('✅ DROP KABUL EDİLDİ');
        }
      }
    }

    // Normal drop işlemi devam ediyor...
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
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
  }

  /**
   * Drop pallet to package
   */
  dropPalletToPackage(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const packageIndex = this.packages.findIndex(p => p.id === event.container.id);

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
  }

  /**
   * Drag started - Debug entegreli
   */
  dragStarted(event: CdkDragStart): void {
    const product = event.source.data as UiProduct;
    this.currentDraggedProduct = product;

    if (this.debugMode) {
      console.log(`\n🚀 DRAG STARTED: ${product.name} (${product.count} adet)`);
    }

    this.packages.forEach((pkg, index) => {
      if (pkg.pallet) {

        // Debug için hızlı kontrol
        if (this.debugMode) {
          const quickResult = this.quickDebug(product, pkg.pallet, pkg.products);
          console.log(`   Palet ${index + 1} (${pkg.pallet.name}): ${quickResult ? '✅ Sığar' : '❌ Sığmaz'}`);
        }

        const canFit = this.canFitProductToPallet(product, pkg.pallet, pkg.products);
        const palletElement = document.getElementById(pkg.pallet.id);

        if (palletElement) {
          if (canFit) {
            palletElement.classList.add('can-drop');
            palletElement.classList.remove('cannot-drop');

            const maxCount = this.getMaxProductCount(product, pkg.pallet, pkg.products);
            palletElement.title = `✅ Bu palete maksimum ${maxCount} adet sığabilir`;
          } else {
            palletElement.classList.add('cannot-drop');
            palletElement.classList.remove('can-drop');

            const fillPercentage = this.getPalletFillPercentage(pkg.pallet, pkg.products);
            const singleVolume = this.safeNumber(product.dimension.width) *
                                this.safeNumber(product.dimension.depth) *
                                this.safeNumber(product.dimension.height);
            const remainingVolume = this.getRemainingPalletVolume(pkg.pallet, pkg.products);
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

    if (this.debugMode) {
      console.log('🏁 Drag analizi tamamlandı\n');
    }
  }

  /**
   * Drag ended event
   */
  dragEnded(): void {
    this.currentDraggedProduct = null;
    document.querySelectorAll('.can-drop, .cannot-drop').forEach(el => {
      el.classList.remove('can-drop');
      el.classList.remove('cannot-drop');
    });
  }

  /* =====================
     PRODUCT MANAGEMENT
  ===================== */

  /**
   * Optimized split product method
   */
  splitProduct(product: UiProduct, splitCount?: number | null): void {
    const uiProduct = this.ensureUiProductInstance(product);
    const validatedCount = this.validateSplitCount(uiProduct, splitCount);

    if (validatedCount === null) return;

    this.performSplit(uiProduct, validatedCount);
  }

  /**
   * Validate split count
   */
  private validateSplitCount(product: UiProduct, splitCount?: number | null): number | null {
    if (splitCount !== undefined && splitCount !== null) {
      if (splitCount <= 0 || splitCount >= product.count) {
        this.toastService.warning(
          `Geçersiz adet girişi. 1 ile ${product.count - 1} arasında bir değer giriniz.`,
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
        `${product.name} ${splitCount} ve ${product.count - splitCount} adet olarak bölündü.`,
        'Başarılı'
      );
    } else {
      if (typeof product.split !== 'function') {
        console.error('Split method not found on UiProduct instance');
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
  }

  /**
   * Remove all packages
   */
  removeAllPackage(): void {
    const allProducts: UiProduct[] = [];

    this.packages.forEach(pkg => {
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
  }

  /**
   * Remove pallet from package
   */
  removePalletFromPackage(packageItem: UiPackage): void {
    if (packageItem.pallet) {
      if (packageItem.products?.length > 0) {
        const uiProducts = this.ensureUiProducts(packageItem.products);
        this.availableProducts.push(...uiProducts);
        packageItem.products = [];
      }

      const palletIndex = this.selectedPallets.findIndex(p => p.id === packageItem.pallet?.id);
      if (palletIndex !== -1) {
        this.selectedPallets.splice(palletIndex, 1);
      }

      packageItem.pallet = null;
      this.updateAllCalculations();
    }
  }

  /**
   * Add new empty package
   */
  addNewEmptyPackage(): void {
    const emptyPackages = this.packages.filter(p => p.pallet === null);

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

  /* =====================
     GETTERS
  ===================== */

  /**
   * Get all pallet product lists
   */
  get palletProductsLists(): string[] {
    const allPalletIds: string[] = ['productsList'];
    this.packages.forEach(pkg => {
      if (pkg.pallet) {
        allPalletIds.push(pkg.pallet.id);
      }
    });
    return allPalletIds;
  }

  /**
   * Get empty package IDs
   */
  get packageIds(): string[] {
    return this.packages
      .filter(pkg => pkg.pallet === null)
      .map(pkg => pkg.id);
  }

  /* =====================
     FORM OPERATIONS
  ===================== */

  getPackageData(): any {
    return mapPackageToPackageDetail(this.packages);
  }

  submitForm(): void {
    const packageData = this.getPackageData();
    console.log('Submitteki data', packageData);

    this.repository.bulkCreatePackageDetail(packageData).subscribe({
      next: response => {
        this.toastService.success("Kaydedildi", "Başarılı");
        this.stepperService.setStepStatus(2, STATUSES.completed, true);
      }
    });
  }
}

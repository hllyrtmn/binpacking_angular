import {
  Component,
  OnDestroy,
  ViewChild,
  inject,
  ChangeDetectorRef,
  OnInit,
  EventEmitter,
  Output,
} from '@angular/core';
import { LoadingComponent } from '../../../../../../components/loading/loading.component';
import { MatButton } from '@angular/material/button';
import { MatStepperPrevious } from '@angular/material/stepper';
import { RepositoryService } from '../../services/repository.service';
import { StepperStore, STATUSES } from '../../services/stepper.store';
import { DomSanitizer } from '@angular/platform-browser';
import { PlotlyVisualizationComponent } from '../../../../../../components/plotly/plotly.component';
import { PlotlyService } from '../../../../../../services/plotly.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../../../../services/toast.service';
import { switchMap, takeUntil, catchError, finalize } from 'rxjs/operators';
import { Subject, EMPTY } from 'rxjs';
import { AutoSaveService } from '../../services/auto-save.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { ThreeJSTruckVisualizationComponent } from '../../../../../../components/threejs-truck-visualization/threejs-truck-visualization.component';
// Package interface for type safety
interface PackageData {
  id: number;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  color?: string;
  dimensions?: string;
}

// Loading statistics interface
interface LoadingStats {
  totalPackages: number;
  packagesLoaded: number;
  utilizationRate: number;
  cogScore: number;
  totalWeight: number;
  efficiency: number;
}

@Component({
  selector: 'app-result-step',
  standalone: true,
  imports: [
    CommonModule,
    LoadingComponent,
    MatButton,
    MatStepperPrevious,
    MatIconModule,
    ThreeJSTruckVisualizationComponent
],
  templateUrl: './result-step.component.html',
  styleUrl: './result-step.component.scss',
})
export class ResultStepComponent implements OnInit, OnDestroy {
  @ViewChild('plotlyComponent') plotlyComponent!: PlotlyVisualizationComponent;
  @ViewChild('threeJSComponent') threeJSComponent!: ThreeJSTruckVisualizationComponent;
  @Output() shipmentCompleted = new EventEmitter<void>();

  // **ÖNEMLİ: Component lifecycle ve cleanup için**
  private destroy$ = new Subject<void>();
  private isDestroyed = false;
  private processingLock = false;

  // Data properties
  piecesData: any[] = [];
  truckDimension: number[] = [13200, 2200, 2900];

  // Enhanced loading statistics
  loadingStats: LoadingStats = {
    totalPackages: 0,
    packagesLoaded: 0,
    utilizationRate: 0,
    cogScore: 0,
    totalWeight: 0,
    efficiency: 0,
  };

  // UI state
  isLoading: boolean = false;
  hasResults: boolean = false;
  showVisualization: boolean = false;
  optimizationProgress: number = 0;

  // Results data
  reportFiles: any[] = [];
  processedPackages: PackageData[] = [];
  algorithmStats = {
    executionTime: 0,
    generations: 0,
    bestFitness: 0,
  };

  // Popup window reference
  private popupWindow: Window | null = null;
  private progressInterval: any = null;

  // Services
  private readonly autoSaveService = inject(AutoSaveService);
  private readonly localStorageService = inject(LocalStorageService);
  repositoryService = inject(RepositoryService);
  stepperService = inject(StepperStore);
  sanitizer = inject(DomSanitizer);
  toastService = inject(ToastService);
  plotlyService = inject(PlotlyService);
  cdr = inject(ChangeDetectorRef);

  private lastResultState: string = '';
  private resultAutoSaveTimeout: any;

  ngOnInit(): void {
    console.log('🎬 ResultStepComponent initialized');

    if (!this.checkPrerequisites()) {
      return;
    }

    this.restoreFromSession();

    // YENİ: Auto-save listener'ları setup et
    this.setupAutoSaveListeners();
  }

  private setupAutoSaveListeners(): void {
    // Result state changes'i takip et
    this.watchResultChanges();
  }

  private watchResultChanges(): void {
    setInterval(() => {
      // Loading state'de auto-save'i skip et
      if (this.isLoading || this.processingLock) {
        return;
      }

      const currentState = this.getCurrentResultState();

      if (currentState !== this.lastResultState && this.hasResults) {
        this.triggerAutoSave('user-action');
        this.lastResultState = currentState;
      }
    }, 3000); // 3 saniye interval (result için daha uzun)
  }

  private getCurrentResultState(): string {
    try {
      return JSON.stringify({
        hasResults: this.hasResults,
        showVisualization: this.showVisualization,
        piecesDataLength: this.piecesData?.length || 0,
        reportFilesLength: this.reportFiles?.length || 0,
        loadingStats: this.loadingStats,
        algorithmStats: this.algorithmStats,
      });
    } catch (error) {
      return '';
    }
  }

  private triggerAutoSave(
    changeType: 'user-action' | 'api-response' = 'user-action'
  ): void {
    // Clear existing timeout
    if (this.resultAutoSaveTimeout) {
      clearTimeout(this.resultAutoSaveTimeout);
    }

    // Debounce auto-save
    this.resultAutoSaveTimeout = setTimeout(
      () => {
        if (
          this.hasResults &&
          (this.piecesData?.length > 0 || this.reportFiles?.length > 0)
        ) {
          this.autoSaveService.triggerStep3AutoSave(
            {
              optimizationResult: this.piecesData,
              reportFiles: this.reportFiles,
              loadingStats: this.loadingStats,
              algorithmStats: this.algorithmStats,
              truckDimension: this.truckDimension,
              hasResults: this.hasResults,
              showVisualization: this.showVisualization,
            },
            changeType
          );
        }
      },
      changeType === 'api-response' ? 500 : 2000
    ); // Calculation için hızlı kaydet
  }

  private checkPrerequisites(): boolean {
    const step1Completed = this.localStorageService.isStepCompleted(1);
    const step2Completed = this.localStorageService.isStepCompleted(2);

    if (!step1Completed || !step2Completed) {
      let message = 'Önceki adımları tamamlayın: ';
      if (!step1Completed) message += 'Step 1 ';
      if (!step2Completed) message += 'Step 2 ';

      this.toastService.warning(message);
      return false;
    }

    return true;
  }

  private restoreFromSession(): void {
    try {
      const restoredData = this.localStorageService.restoreStep3Data();

      if (restoredData) {
        console.log("✅ Step 3 LocalStorage'dan veriler bulundu");

        this.hasResults = true;
        this.showVisualization = true;
        this.isLoading = false;

        if (restoredData.optimizationResult) {
          this.piecesData = restoredData.optimizationResult;
          this.safeProcessOptimizationResult({
            data: restoredData.optimizationResult,
          });
        }

        if (restoredData.reportFiles) {
          this.reportFiles = restoredData.reportFiles;
        }

        this.toastService.info('Optimizasyon sonuçları restore edildi');
      }
    } catch (error) {
      console.error('❌ Result step session restore hatası:', error);
    }
  }

  private saveResultsToSession(): void {
    try {
      console.log("💾 Step 3 sonuçları LocalStorage'a  kaydediliyor...");
      this.localStorageService.saveStep3Data(this.piecesData, this.reportFiles);
      console.log("✅ Step 3 sonuçları LocalStorage'a  kaydedildi");

      // Stepper store'u da güncelle
      this.stepperService.setStepStatus(3, STATUSES.completed, true);
    } catch (error) {
      console.error("❌ Step 3 sonuçları LocalStorage'a kaydedilemedi:", error);
    }
  }

  ngOnDestroy(): void {
    console.log('🗑️ ResultStepComponent destroying...');

    this.isDestroyed = true;
    this.processingLock = false;

    // Signal destruction to all observables
    this.destroy$.next();
    this.destroy$.complete();

    // Clear auto-save timeout
    if (this.resultAutoSaveTimeout) {
      clearTimeout(this.resultAutoSaveTimeout);
      this.resultAutoSaveTimeout = null;
    }

    // Clear progress interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    // Close popup if open
    if (this.popupWindow && !this.popupWindow.closed) {
      try {
        this.popupWindow.close();
      } catch (error) {
        console.warn('Error closing popup window:', error);
      }
      this.popupWindow = null;
    }
  }

  // ========================================
  // SAFE BUSINESS LOGIC (Sonsuz döngü koruması)
  // ========================================

  calculateBinpacking(): void {
    // Prevent multiple simultaneous requests
    if (this.processingLock || this.isDestroyed) {
      console.log('⚠️ Already processing or component destroyed');
      return;
    }

    console.log('🚀 Bin packing optimizasyonu başlatılıyor...');

    this.processingLock = true;

    // Reset state safely
    this.safeResetState();

    // Start progress simulation
    this.startProgressSimulation();

    this.repositoryService
      .calculatePacking()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((response) => {
          if (this.isDestroyed) {
            throw new Error('Component destroyed');
          }

          console.log('📦 Paketleme verisi alındı:', response);

          // Process the response data safely
          this.safeProcessOptimizationResult(response);

          // Update progress
          this.optimizationProgress = Math.min(80, this.optimizationProgress);
          this.safeUpdateUI();

          // YENİ: İlk hesaplama sonrası auto-save
          this.triggerAutoSave('api-response');

          // Create report after successful packing
          return this.repositoryService.createReport();
        }),
        catchError((error) => {
          console.error('❌ İşlem sırasında hata oluştu:', error);
          this.handleError(error);
          return EMPTY;
        }),
        finalize(() => {
          this.processingLock = false;
          this.stopProgressSimulation();
        })
      )
      .subscribe({
        next: (reportResponse) => {
          if (this.isDestroyed) return;

          console.log('📊 Rapor başarıyla oluşturuldu:', reportResponse);

          this.reportFiles = Array.isArray(reportResponse?.files)
            ? reportResponse.files
            : [];
          this.optimizationProgress = 100;

          // Finalize the process safely
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.safeFinalize();

              // YENİ: Final completion sonrası auto-save
              this.triggerAutoSave('api-response');
            }
          }, 500);
        },
        error: (error) => {
          if (!this.isDestroyed) {
            this.handleError(error);
          }
        },
      });
  }

  forceSaveStep3(): void {
    if (this.hasResults) {
      this.autoSaveService.forceSave(3, {
        optimizationResult: this.piecesData,
        reportFiles: this.reportFiles,
        loadingStats: this.loadingStats,
        algorithmStats: this.algorithmStats,
        truckDimension: this.truckDimension,
        hasResults: this.hasResults,
        showVisualization: this.showVisualization,
      });

      this.toastService.success('Result verileri zorla kaydedildi');
    } else {
      this.toastService.warning('Kaydetmek için önce optimizasyonu çalıştırın');
    }
  }

  private safeResetState(): void {
    if (this.isDestroyed) return;

    this.isLoading = true;
    this.hasResults = false;
    this.showVisualization = false;
    this.optimizationProgress = 0;
    this.piecesData = [];
    this.processedPackages = [];
    this.reportFiles = [];
    this.resetStats();

    this.safeUpdateUI();
  }

  private safeProcessOptimizationResult(response: any): void {
    if (this.isDestroyed) return;

    try {
      // Handle different response formats
      let packingData = null;

      if (response?.data) {
        if (typeof response.data === 'string') {
          try {
            packingData = JSON.parse(response.data);
          } catch (parseError) {
            console.warn(
              '⚠️ Failed to parse response data string:',
              parseError
            );
            packingData = null;
          }
        } else if (response.data.data) {
          packingData = response.data.data;
        } else {
          packingData = response.data;
        }
      }

      if (packingData && Array.isArray(packingData) && packingData.length > 0) {
        // **ÖNEMLİ: Yeni array oluştur, referansı değiştir**
        this.piecesData = [...packingData];
        this.safeProcessPackageData();
        this.calculateStats();

        console.log(`✅ ${this.piecesData.length} paket başarıyla işlendi`);
      } else {
        console.warn('⚠️ Geçersiz paketleme verisi formatı');
        this.piecesData = [];
        this.processedPackages = [];
      }

      // Extract algorithm stats if available
      if (response?.stats) {
        this.algorithmStats = {
          executionTime: response.stats.execution_time || 0,
          generations: response.stats.generations || 0,
          bestFitness: response.stats.best_fitness || 0,
        };
      }
    } catch (error) {
      console.error('❌ Veri işleme hatası:', error);
      this.piecesData = [];
      this.processedPackages = [];
    }
  }

  private safeProcessPackageData(): void {
    if (this.isDestroyed || !Array.isArray(this.piecesData)) return;

    try {
      this.processedPackages = this.piecesData.map(
        (piece: any, index: number) => ({
          id: piece[6] || index,
          x: piece[0] || 0,
          y: piece[1] || 0,
          z: piece[2] || 0,
          length: piece[3] || 0,
          width: piece[4] || 0,
          height: piece[5] || 0,
          weight: piece[7] || 0,
          color: this.getPackageColor(index),
          dimensions: `${piece[3] || 0}×${piece[4] || 0}×${piece[5] || 0}mm`,
        })
      );

      console.log(`📊 ${this.processedPackages.length} packages processed`);
    } catch (error) {
      console.error('❌ Package processing error:', error);
      this.processedPackages = [];
    }
  }

  private calculateStats(): void {
    if (this.isDestroyed || this.processedPackages.length === 0) {
      this.resetStats();
      return;
    }

    try {
      const totalVolume =
        this.truckDimension[0] *
        this.truckDimension[1] *
        this.truckDimension[2];
      const usedVolume = this.processedPackages.reduce(
        (sum, pkg) => sum + pkg.length * pkg.width * pkg.height,
        0
      );

      const totalWeight = this.processedPackages.reduce(
        (sum, pkg) => sum + pkg.weight,
        0
      );
      const cogScore = this.calculateCOGScore();
      const utilizationRate = Math.round((usedVolume / totalVolume) * 100);

      this.loadingStats = {
        totalPackages: this.processedPackages.length,
        packagesLoaded: this.processedPackages.length,
        utilizationRate: utilizationRate,
        cogScore: cogScore,
        totalWeight: Math.round(totalWeight),
        efficiency: Math.round((utilizationRate + cogScore) / 2),
      };
    } catch (error) {
      console.error('❌ Stats calculation error:', error);
      this.resetStats();
    }
  }

  private calculateCOGScore(): number {
    if (this.isDestroyed || this.processedPackages.length === 0) return 0;

    try {
      let totalWeight = 0;
      let weightedX = 0;
      let weightedY = 0;
      let weightedZ = 0;

      this.processedPackages.forEach((pkg) => {
        const centerX = pkg.x + pkg.length / 2;
        const centerY = pkg.y + pkg.width / 2;
        const centerZ = pkg.z + pkg.height / 2;

        totalWeight += pkg.weight;
        weightedX += centerX * pkg.weight;
        weightedY += centerY * pkg.weight;
        weightedZ += centerZ * pkg.weight;
      });

      if (totalWeight === 0) return 0;

      const cogX = weightedX / totalWeight;
      const cogY = weightedY / totalWeight;
      const cogZ = weightedZ / totalWeight;

      // Ideal COG (center and lower part of truck)
      const idealX = this.truckDimension[0] / 2;
      const idealY = this.truckDimension[1] / 2;
      const idealZ = this.truckDimension[2] * 0.4; // 40% height

      const distance = Math.sqrt(
        Math.pow(cogX - idealX, 2) +
          Math.pow(cogY - idealY, 2) +
          Math.pow(cogZ - idealZ, 2)
      );

      const maxDistance = Math.sqrt(
        Math.pow(this.truckDimension[0] / 2, 2) +
          Math.pow(this.truckDimension[1] / 2, 2) +
          Math.pow(this.truckDimension[2] * 0.6, 2)
      );

      return Math.round(Math.max(0, 100 - (distance / maxDistance) * 100));
    } catch (error) {
      console.error('❌ COG calculation error:', error);
      return 0;
    }
  }

  private safeFinalize(): void {
    if (this.isDestroyed) return;

    this.isLoading = false;
    this.hasResults = true;
    this.showVisualization = true;

    this.safeUpdateUI();
    this.toastService.success('Paketleme ve rapor başarıyla oluşturuldu.');

    // YENİ: Finalize sonrası auto-save
    this.saveResultsToSession();
  }

  private handleError(error: any): void {
    if (this.isDestroyed) return;

    this.isLoading = false;
    this.hasResults = false;
    this.optimizationProgress = 0;

    this.safeUpdateUI();

    const errorMessage = this.getErrorMessage(error);
    this.toastService.error(errorMessage);
  }

  private safeUpdateUI(): void {
    if (this.isDestroyed) return;

    try {
      this.cdr.detectChanges();
    } catch (error) {
      console.warn('UI update error:', error);
    }
  }

  // ========================================
  // SAFE PROGRESS SIMULATION
  // ========================================

  private startProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      if (this.isDestroyed || !this.isLoading) {
        this.stopProgressSimulation();
        return;
      }

      if (this.optimizationProgress < 70) {
        this.optimizationProgress += Math.random() * 8; // Slower progress
        this.safeUpdateUI();
      }
    }, 500); // Less frequent updates
  }

  private stopProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  // ========================================
  // UI Helper Methods
  // ========================================

  getUtilizationRate(): number {
    return this.loadingStats.utilizationRate;
  }

  getCogScore(): number {
    return this.loadingStats.cogScore;
  }

  getCogScoreClass(): string {
    const score = this.loadingStats.cogScore;
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'poor';
  }

  getEfficiencyClass(): string {
    const efficiency = this.loadingStats.efficiency;
    if (efficiency >= 85) return 'excellent';
    if (efficiency >= 70) return 'good';
    if (efficiency >= 50) return 'warning';
    return 'poor';
  }

  getFileIcon(fileType: string | null): string {
    if (!fileType) return 'insert_drive_file';

    const type = fileType.toLowerCase();

    if (type.includes('pdf')) {
      return 'picture_as_pdf';
    } else if (
      type.includes('image') ||
      type.includes('jpg') ||
      type.includes('jpeg') ||
      type.includes('png')
    ) {
      return 'image';
    } else if (
      type.includes('excel') ||
      type.includes('sheet') ||
      type.includes('xlsx') ||
      type.includes('xls')
    ) {
      return 'table_chart';
    } else if (type.includes('word') || type.includes('doc')) {
      return 'description';
    } else if (
      type.includes('zip') ||
      type.includes('rar') ||
      type.includes('archive')
    ) {
      return 'folder_zip';
    } else if (type.includes('text') || type.includes('txt')) {
      return 'article';
    } else if (type.includes('video')) {
      return 'videocam';
    } else if (type.includes('audio')) {
      return 'audiotrack';
    }

    return 'insert_drive_file';
  }

  // ========================================
  // SAFE Visualization Methods
  // ========================================

  openInNewTab(): void {
    if (
      !this.hasResults ||
      !this.piecesData ||
      this.piecesData.length === 0 ||
      this.isDestroyed
    ) {
      this.toastService.warning('Önce optimizasyonu çalıştırın.');
      return;
    }

    try {
      const dataStr = JSON.stringify(this.piecesData);
      const dimensionsStr = JSON.stringify(this.truckDimension);

      // Create a new window with Three.js visualization (updated HTML)
      const newWindow = window.open(
        '',
        '_blank',
        'width=1200,height=800,scrollbars=yes,resizable=yes'
      );

      if (newWindow) {
        newWindow.document.write(this.createThreeJSPopupHTML(dataStr, dimensionsStr)); // ← Method adı değişti
        newWindow.document.close();
        this.popupWindow = newWindow;

        this.triggerAutoSave('user-action');
      }
    } catch (error) {
      console.error('❌ Yeni sekme açılırken hata oluştu:', error);
      this.toastService.error('3D görünüm açılamadı.');
    }
  }

  private createThreeJSPopupHTML(dataStr: string, dimensionsStr: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>3D Tır Yükleme Görselleştirmesi - Three.js</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f8f9fa;
            overflow-x: hidden;
          }
          #threejs-container {
            width: 100%;
            height: 700px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 8px;
            position: relative;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            color: #006A6A;
          }
          .stats {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }
          .stat-item {
            text-align: center;
            padding: 12px 16px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            min-width: 120px;
          }
          .stat-value {
            font-weight: 600;
            color: #006A6A;
            font-size: 18px;
            display: block;
            margin-bottom: 4px;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
          }
          .controls {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(255, 255, 255, 0.9);
            padding: 10px;
            border-radius: 8px;
            z-index: 100;
          }
          .control-btn {
            display: block;
            width: 100%;
            margin-bottom: 5px;
            padding: 8px 12px;
            border: 1px solid #006A6A;
            background: white;
            color: #006A6A;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          }
          .control-btn:hover {
            background: #006A6A;
            color: white;
          }
          .loading-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #006A6A;
            font-size: 16px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚛 Tır Yükleme Optimizasyonu - Three.js 3D Görünüm</h1>
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">${this.loadingStats.packagesLoaded}</span>
            <span class="stat-label">Yüklenen Paket</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${this.loadingStats.utilizationRate}%</span>
            <span class="stat-label">Doluluk Oranı</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${this.loadingStats.cogScore}/100</span>
            <span class="stat-label">COG Skoru</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${this.loadingStats.totalWeight} kg</span>
            <span class="stat-label">Toplam Ağırlık</span>
          </div>
        </div>

        <div id="threejs-container">
          <div class="loading-indicator" id="loading">Three.js yükleniyor...</div>

          <div class="controls" id="controls" style="display: none;">
            <button class="control-btn" onclick="resetView()">🎯 Görünümü Sıfırla</button>
            <button class="control-btn" onclick="toggleWireframe()">🔳 Wireframe</button>
            <button class="control-btn" onclick="setView('front')">⬜ Ön Görünüm</button>
            <button class="control-btn" onclick="setView('side')">▫️ Yan Görünüm</button>
            <button class="control-btn" onclick="setView('top')">⬛ Üst Görünüm</button>
            <button class="control-btn" onclick="setView('iso')">🔲 3D Görünüm</button>
          </div>
        </div>

        <script>
          // Global variables
          let scene, camera, renderer, truckGroup, packagesGroup;
          let isWireframe = false;
          let animationId;

          // Initialize Three.js
          function initThreeJS() {
            try {
              const container = document.getElementById('threejs-container');
              const loading = document.getElementById('loading');
              const controls = document.getElementById('controls');

              // Parse data
              const piecesData = JSON.parse('${dataStr}');
              const truckDimension = JSON.parse('${dimensionsStr}');

              // Scene setup
              scene = new THREE.Scene();
              scene.background = new THREE.Color(0xf8fafc);

              // Camera setup
              camera = new THREE.PerspectiveCamera(
                75,
                container.clientWidth / container.clientHeight,
                0.1,
                50000
              );

              // Renderer setup
              renderer = new THREE.WebGLRenderer({ antialias: true });
              renderer.setSize(container.clientWidth, container.clientHeight);
              renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              renderer.shadowMap.enabled = true;
              renderer.shadowMap.type = THREE.PCFSoftShadowMap;

              container.appendChild(renderer.domElement);

              // Lighting
              const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
              scene.add(ambientLight);

              const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
              directionalLight.position.set(100, 100, 50);
              directionalLight.castShadow = true;
              scene.add(directionalLight);

              // Groups
              truckGroup = new THREE.Group();
              packagesGroup = new THREE.Group();
              scene.add(truckGroup);
              scene.add(packagesGroup);

              // Create truck wireframe
              createTruck(truckDimension);

              // Create packages
              createPackages(piecesData);

              // Set initial camera position
              setView('iso');

              // Start render loop
              animate();

              // Hide loading, show controls
              loading.style.display = 'none';
              controls.style.display = 'block';

              // Setup mouse controls
              setupControls();

              console.log('✅ Three.js popup initialized successfully');

            } catch (error) {
              console.error('❌ Three.js popup error:', error);
              document.getElementById('loading').innerHTML =
                '❌ Görselleştirme hatası: ' + error.message;
            }
          }

          function createTruck(dimensions) {
            const geometry = new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]);
            const edges = new THREE.EdgesGeometry(geometry);
            const material = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 2 });

            const wireframe = new THREE.LineSegments(edges, material);
            wireframe.position.set(dimensions[0]/2, dimensions[1]/2, dimensions[2]/2);

            truckGroup.add(wireframe);
          }

          function createPackages(piecesData) {
            const colors = ['#006A6A', '#D6BB86', '#004A4A', '#C0A670', '#8b5cf6'];

            piecesData.forEach((piece, index) => {
              const [x, y, z, length, width, height, id, weight] = piece;

              const geometry = new THREE.BoxGeometry(length, width, height);
              const material = new THREE.MeshLambertMaterial({
                color: colors[index % colors.length],
                transparent: false,
                opacity: 1.0
              });

              const mesh = new THREE.Mesh(geometry, material);
              mesh.position.set(x + length/2, y + width/2, z + height/2);
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              packagesGroup.add(mesh);
            });
          }

          function animate() {
            if (!renderer) return;

            animationId = requestAnimationFrame(animate);
            renderer.render(scene, camera);
          }

          function setupControls() {
            const canvas = renderer.domElement;
            let isMouseDown = false;
            let mouseX = 0, mouseY = 0;

            canvas.addEventListener('mousedown', (event) => {
              isMouseDown = true;
              mouseX = event.clientX;
              mouseY = event.clientY;
            });

            canvas.addEventListener('mousemove', (event) => {
              if (!isMouseDown) return;

              const deltaX = event.clientX - mouseX;
              const deltaY = event.clientY - mouseY;

              rotateView(deltaX * 0.01, deltaY * 0.01);

              mouseX = event.clientX;
              mouseY = event.clientY;
            });

            canvas.addEventListener('mouseup', () => {
              isMouseDown = false;
            });

            canvas.addEventListener('wheel', (event) => {
              event.preventDefault();
              zoomCamera(event.deltaY * 0.001);
            });
          }

          function rotateView(deltaX, deltaY) {
            const spherical = new THREE.Spherical();
            spherical.setFromVector3(camera.position);
            spherical.theta -= deltaX;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY));

            camera.position.setFromSpherical(spherical);
            camera.lookAt(0, 0, 0);
          }

          function zoomCamera(delta) {
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            direction.multiplyScalar(delta * 1000);
            camera.position.add(direction);
          }

          function setView(viewType) {
            const truckDim = JSON.parse('${dimensionsStr}');
            const maxDim = Math.max(...truckDim);
            const distance = maxDim * 1.5;

            switch (viewType) {
              case 'front':
                camera.position.set(distance, 0, truckDim[2] / 2);
                break;
              case 'side':
                camera.position.set(0, distance, truckDim[2] / 2);
                break;
              case 'top':
                camera.position.set(truckDim[0] / 2, truckDim[1] / 2, distance);
                break;
              case 'iso':
              default:
                camera.position.set(distance * 0.8, distance * 0.8, distance * 0.8);
                break;
            }

            camera.lookAt(truckDim[0] / 2, truckDim[1] / 2, truckDim[2] / 2);
          }

          function resetView() {
            setView('iso');
          }

          function toggleWireframe() {
            isWireframe = !isWireframe;

            packagesGroup.children.forEach(mesh => {
              mesh.material.wireframe = isWireframe;
            });
          }

          // Window resize handler
          window.addEventListener('resize', () => {
            if (!camera || !renderer) return;

            const container = document.getElementById('threejs-container');
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
          });

          // Cleanup on unload
          window.addEventListener('beforeunload', () => {
            if (animationId) {
              cancelAnimationFrame(animationId);
            }
            if (renderer) {
              renderer.dispose();
            }
          });

          // Initialize when page loads
          document.addEventListener('DOMContentLoaded', initThreeJS);

          // Fallback initialization
          setTimeout(initThreeJS, 100);
        </script>
      </body>
      </html>
    `;
  }

  // ========================================
  // Event Handlers
  // ========================================

  onPackageSelected(packageData: any): void {
    if (this.isDestroyed) return;

    console.log('📦 Paket seçildi:', packageData);

    // Package selection info'yu state'e ekleyebiliriz
    // Bu durumda auto-save trigger edebiliriz
    this.triggerAutoSave('user-action');
  }

  /**
   * View change'de auto-save (kullanıcı view mode değiştirirse)
   */
  onViewChanged(viewType: string): void {
    if (this.isDestroyed) return;

    console.log('👁️ Görünüm değiştirildi:', viewType);

    // View preference'ını kaydedebiliriz
    this.triggerAutoSave('user-action');
  }

  // ========================================
  // Utility Methods
  // ========================================

  private resetStats(): void {
    this.loadingStats = {
      totalPackages: 0,
      packagesLoaded: 0,
      utilizationRate: 0,
      cogScore: 0,
      totalWeight: 0,
      efficiency: 0,
    };
  }

  private getPackageColor(index: number): string {
    const colors = [
      '#006A6A',
      '#D6BB86',
      '#004A4A',
      '#C0A670',
      '#8b5cf6',
      '#06b6d4',
      '#84cc16',
      '#f97316',
      '#ec4899',
      '#6366f1',
    ];
    return colors[index % colors.length];
  }

  private getErrorMessage(error: any): string {
    if (error?.status === 0) {
      return 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.';
    } else if (error?.status >= 400 && error?.status < 500) {
      return 'İstek hatası. Lütfen parametreleri kontrol edin.';
    } else if (error?.status >= 500) {
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    } else {
      return error?.message || 'Beklenmeyen bir hata oluştu.';
    }
  }

  // ========================================
  // Additional Helper Methods (for template)
  // ========================================

  saveResults(): void {
    if (!this.hasResults || this.isDestroyed) {
      this.toastService.warning(
        'Kaydetmek için önce optimizasyonu çalıştırın.'
      );
      return;
    }

    try {
      const results = {
        timestamp: new Date().toISOString(),
        truckDimensions: this.truckDimension,
        packagesData: this.piecesData,
        statistics: this.loadingStats,
        algorithmStats: this.algorithmStats,
        reportFiles: this.reportFiles,
      };

      const dataStr = JSON.stringify(results, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `truck-loading-results-${
        new Date().toISOString().split('T')[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.toastService.success('Sonuçlar başarıyla kaydedildi.');

      // YENİ: Manual save sonrası auto-save trigger
      this.triggerAutoSave('user-action');
    } catch (error) {
      console.error('❌ Sonuçları kaydetme hatası:', error);
      this.toastService.error('Sonuçlar kaydedilemedi.');
    }
  }

  trackByFileId(index: number, file: any): any {
    return file?.id || file?.name || index;
  }

  formatFileSize(bytes: number): string {
    if (!bytes || isNaN(bytes)) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Sevkiyatı tamamla ve yeni workflow'a hazırla
   */
completeShipment(): void {
    if (!this.hasResults) {
      this.toastService.warning('Önce optimizasyonu tamamlayın');
      return;
    }

    const confirmed = confirm(
      'Sevkiyatı tamamlamak istediğinizden emin misiniz?\n\n' +
      '✅ Tüm veriler kaydedilecek\n' +
      '🗑️ Geçici veriler temizlenecek\n' +
      '🆕 Yeni sipariş için hazırlanacak'
    );

    if (!confirmed) {
      return;
    }

    console.log('🏁 Sevkiyat tamamlanıyor...');

    try {
      // 1. Final save to session (backup)
      this.saveResultsToSession();

      // 2. Auto-save history'yi temizle
      this.autoSaveService.clearHistory();

      // 3. Session'ı temizle
      this.localStorageService.clearStorage();

      // 4. Stepper'ı reset et
      this.stepperService.resetStepper();

      // 5. Component state'ini temizle
      this.resetComponentState();

      // 6. Success notification
      this.toastService.success(
        'Sevkiyat başarıyla tamamlandı! Yeni sipariş işlemeye başlayabilirsiniz.',
        'Tamamlandı!'
      );

      // 7. YENİ: Parent'a completion signal gönder
      setTimeout(() => {
        this.shipmentCompleted.emit();
        console.log('📤 Shipment completion event emitted');
      }, 1500); // 1.5 saniye sonra navigate et (toast görünsün)

      console.log('✅ Sevkiyat tamamlandı ve sistem yeni işlem için hazırlandı');

    } catch (error) {
      console.error('❌ Sevkiyat tamamlama hatası:', error);
      this.toastService.error('Sevkiyat tamamlanırken hata oluştu');
    }
  }

  /**
   * Component state'ini temizle
   */
  private resetComponentState(): void {
    this.hasResults = false;
    this.showVisualization = false;
    this.isLoading = false;
    this.piecesData = [];
    this.reportFiles = [];
    this.optimizationProgress = 0;
    this.processedPackages = [];

    // Reset loading stats
    this.loadingStats = {
      totalPackages: 0,
      packagesLoaded: 0,
      utilizationRate: 0,
      cogScore: 0,
      totalWeight: 0,
      efficiency: 0,
    };

    // Reset algorithm stats
    this.algorithmStats = {
      executionTime: 0,
      generations: 0,
      bestFitness: 0,
    };

    console.log('🔄 Component state reset edildi');
  }
}

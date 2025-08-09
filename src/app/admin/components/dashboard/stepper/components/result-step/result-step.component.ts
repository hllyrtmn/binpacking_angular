// result-step.component.ts - ENHANCED FINAL VERSION
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
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../../../../services/toast.service';
import { switchMap, takeUntil, catchError, finalize } from 'rxjs/operators';
import { Subject, EMPTY, of } from 'rxjs';
import { AutoSaveService } from '../../services/auto-save.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { ThreeJSTruckVisualizationComponent } from '../../../../../../components/threejs-truck-visualization/threejs-truck-visualization.component';
import { OrderResultService } from '../../../../services/order-result.service';

// Enhanced Package interface for type safety
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

// Enhanced Loading statistics interface
interface LoadingStats {
  totalPackages: number;
  packagesLoaded: number;
  utilizationRate: number;
  cogScore: number;
  totalWeight: number;
  efficiency: number;
  deletedCount?: number;
  movedCount?: number;
  rotatedCount?: number;
}

// Enhanced Algorithm stats interface
interface AlgorithmStats {
  executionTime: number;
  generations: number;
  bestFitness: number;
  iterationsCount?: number;
  convergenceRate?: number;
}

// NEW: Data change tracking interface
interface DataChangeEvent {
  timestamp: Date;
  type: 'drag' | 'rotate' | 'delete' | 'restore' | 'initial'| 'unknown';
  packageId?: number;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
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
  @ViewChild('plotlyComponent') plotlyComponent!: any;
  @ViewChild('threeJSComponent') threeJSComponent!: ThreeJSTruckVisualizationComponent;
  @Output() shipmentCompleted = new EventEmitter<void>();

  // **ENHANCED: Component lifecycle ve cleanup için**
  private destroy$ = new Subject<void>();
  private isDestroyed = false;
  public processingLock = false;

  // Enhanced Data properties
  piecesData: any[] = [];
  originalPiecesData: any[] = []; // NEW: Track original data
  truckDimension: number[] = [13200, 2200, 2900];
  orderResultId: string = '';
  // Enhanced loading statistics
  loadingStats: LoadingStats = {
    totalPackages: 0,
    packagesLoaded: 0,
    utilizationRate: 0,
    cogScore: 0,
    totalWeight: 0,
    efficiency: 0,
    deletedCount: 0,
    movedCount: 0,
    rotatedCount: 0
  };

  // Enhanced UI state
  isLoading: boolean = false;
  hasResults: boolean = false;
  showVisualization: boolean = false;
  optimizationProgress: number = 0;
  hasThreeJSError: boolean = false;

  // NEW: Data change tracking
  hasUnsavedChanges: boolean = false;
  dataChangeHistory: DataChangeEvent[] = [];
  lastDataChangeTime: Date = new Date();
  totalPackagesProcessed: number = 0;

  // Enhanced Results data
  reportFiles: any[] = [];
  processedPackages: PackageData[] = [];
  algorithmStats: AlgorithmStats = {
    executionTime: 0,
    generations: 0,
    bestFitness: 0,
    iterationsCount: 0,
    convergenceRate: 0
  };

  // Enhanced popup and progress management
  private popupWindow: Window | null = null;
  private progressInterval: any = null;

  // Enhanced Services
  private readonly autoSaveService = inject(AutoSaveService);
  private readonly localStorageService = inject(LocalStorageService);
  repositoryService = inject(RepositoryService);
  stepperService = inject(StepperStore);
  sanitizer = inject(DomSanitizer);
  toastService = inject(ToastService);
  cdr = inject(ChangeDetectorRef);
  orderResultService = inject(OrderResultService)

  // Enhanced Auto-save management
  private lastResultState: string = '';
  private resultAutoSaveTimeout: any;
  public currentViewType: string = 'isometric';

  // Enhanced performance tracking
  public performanceMetrics = {
    startTime: 0,
    endTime: 0,
    memoryUsage: 0,
    renderTime: 0,
    dataChangeCount: 0,
    averageResponseTime: 0
  };

  ngOnInit(): void {

    // Enhanced prerequisites check
    if (!this.checkEnhancedPrerequisites()) {
      return;
    }

    // Enhanced session restoration
    this.restoreFromEnhancedSession();

    // Enhanced auto-save setup
    this.setupEnhancedAutoSaveListeners();

    // Performance tracking
    this.performanceMetrics.startTime = performance.now();
  }

  private setupEnhancedAutoSaveListeners(): void {
    // Enhanced result state changes tracking
    this.watchEnhancedResultChanges();

    // Window beforeunload listener for emergency save
    window.addEventListener('beforeunload', this.handleEmergencyAutoSave.bind(this));
  }

  private watchEnhancedResultChanges(): void {
    setInterval(() => {
      // Loading state'de auto-save'i skip et
      if (this.isLoading || this.processingLock || this.isDestroyed) {
        return;
      }

      const currentState = this.getCurrentEnhancedResultState();

      if (currentState !== this.lastResultState && this.hasResults) {
        this.triggerEnhancedAutoSave('user-action');
        this.lastResultState = currentState;
      }
    }, 3000); // 3 saniye interval
  }

  private getCurrentEnhancedResultState(): string {
    try {
      return JSON.stringify({
        hasResults: this.hasResults,
        showVisualization: this.showVisualization,
        piecesDataLength: this.piecesData?.length || 0,
        reportFilesLength: this.reportFiles?.length || 0,
        loadingStats: this.loadingStats,
        algorithmStats: this.algorithmStats,
        currentViewType: this.currentViewType,
        hasThreeJSError: this.hasThreeJSError,
        hasUnsavedChanges: this.hasUnsavedChanges,
        dataChangeHistoryLength: this.dataChangeHistory.length,
        timestamp: Date.now()
      });
    } catch (error) {

      return '';
    }
  }

  private triggerEnhancedAutoSave(
    changeType: 'user-action' | 'api-response' | 'emergency' | 'data-change' = 'user-action'
  ): void {
    // Clear existing timeout
    if (this.resultAutoSaveTimeout) {
      clearTimeout(this.resultAutoSaveTimeout);
    }

    // Enhanced debounce auto-save
    const delay = changeType === 'api-response' ? 500 :
                  changeType === 'emergency' ? 0 :
                  changeType === 'data-change' ? 1000 : 2000;

    this.resultAutoSaveTimeout = setTimeout(
      () => {
        if (
          this.hasResults &&
          (this.piecesData?.length > 0 || this.reportFiles?.length > 0)
        ) {
          const enhancedSaveData = {
            optimizationResult: this.piecesData,
            originalOptimizationResult: this.originalPiecesData, // NEW
            reportFiles: this.reportFiles,
            loadingStats: this.loadingStats,
            algorithmStats: this.algorithmStats,
            truckDimension: this.truckDimension,
            hasResults: this.hasResults,
            showVisualization: this.showVisualization,
            currentViewType: this.currentViewType,
            hasThreeJSError: this.hasThreeJSError,
            hasUnsavedChanges: this.hasUnsavedChanges,
            dataChangeHistory: this.dataChangeHistory,
            totalPackagesProcessed: this.totalPackagesProcessed,
            performanceMetrics: this.performanceMetrics,
            processedPackages: this.processedPackages,
            timestamp: new Date().toISOString(),
            changeType: changeType
          };

          // this.autoSaveService.triggerStep3AutoSave(enhancedSaveData, changeType);
        }
      },
      delay
    );
  }

  private handleEmergencyAutoSave(): void {
    if (this.hasResults && this.hasUnsavedChanges) {
      this.triggerEnhancedAutoSave('emergency');

    }
  }

  private checkEnhancedPrerequisites(): boolean {
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

  private restoreFromEnhancedSession(): void {
    try {
      const restoredData = this.localStorageService.restoreStep3Data();

      if (restoredData) {

        this.hasResults = true;
        this.showVisualization = true;
        this.isLoading = false;
        this.hasThreeJSError = false;

        if (restoredData.optimizationResult) {
          this.piecesData = restoredData.optimizationResult;
          this.safeProcessEnhancedOptimizationResult({
            data: restoredData.optimizationResult,
          });
        }

        // NEW: Restore original data if available
        // if (restoredData.originalOptimizationResult) {
        //   this.originalPiecesData = restoredData.originalOptimizationResult;
        // } else {
        //   // Fallback: use current data as original
        //   this.originalPiecesData = JSON.parse(JSON.stringify(this.piecesData));
        // }

        if (restoredData.reportFiles) {
          this.reportFiles = restoredData.reportFiles;
        }

        // Enhanced restoration with additional properties
        if (restoredData.loadingStats) {
          this.loadingStats = { ...this.loadingStats, ...restoredData.loadingStats };
        }

        if (restoredData.algorithmStats) {
          this.algorithmStats = { ...this.algorithmStats, ...restoredData.algorithmStats };
        }

        if (restoredData.currentViewType) {
          this.currentViewType = restoredData.currentViewType;
        }

        // // NEW: Restore change tracking data
        // if (restoredData.dataChangeHistory) {
        //   this.dataChangeHistory = restoredData.dataChangeHistory;
        // }

        // if (restoredData.hasUnsavedChanges) {
        //   this.hasUnsavedChanges = restoredData.hasUnsavedChanges;
        // }

        // if (restoredData.totalPackagesProcessed) {
        //   this.totalPackagesProcessed = restoredData.totalPackagesProcessed;
        // }

        this.toastService.info('Optimizasyon sonuçları restore edildi');
      }
    } catch (error) {
      this.toastService.warning('Önceki sonuçlar yüklenirken hata oluştu');
    }
  }

  private saveEnhancedResultsToSession(): void {
    try {
      // Enhanced save with additional metadata
      const enhancedSaveData = {
        optimizationResult: this.piecesData,
        originalOptimizationResult: this.originalPiecesData, // NEW
        reportFiles: this.reportFiles,
        loadingStats: this.loadingStats,
        algorithmStats: this.algorithmStats,
        truckDimension: this.truckDimension,
        hasResults: this.hasResults,
        showVisualization: this.showVisualization,
        currentViewType: this.currentViewType,
        hasThreeJSError: this.hasThreeJSError,
        hasUnsavedChanges: this.hasUnsavedChanges,
        dataChangeHistory: this.dataChangeHistory,
        totalPackagesProcessed: this.totalPackagesProcessed,
        performanceMetrics: this.performanceMetrics,
        timestamp: new Date().toISOString(),
        version: '3.0' // Updated version
      };

      this.localStorageService.saveStep3Data(this.piecesData, this.reportFiles, enhancedSaveData);

      // Mark changes as saved
      this.hasUnsavedChanges = false;

      // Enhanced stepper store update
      this.stepperService.setStepStatus(3, STATUSES.completed, true);
    } catch (error) {
      this.toastService.error('Sonuçlar kaydedilemedi');
    }
  }

  ngOnDestroy(): void {

    this.isDestroyed = true;
    this.processingLock = false;

    // Enhanced cleanup
    this.performEnhancedCleanup();
  }

  private performEnhancedCleanup(): void {
    // Signal destruction to all observables
    this.destroy$.next();
    this.destroy$.complete();

    // Clear enhanced auto-save timeout
    if (this.resultAutoSaveTimeout) {
      clearTimeout(this.resultAutoSaveTimeout);
      this.resultAutoSaveTimeout = null;
    }

    // Clear enhanced progress interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    // Enhanced popup cleanup
    if (this.popupWindow && !this.popupWindow.closed) {
      try {
        this.popupWindow.close();
      } catch (error) {
      }
      this.popupWindow = null;
    }

    // Remove enhanced event listeners
    window.removeEventListener('beforeunload', this.handleEmergencyAutoSave.bind(this));

    // Performance metrics
    this.performanceMetrics.endTime = performance.now();
    const totalTime = this.performanceMetrics.endTime - this.performanceMetrics.startTime;


  }

  // ========================================
  // ENHANCED BUSINESS LOGIC
  // ========================================

  calculateBinpacking(): void {
    // Enhanced processing lock with timeout
    if (this.processingLock || this.isDestroyed) {

      return;
    }



    this.processingLock = true;

    // Enhanced state reset
    this.safeResetEnhancedState();

    // Enhanced progress simulation
    this.startEnhancedProgressSimulation();

    this.repositoryService
      .calculatePacking()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((response) => {
          if (this.isDestroyed) {
            throw new Error('Component destroyed during processing');
          }
          this.orderResultId = response.data.order_result_id


          // Enhanced processing
          this.safeProcessEnhancedOptimizationResult(response);

          // NEW: Store original data for comparison
          this.originalPiecesData = JSON.parse(JSON.stringify(this.piecesData));

          // Enhanced progress update
          this.optimizationProgress = Math.min(80, this.optimizationProgress);
          this.safeUpdateEnhancedUI();

          // Enhanced auto-save after calculation
          this.triggerEnhancedAutoSave('api-response');

          // NEW: Track initial data event
          this.trackDataChange('initial', undefined, {
            packageCount: this.piecesData.length,
            timestamp: new Date().toISOString()
          });

          // Enhanced report creation
          return this.repositoryService.createReport();
        }),
        catchError((error) => {

          this.handleEnhancedError(error);
          return EMPTY;
        }),
        finalize(() => {
          this.processingLock = false;
          this.stopEnhancedProgressSimulation();
        })
      )
      .subscribe({
        next: (reportResponse) => {
          if (this.isDestroyed) return;



          this.reportFiles = Array.isArray(reportResponse?.files)
            ? reportResponse.files
            : [];
          this.optimizationProgress = 100;

          // Enhanced finalization
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.safeEnhancedFinalize();
              this.triggerEnhancedAutoSave('api-response');
            }
          }, 500);
        },
        error: (error) => {
          if (!this.isDestroyed) {
            this.handleEnhancedError(error);
          }
        },
      });
  }

  // ========================================
  // NEW: ENHANCED DATA CHANGE HANDLING
  // ========================================

  /**
   * NEW: ThreeJS component'ten gelen veri değişikliklerini handle et
   */
  onDataChanged(updatedData: any[]): void {
    if (this.isDestroyed || !updatedData) {

      return;
    }

    try {
      // Enhanced data validation
      const validatedData = this.validateUpdatedData(updatedData);

      if (!validatedData || validatedData.length === 0) {

        return;
      }

      // Track changes before updating
      const changeEvent = this.analyzeDataChanges(this.piecesData, validatedData);

      // Update data
      this.piecesData = validatedData;

      // Mark as having unsaved changes
      this.hasUnsavedChanges = true;
      this.lastDataChangeTime = new Date();

      // Update performance metrics
      this.performanceMetrics.dataChangeCount++;
      this.performanceMetrics.averageResponseTime =
        (this.performanceMetrics.averageResponseTime + (Date.now() - this.performanceMetrics.startTime)) / 2;

      // Reprocess packages with updated data
      this.safeProcessEnhancedOptimizationResult({
        data: validatedData
      });

      // Recalculate statistics
      this.calculateEnhancedStats();

      // Track the change
      this.trackDataChange(changeEvent.type, undefined, changeEvent.metadata);

      // Enhanced auto-save trigger for data changes
      this.triggerEnhancedAutoSave('data-change');

      // Enhanced UI update
      this.safeUpdateEnhancedUI();

    } catch (error) {

      this.toastService.error('Veri değişikliği işlenirken hata oluştu');
    }
  }

  /**
   * NEW: Validate updated data from ThreeJS component
   */
  private validateUpdatedData(updatedData: any[]): any[] | null {
    if (!Array.isArray(updatedData)) {

      return null;
    }

    try {
      return updatedData.filter((piece, index) => {
        // Enhanced validation for each piece
        if (!Array.isArray(piece) || piece.length < 6) {

          return false;
        }

        // Validate numeric values
        const [x, y, z, length, width, height] = piece;
        if ([x, y, z, length, width, height].some(val =>
          typeof val !== 'number' || isNaN(val) || val < 0)) {

          return false;
        }

        return true;
      });

    } catch (error) {

      return null;
    }
  }

  /**
   * NEW: Analyze what type of change occurred
   */
  private analyzeDataChanges(oldData: any[], newData: any[]): {
    type: 'drag' | 'rotate' | 'delete' | 'restore' | 'unknown',
    metadata: any
  } {
    const oldCount = oldData?.length || 0;
    const newCount = newData?.length || 0;

    if (newCount < oldCount) {
      return {
        type: 'delete',
        metadata: {
          deletedCount: oldCount - newCount,
          remainingPackages: newCount,
          timestamp: new Date().toISOString()
        }
      };
    } else if (newCount > oldCount) {
      return {
        type: 'restore',
        metadata: {
          restoredCount: newCount - oldCount,
          totalPackages: newCount,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      // Same count - could be drag or rotate
      const hasPositionChanges = this.detectPositionChanges(oldData, newData);
      const hasDimensionChanges = this.detectDimensionChanges(oldData, newData);

      if (hasDimensionChanges) {
        return {
          type: 'rotate',
          metadata: {
            rotatedPackages: hasDimensionChanges,
            timestamp: new Date().toISOString()
          }
        };
      } else if (hasPositionChanges) {
        return {
          type: 'drag',
          metadata: {
            movedPackages: hasPositionChanges,
            timestamp: new Date().toISOString()
          }
        };
      }
    }

    return {
      type: 'unknown',
      metadata: {
        oldCount,
        newCount,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * NEW: Detect position changes between data sets
   */
  private detectPositionChanges(oldData: any[], newData: any[]): number {
    let changes = 0;
    const tolerance = 1; // 1mm tolerance

    newData.forEach((newPackage, index) => {
      const oldPackage = oldData[index];
      if (oldPackage && Array.isArray(oldPackage) && Array.isArray(newPackage)) {
        // Compare positions (x, y, z)
        if (Math.abs(oldPackage[0] - newPackage[0]) > tolerance ||
            Math.abs(oldPackage[1] - newPackage[1]) > tolerance ||
            Math.abs(oldPackage[2] - newPackage[2]) > tolerance) {
          changes++;
        }
      }
    });

    return changes;
  }

  /**
   * NEW: Detect dimension changes (rotation)
   */
  private detectDimensionChanges(oldData: any[], newData: any[]): number {
    let changes = 0;

    newData.forEach((newPackage, index) => {
      const oldPackage = oldData[index];
      if (oldPackage && Array.isArray(oldPackage) && Array.isArray(newPackage)) {
        // Compare dimensions (length, width, height)
        if (oldPackage[3] !== newPackage[3] ||
            oldPackage[4] !== newPackage[4] ||
            oldPackage[5] !== newPackage[5]) {
          changes++;
        }
      }
    });

    return changes;
  }

  /**
   * NEW: Track data change event
   */
  private trackDataChange(
    type: 'drag' | 'rotate' | 'delete' | 'restore' | 'initial' | 'unknown',
    packageId?: number,
    metadata?: any
  ): void {
    const changeEvent: DataChangeEvent = {
      timestamp: new Date(),
      type: type,
      packageId: packageId,
      metadata: metadata
    };

    this.dataChangeHistory.push(changeEvent);

    // Keep only last 50 changes to prevent memory issues
    if (this.dataChangeHistory.length > 50) {
      this.dataChangeHistory = this.dataChangeHistory.slice(-50);
    }

    // Update loading stats based on change type
    this.updateLoadingStatsFromChange(type, metadata);


  }

  /**
   * NEW: Update loading stats based on data change
   */
  private updateLoadingStatsFromChange(
    type: 'drag' | 'rotate' | 'delete' | 'restore' | 'initial' | 'unknown',
    metadata?: any
  ): void {
    switch (type) {
      case 'drag':
        this.loadingStats.movedCount = (this.loadingStats.movedCount || 0) + (metadata?.movedPackages || 1);
        break;
      case 'rotate':
        this.loadingStats.rotatedCount = (this.loadingStats.rotatedCount || 0) + (metadata?.rotatedPackages || 1);
        break;
      case 'delete':
        this.loadingStats.deletedCount = (this.loadingStats.deletedCount || 0) + (metadata?.deletedCount || 1);
        break;
      case 'restore':
        // Reduce deleted count when restoring
        this.loadingStats.deletedCount = Math.max(0,
          (this.loadingStats.deletedCount || 0) - (metadata?.restoredCount || 1));
        break;
    }
  }

  /**
   * NEW: Get data change summary for display
   */
  getDataChangeSummary(): {
    totalChanges: number;
    hasUnsavedChanges: boolean;
    lastChangeTime: Date;
    recentChanges: DataChangeEvent[];
  } {
    const recentChanges = this.dataChangeHistory.slice(-10).reverse();

    return {
      totalChanges: this.dataChangeHistory.length,
      hasUnsavedChanges: this.hasUnsavedChanges,
      lastChangeTime: this.lastDataChangeTime,
      recentChanges: recentChanges
    };
  }

  /**
   * NEW: Reset to original data (undo all changes)
   */
  resetToOriginalData(): void {
    if (!this.originalPiecesData || this.originalPiecesData.length === 0) {
      this.toastService.warning('Sıfırlamak için orijinal veri bulunamadı');
      return;
    }

    const confirmed = confirm(
      '🔄 Tüm değişiklikleri geri al ve orijinal veriye dön?\n\n' +
      `Mevcut: ${this.piecesData.length} paket\n` +
      `Orijinal: ${this.originalPiecesData.length} paket\n` +
      `Toplam değişiklik: ${this.dataChangeHistory.length}\n\n` +
      '⚠️ Bu işlem geri alınamaz!'
    );

    if (!confirmed) return;

    try {
      // Reset data
      this.piecesData = JSON.parse(JSON.stringify(this.originalPiecesData));

      // Clear change history
      this.dataChangeHistory = [];
      this.hasUnsavedChanges = false;

      // Reprocess data
      this.safeProcessEnhancedOptimizationResult({
        data: this.piecesData
      });

      // Recalculate stats
      this.calculateEnhancedStats();

      // Reset loading stats counters
      this.loadingStats.deletedCount = 0;
      this.loadingStats.movedCount = 0;
      this.loadingStats.rotatedCount = 0;

      // Trigger auto-save
      this.triggerEnhancedAutoSave('data-change');

      // Update UI
      this.safeUpdateEnhancedUI();

      this.toastService.success('Veriler orijinal haline sıfırlandı');


    } catch (error) {

      this.toastService.error('Veri sıfırlama hatası');
    }
  }

  // ========================================
  // ENHANCED EXISTING METHODS (Updated)
  // ========================================

  forceSaveStep3(): void {
    if (this.hasResults) {
      const enhancedSaveData = {
        optimizationResult: this.piecesData,
        originalOptimizationResult: this.originalPiecesData, // NEW
        reportFiles: this.reportFiles,
        loadingStats: this.loadingStats,
        algorithmStats: this.algorithmStats,
        truckDimension: this.truckDimension,
        hasResults: this.hasResults,
        showVisualization: this.showVisualization,
        currentViewType: this.currentViewType,
        hasThreeJSError: this.hasThreeJSError,
        hasUnsavedChanges: this.hasUnsavedChanges,
        dataChangeHistory: this.dataChangeHistory,
        totalPackagesProcessed: this.totalPackagesProcessed,
        performanceMetrics: this.performanceMetrics,
        timestamp: new Date().toISOString()
      };

      this.autoSaveService.forceSave(3, enhancedSaveData);

      // Mark as saved
      this.hasUnsavedChanges = false;

      this.toastService.success('Enhanced result verileri zorla kaydedildi');

    } else {
      this.toastService.warning('Kaydetmek için önce optimizasyonu çalıştırın');
    }
  }

  private safeResetEnhancedState(): void {
    if (this.isDestroyed) return;

    this.isLoading = true;
    this.hasResults = false;
    this.showVisualization = false;
    this.hasThreeJSError = false;
    this.optimizationProgress = 0;
    this.piecesData = [];
    this.originalPiecesData = []; // NEW
    this.processedPackages = [];
    this.reportFiles = [];

    // NEW: Reset change tracking
    this.hasUnsavedChanges = false;
    this.dataChangeHistory = [];
    this.lastDataChangeTime = new Date();
    this.totalPackagesProcessed = 0;

    this.resetEnhancedStats();
    this.safeUpdateEnhancedUI();
  }

  private safeProcessEnhancedOptimizationResult(response: any): void {
    if (this.isDestroyed) return;

    try {
      // Enhanced response handling with validation
      let packingData = null;

      if (response?.data) {
        if (typeof response.data === 'string') {
          try {
            packingData = JSON.parse(response.data);
          } catch (parseError) {

            packingData = null;
          }
        } else if (response.data.data) {
          packingData = response.data.data;

        } else {
          packingData = response.data;
        }
      }

      if (packingData && Array.isArray(packingData) && packingData.length > 0) {
        // Enhanced array creation with validation
        this.piecesData = this.validateAndCleanPackingData(packingData);
        this.safeProcessEnhancedPackageData();
        this.calculateEnhancedStats();

        // NEW: Update total processed count
        this.totalPackagesProcessed = this.piecesData.length;


      } else {

        this.piecesData = [];
        this.processedPackages = [];
        this.totalPackagesProcessed = 0;
      }

      // Enhanced algorithm stats extraction
      if (response?.stats) {
        this.algorithmStats = {
          executionTime: response.stats.execution_time || 0,
          generations: response.stats.generations || 0,
          bestFitness: response.stats.best_fitness || 0,
          iterationsCount: response.stats.iterations || 0,
          convergenceRate: response.stats.convergence_rate || 0
        };
      }
    } catch (error) {

      this.piecesData = [];
      this.processedPackages = [];
      this.totalPackagesProcessed = 0;
    }
  }

  private validateAndCleanPackingData(rawData: any[]): any[] {
    return rawData.filter((piece, index) => {
      // Enhanced validation for each piece
      if (!Array.isArray(piece) || piece.length < 6) {

        return false;
      }

      // Validate numeric values
      const [x, y, z, length, width, height] = piece;
      if ([x, y, z, length, width, height].some(val => typeof val !== 'number' || isNaN(val) || val < 0)) {

        return false;
      }

      return true;
    });
  }

  private safeProcessEnhancedPackageData(): void {
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
          color: this.getEnhancedPackageColor(index),
          dimensions: `${piece[3] || 0}×${piece[4] || 0}×${piece[5] || 0}mm`,
        })
      );


    } catch (error) {

      this.processedPackages = [];
    }
  }

  private calculateEnhancedStats(): void {
    if (this.isDestroyed || this.processedPackages.length === 0) {
      this.resetEnhancedStats();
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

      const cogScore = this.calculateEnhancedCOGScore();
      const utilizationRate = Math.round((usedVolume / totalVolume) * 100);
      const efficiency = Math.round((utilizationRate + cogScore) / 2);

      this.loadingStats = {
        ...this.loadingStats, // Preserve existing counts (deletedCount, movedCount, rotatedCount)
        totalPackages: this.processedPackages.length,
        packagesLoaded: this.processedPackages.length,
        utilizationRate: utilizationRate,
        cogScore: cogScore,
        totalWeight: Math.round(totalWeight),
        efficiency: efficiency,
      };


    } catch (error) {

      this.resetEnhancedStats();
    }
  }

  private calculateEnhancedCOGScore(): number {
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

      // Enhanced ideal COG calculation
      const idealX = this.truckDimension[0] / 2;
      const idealY = this.truckDimension[1] / 2;
      const idealZ = this.truckDimension[2] * 0.4;

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

      const score = Math.round(Math.max(0, 100 - (distance / maxDistance) * 100));


      return score;
    } catch (error) {

      return 0;
    }
  }

  private safeEnhancedFinalize(): void {
    if (this.isDestroyed) return;

    this.isLoading = false;
    this.hasResults = true;
    this.showVisualization = true;
    this.hasThreeJSError = false;

    this.safeUpdateEnhancedUI();
    this.toastService.success('Enhanced paketleme ve rapor başarıyla oluşturuldu.');

    // Enhanced finalization with session save
    this.saveEnhancedResultsToSession();

    // Performance tracking
    this.performanceMetrics.endTime = performance.now();
    const processingTime = this.performanceMetrics.endTime - this.performanceMetrics.startTime;

  }

  private handleEnhancedError(error: any): void {
    if (this.isDestroyed) return;

    this.isLoading = false;
    this.hasResults = false;
    this.optimizationProgress = 0;

    this.safeUpdateEnhancedUI();

    const errorMessage = this.getEnhancedErrorMessage(error);
    this.toastService.error(errorMessage);


  }

  private safeUpdateEnhancedUI(): void {
    if (this.isDestroyed) return;

    try {
      this.cdr.detectChanges();
    } catch (error) {

    }
  }

  // ========================================
  // ENHANCED PROGRESS SIMULATION
  // ========================================

  private startEnhancedProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      if (this.isDestroyed || !this.isLoading) {
        this.stopEnhancedProgressSimulation();
        return;
      }

      if (this.optimizationProgress < 70) {
        // Enhanced progress with variable speed
        const increment = Math.random() * 8 + 2; // 2-10 increment
        this.optimizationProgress = Math.min(70, this.optimizationProgress + increment);
        this.safeUpdateEnhancedUI();
      }
    }, 500);
  }

  private stopEnhancedProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  // ========================================
  // ENHANCED EVENT HANDLERS
  // ========================================

  onPackageSelected(packageData: any): void {
    if (this.isDestroyed) return;



    try {
      // Enhanced package selection validation
      if (!packageData || !packageData.id) {

        return;
      }

      // Enhanced package state management
      this.updateEnhancedPackageInternalState(packageData);

      // Enhanced auto-save trigger
      this.triggerEnhancedAutoSave('user-action');

      // Enhanced statistics update
      this.updatePackageInteractionStats('selected');

    } catch (error) {

      this.toastService.error('Paket seçiminde hata oluştu');
    }
  }

  onViewChanged(viewType: string): void {
    if (this.isDestroyed) return;



    try {
      // Enhanced view state management
      this.currentViewType = viewType;

      // Enhanced auto-save trigger
      this.triggerEnhancedAutoSave('user-action');

      // Enhanced UI update
      this.cdr.detectChanges();



    } catch (error) {

    }
  }

  // Enhanced three.js component error handling
  onThreeJSError(error: any): void {

    this.hasThreeJSError = true;
    this.showVisualization = false;
    this.toastService.error('3D görselleştirmede hata oluştu');
    this.cdr.detectChanges();
  }

  // Enhanced three.js component ready handler
  onThreeJSReady(): void {

    this.hasThreeJSError = false;
    this.cdr.detectChanges();
  }

  // ========================================
  // ENHANCED HELPER METHODS
  // ========================================

  private updateEnhancedPackageInternalState(packageData: any): void {
    try {
      // Enhanced package finding and updating
      const packageIndex = this.processedPackages.findIndex(pkg => pkg.id === packageData.id);

      if (packageIndex > -1) {
        // Enhanced package update with validation
        const updatedPackage = {
          ...this.processedPackages[packageIndex],
          ...packageData,
          lastModified: new Date().toISOString()
        };

        this.processedPackages[packageIndex] = updatedPackage;

      }

    } catch (error) {

    }
  }

  private updatePackageInteractionStats(action: 'selected' | 'moved' | 'rotated' | 'deleted'): void {
    try {
      switch (action) {
        case 'moved':
          this.loadingStats.movedCount = (this.loadingStats.movedCount || 0) + 1;
          break;
        case 'rotated':
          this.loadingStats.rotatedCount = (this.loadingStats.rotatedCount || 0) + 1;
          break;
        case 'deleted':
          this.loadingStats.deletedCount = (this.loadingStats.deletedCount || 0) + 1;
          break;
      }


    } catch (error) {

    }
  }

  // ========================================
  // ENHANCED UI HELPER METHODS
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

  // NEW: Get change status class for UI styling
  getChangeStatusClass(): string {
    if (!this.hasUnsavedChanges) return 'saved';
    if (this.dataChangeHistory.length > 10) return 'many-changes';
    if (this.dataChangeHistory.length > 0) return 'has-changes';
    return 'no-changes';
  }

  // NEW: Format change type for display
  formatChangeType(changeType: string): string {
    const typeMap: { [key: string]: string } = {
      'drag': '🎯 Taşındı',
      'rotate': '🔄 Döndürüldü',
      'delete': '🗑️ Silindi',
      'restore': '➕ Geri Eklendi',
      'initial': '🚀 Başlangıç',
      'unknown': '❓ Bilinmeyen'
    };
    return typeMap[changeType] || changeType;
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
  // ENHANCED VISUALIZATION METHODS
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

      // Enhanced popup creation
      const newWindow = window.open(
        '',
        '_blank',
        'width=1200,height=800,scrollbars=yes,resizable=yes'
      );

      if (newWindow) {
        newWindow.document.write(this.createEnhancedThreeJSPopupHTML(dataStr, dimensionsStr));
        newWindow.document.close();
        this.popupWindow = newWindow;

        // Enhanced auto-save trigger
        this.triggerEnhancedAutoSave('user-action');


      }
    } catch (error) {

      this.toastService.error('3D görünüm açılamadı.');
    }
  }

  private createEnhancedThreeJSPopupHTML(dataStr: string, dimensionsStr: string): string {
    try {
      // Enhanced validation
      if (!dataStr || !dimensionsStr) {
        throw new Error('Invalid data for enhanced popup generation');
      }

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Enhanced 3D Tır Yükleme Görselleştirmesi</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              overflow-x: hidden;
            }

            #threejs-container {
              width: 100%;
              height: 700px;
              border: 2px solid #006A6A;
              background: white;
              border-radius: 12px;
              position: relative;
              box-shadow: 0 8px 24px rgba(0, 106, 106, 0.2);
            }

            .header {
              text-align: center;
              margin-bottom: 20px;
              color: #006A6A;
            }

            .header h1 {
              font-size: 2rem;
              margin: 0 0 0.5rem;
              background: linear-gradient(135deg, #006A6A 0%, #004A4A 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }

            .enhanced-stats {
              display: flex;
              justify-content: center;
              gap: 20px;
              margin-bottom: 20px;
              flex-wrap: wrap;
            }

            .enhanced-stat-item {
              text-align: center;
              padding: 16px 20px;
              background: white;
              border-radius: 12px;
              border: 2px solid #e0f2f1;
              box-shadow: 0 4px 8px rgba(0, 106, 106, 0.1);
              min-width: 140px;
              transition: all 0.3s ease;
            }

            .enhanced-stat-item:hover {
              transform: translateY(-4px);
              box-shadow: 0 8px 16px rgba(0, 106, 106, 0.2);
              border-color: #006A6A;
            }

            .enhanced-stat-value {
              font-weight: 700;
              color: #006A6A;
              font-size: 1.5rem;
              display: block;
              margin-bottom: 4px;
            }

            .enhanced-stat-label {
              font-size: 0.875rem;
              color: #666;
              font-weight: 500;
            }

            .enhanced-controls {
              position: absolute;
              top: 15px;
              left: 15px;
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(10px);
              padding: 15px;
              border-radius: 12px;
              z-index: 100;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              border: 1px solid rgba(0, 106, 106, 0.2);
            }

            .enhanced-controls h3 {
              margin: 0 0 12px;
              color: #006A6A;
              font-size: 1rem;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .enhanced-control-btn {
              display: block;
              width: 100%;
              margin-bottom: 8px;
              padding: 10px 15px;
              border: 2px solid #006A6A;
              background: white;
              color: #006A6A;
              border-radius: 8px;
              cursor: pointer;
              font-size: 0.875rem;
              font-weight: 600;
              transition: all 0.2s ease;
            }

            .enhanced-control-btn:hover {
              background: #006A6A;
              color: white;
              transform: translateY(-1px);
              box-shadow: 0 4px 8px rgba(0, 106, 106, 0.3);
            }

            .enhanced-view-buttons {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-top: 12px;
            }

            .enhanced-view-btn {
              padding: 8px 12px;
              border: 1px solid #006A6A;
              background: white;
              color: #006A6A;
              border-radius: 6px;
              cursor: pointer;
              font-size: 0.8rem;
              font-weight: 500;
              transition: all 0.2s ease;
            }

            .enhanced-view-btn:hover, .enhanced-view-btn.active {
              background: #006A6A;
              color: white;
            }

            .enhanced-loading-indicator {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: #006A6A;
              font-size: 1.125rem;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .enhanced-loading-spinner {
              width: 24px;
              height: 24px;
              border: 3px solid #e0f2f1;
              border-top-color: #006A6A;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }

            @keyframes spin {
              to { transform: rotate(360deg); }
            }

            .enhanced-error-message {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: #ef4444;
              font-size: 1.125rem;
              font-weight: 600;
              text-align: center;
              padding: 20px;
              background: rgba(255, 255, 255, 0.9);
              border-radius: 8px;
              border: 2px solid #ef4444;
            }

            @media (max-width: 768px) {
              body { padding: 10px; }
              #threejs-container { height: 500px; }
              .enhanced-controls { position: static; margin-bottom: 15px; }
              .enhanced-stats { flex-direction: column; align-items: center; }
              .enhanced-stat-item { min-width: 120px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚛 Enhanced Tır Yükleme Optimizasyonu</h1>
            <p>Three.js 3D Görselleştirme - Gelişmiş Sürüm v3.0</p>
          </div>

          <div class="enhanced-stats">
            <div class="enhanced-stat-item">
              <span class="enhanced-stat-value">${this.loadingStats.packagesLoaded}</span>
              <span class="enhanced-stat-label">Yüklenen Paket</span>
            </div>
            <div class="enhanced-stat-item">
              <span class="enhanced-stat-value">${this.loadingStats.utilizationRate}%</span>
              <span class="enhanced-stat-label">Doluluk Oranı</span>
            </div>
            <div class="enhanced-stat-item">
              <span class="enhanced-stat-value">${this.loadingStats.cogScore}/100</span>
              <span class="enhanced-stat-label">COG Skoru</span>
            </div>
            <div class="enhanced-stat-item">
              <span class="enhanced-stat-value">${this.loadingStats.totalWeight} kg</span>
              <span class="enhanced-stat-label">Toplam Ağırlık</span>
            </div>
            <div class="enhanced-stat-item">
              <span class="enhanced-stat-value">${this.algorithmStats.executionTime.toFixed(1)}s</span>
              <span class="enhanced-stat-label">İşlem Süresi</span>
            </div>
            <div class="enhanced-stat-item">
              <span class="enhanced-stat-value">${this.dataChangeHistory.length}</span>
              <span class="enhanced-stat-label">Değişiklik Sayısı</span>
            </div>
          </div>

          <div id="threejs-container">
            <div class="enhanced-loading-indicator" id="loading">
              <div class="enhanced-loading-spinner"></div>
              <span>Enhanced Three.js yükleniyor...</span>
            </div>

            <div class="enhanced-controls" id="controls" style="display: none;">
              <h3>🎮 Gelişmiş Kontroller v3.0</h3>
              <button class="enhanced-control-btn" onclick="resetView()">🎯 Görünümü Sıfırla</button>
              <button class="enhanced-control-btn" onclick="toggleWireframe()">🔳 Wireframe</button>
              <button class="enhanced-control-btn" onclick="autoRotate()">🔄 Otomatik Döndür</button>
              <button class="enhanced-control-btn" onclick="enhancedFullscreen()">⛶ Tam Ekran</button>

              <div class="enhanced-view-buttons">
                <button class="enhanced-view-btn" onclick="setView('front')">⬜ Ön</button>
                <button class="enhanced-view-btn" onclick="setView('side')">▫️ Yan</button>
                <button class="enhanced-view-btn" onclick="setView('top')">⬛ Üst</button>
                <button class="enhanced-view-btn" onclick="setView('iso')">🔲 3D</button>
              </div>
            </div>
          </div>

          <script>
            // Enhanced Three.js implementation
            let scene, camera, renderer, truckGroup, packagesGroup;
            let isWireframe = false;
            let autoRotateEnabled = false;
            let animationId;

            // Enhanced initialization
            function initThreeJS() {
              try {
                const container = document.getElementById('threejs-container');
                const loading = document.getElementById('loading');
                const controls = document.getElementById('controls');

                // Enhanced data parsing with validation
                const piecesData = JSON.parse('${dataStr}');
                const truckDimension = JSON.parse('${dimensionsStr}');

                if (!piecesData || !truckDimension) {
                  throw new Error('Enhanced: Invalid data provided');
                }



                // Enhanced scene setup
                scene = new THREE.Scene();
                scene.background = new THREE.Color(0xf8fafc);
                scene.fog = new THREE.Fog(0xf8fafc, 1000, 50000);

                // Enhanced camera
                camera = new THREE.PerspectiveCamera(
                  75,
                  container.clientWidth / container.clientHeight,
                  0.1,
                  100000
                );

                // Enhanced renderer
                renderer = new THREE.WebGLRenderer({
                  antialias: true,
                  alpha: true,
                  powerPreference: 'high-performance'
                });
                renderer.setSize(container.clientWidth, container.clientHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;

                container.appendChild(renderer.domElement);

                // Enhanced lighting
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
                scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
                directionalLight.position.set(200, 200, 100);
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 2048;
                directionalLight.shadow.mapSize.height = 2048;
                scene.add(directionalLight);

                // Enhanced groups
                truckGroup = new THREE.Group();
                packagesGroup = new THREE.Group();
                scene.add(truckGroup);
                scene.add(packagesGroup);

                // Create enhanced truck and packages
                createEnhancedTruck(truckDimension);
                createEnhancedPackages(piecesData);

                // Set initial view
                setView('iso');

                // Start enhanced render loop
                animate();

                // Enhanced mouse controls
                setupEnhancedControls();

                // Show controls
                loading.style.display = 'none';
                controls.style.display = 'block';



              } catch (error) {

                document.getElementById('loading').innerHTML =
                  '<div class="enhanced-error-message">❌ Enhanced Görselleştirme hatası:<br>' + error.message + '</div>';
              }
            }

            // Enhanced truck creation
            function createEnhancedTruck(dimensions) {
              const geometry = new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]);
              const edges = new THREE.EdgesGeometry(geometry);
              const material = new THREE.LineBasicMaterial({
                color: 0x006A6A,
                linewidth: 3,
                transparent: true,
                opacity: 0.8
              });

              const wireframe = new THREE.LineSegments(edges, material);
              wireframe.position.set(dimensions[0]/2, dimensions[1]/2, dimensions[2]/2);

              truckGroup.add(wireframe);

              // Enhanced floor
              const floorGeometry = new THREE.PlaneGeometry(dimensions[0], dimensions[2]);
              const floorMaterial = new THREE.MeshLambertMaterial({
                color: 0xeeeeee,
                transparent: true,
                opacity: 0.3
              });
              const floor = new THREE.Mesh(floorGeometry, floorMaterial);
              floor.rotation.x = -Math.PI / 2;
              floor.position.set(dimensions[0]/2, 0, dimensions[2]/2);
              floor.receiveShadow = true;

              truckGroup.add(floor);
            }

            // Enhanced packages creation
            function createEnhancedPackages(piecesData) {
              const colors = ['#006A6A', '#D6BB86', '#004A4A', '#C0A670', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];

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

                // Enhanced edge highlight
                const edgesGeometry = new THREE.EdgesGeometry(geometry);
                const edgesMaterial = new THREE.LineBasicMaterial({
                  color: 0xffffff,
                  transparent: true,
                  opacity: 0.2
                });
                const edgeLines = new THREE.LineSegments(edgesGeometry, edgesMaterial);
                mesh.add(edgeLines);

                packagesGroup.add(mesh);
              });
            }

            // Enhanced controls setup
            function setupEnhancedControls() {
              const canvas = renderer.domElement;
              let isMouseDown = false;
              let mouseX = 0, mouseY = 0;

              canvas.addEventListener('mousedown', (event) => {
                isMouseDown = true;
                mouseX = event.clientX;
                mouseY = event.clientY;
                canvas.style.cursor = 'grabbing';
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
                canvas.style.cursor = 'grab';
              });

              // Enhanced zoom
              canvas.addEventListener('wheel', (event) => {
                event.preventDefault();
                const zoomSpeed = 0.1;
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);
                direction.multiplyScalar(event.deltaY * zoomSpeed * 100);
                camera.position.add(direction);
              });

              canvas.style.cursor = 'grab';
            }

            // Enhanced animation loop
            function animate() {
              if (!renderer) return;

              animationId = requestAnimationFrame(animate);

              // Enhanced auto rotation
              if (autoRotateEnabled) {
                packagesGroup.rotation.y += 0.005;
                truckGroup.rotation.y += 0.005;
              }

              renderer.render(scene, camera);
            }

            // Enhanced control functions
            function rotateView(deltaX, deltaY) {
              const spherical = new THREE.Spherical();
              const target = new THREE.Vector3(${this.truckDimension[0]/2}, ${this.truckDimension[1]/2}, ${this.truckDimension[2]/2});

              spherical.setFromVector3(camera.position.clone().sub(target));
              spherical.theta -= deltaX;
              spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY));

              camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(target));
              camera.lookAt(target);
            }

            function setView(viewType) {
              const truckDim = [${this.truckDimension.join(', ')}];
              const maxDim = Math.max(...truckDim);
              const distance = maxDim * 1.5;
              const target = new THREE.Vector3(truckDim[0]/2, truckDim[1]/2, truckDim[2]/2);

              document.querySelectorAll('.enhanced-view-btn').forEach(btn => btn.classList.remove('active'));

              switch (viewType) {
                case 'front':
                  camera.position.set(distance, truckDim[1]/2, truckDim[2]/2);
                  break;
                case 'side':
                  camera.position.set(truckDim[0]/2, truckDim[1]/2, distance);
                  break;
                case 'top':
                  camera.position.set(truckDim[0]/2, distance, truckDim[2]/2);
                  break;
                case 'iso':
                default:
                  camera.position.set(distance * 0.8, distance * 0.8, distance * 0.8);
                  break;
              }

              camera.lookAt(target);

              const button = document.querySelector(\`[onclick="setView('\${viewType}')"]\`);
              if (button) button.classList.add('active');
            }

            function resetView() {
              autoRotateEnabled = false;
              packagesGroup.rotation.set(0, 0, 0);
              truckGroup.rotation.set(0, 0, 0);
              setView('iso');
            }

            function toggleWireframe() {
              isWireframe = !isWireframe;
              packagesGroup.children.forEach(mesh => {
                if (mesh.material) {
                  mesh.material.wireframe = isWireframe;
                }
              });
            }

            function autoRotate() {
              autoRotateEnabled = !autoRotateEnabled;
            }

            function enhancedFullscreen() {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }

            // Enhanced resize handler
            window.addEventListener('resize', () => {
              if (!camera || !renderer) return;

              const container = document.getElementById('threejs-container');
              camera.aspect = container.clientWidth / container.clientHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(container.clientWidth, container.clientHeight);
            });

            // Enhanced cleanup
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
            setTimeout(initThreeJS, 100);
          </script>
        </body>
        </html>
      `;

    } catch (error) {

      return `
        <!DOCTYPE html>
        <html>
        <head><title>Enhanced Hata</title></head>
        <body>
          <div style="padding: 40px; text-align: center; color: #ef4444;">
            <h2>❌ Enhanced Görselleştirme Hatası</h2>
            <p>3D görünüm oluşturulurken hata oluştu.</p>
            <p>Lütfen sayfayı yenileyin ve tekrar deneyin.</p>
            <p><small>Error:</small></p>
          </div>
        </body>
        </html>
      `;
    }
  }

  // ========================================
  // ENHANCED UTILITY METHODS
  // ========================================

  private resetEnhancedStats(): void {
    this.loadingStats = {
      totalPackages: 0,
      packagesLoaded: 0,
      utilizationRate: 0,
      cogScore: 0,
      totalWeight: 0,
      efficiency: 0,
      deletedCount: 0,
      movedCount: 0,
      rotatedCount: 0
    };
  }

  private getEnhancedPackageColor(index: number): string {
    const colors = [
      '#006A6A', '#D6BB86', '#004A4A', '#C0A670', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
      '#14b8a6', '#fbbf24', '#8b5cf6', '#f87171', '#34d399',
      '#60a5fa', '#a78bfa', '#fb7185', '#fde047', '#67e8f9'
    ];
    return colors[index % colors.length];
  }

  private getEnhancedErrorMessage(error: any): string {
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
  // ENHANCED ACTION METHODS
  // ========================================

  saveResults(): void {
    if (!this.hasResults || this.isDestroyed) {
      this.toastService.warning('Kaydetmek için önce optimizasyonu çalıştırın.');
      return;
    }

    try {
      const changeSummary = this.getDataChangeSummary();

      if(changeSummary.hasUnsavedChanges){
        this.repositoryService.partialUpdateOrderResult(this.piecesData, this.orderResultId)
        .pipe(
          switchMap(response => {
            // İlk işlem tamamlandıktan sonra ikinci işlem başlar
            return this.repositoryService.createTruckPlacementReport();
          }),
          catchError(error => {
            this.toastService.error('İşlem sırasında hata oluştu:', error);
            return of(null);
          })
        )
        .subscribe({
          next: (response) => {
            // 'Tır_Yerleşimi' ile başlayan dosyayı reportFiles'tan kaldır
            this.reportFiles = this.reportFiles.filter(file =>
              !file.name.startsWith('Tır_Yerleşimi')
            );

            // Yeni dosyayı reportFiles'a ekle
            if (response && response.file) {
              this.reportFiles.push(response.file);
            }

            // Diğer işlemleriniz
            this.reportFiles.forEach(file => file.name);
          },
          error: (error) => {
            // Subscribe seviyesinde hata yakalama (catchError'dan kaçan hatalar için)
            this.toastService.error('Hata:', error);
          },
          complete: () => {
            // İşlem tamamlandığında çalışacak kod (opsiyonel)
            this.hasUnsavedChanges = false;
            this.toastService.success('Sonuçlar başarıyla kaydedildi.');
            this.triggerEnhancedAutoSave('user-action');
          }
        });
      }
    } catch (error) {
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
   * Enhanced sevkiyatı tamamla ve yeni workflow'a hazırla
   */
  completeShipment(): void {
    if (!this.hasResults) {
      this.toastService.warning('Önce optimizasyonu tamamlayın');
      return;
    }

    const changeSummary = this.getDataChangeSummary();
    const confirmMessage =
      'Sevkiyatı tamamlamak istediğinizden emin misiniz?\n\n' +
      '✅ Tüm veriler gelişmiş formatta kaydedilecek\n' +
      `📦 ${this.processedPackages.length} paket işlendi\n` +
      `🔄 ${changeSummary.totalChanges} değişiklik yapıldı\n` +
      (changeSummary.hasUnsavedChanges ? '⚠️ Kaydedilmemiş değişiklikler var\n' : '') +
      '🗑️ Geçici veriler temizlenecek\n' +
      '🆕 Yeni sipariş için hazırlanacak\n' +
      '📊 Performans metrikleri saklanacak';

    const confirmed = confirm(confirmMessage);

    if (!confirmed) {
      return;
    }



    try {
      // 1. Enhanced final save to session (with all changes)
      this.saveEnhancedResultsToSession();

      // 2. Enhanced auto-save history clean
      this.autoSaveService.clearHistory();

      // 3. Enhanced session clean
      this.localStorageService.clearStorage();

      // 4. Enhanced stepper reset
      this.stepperService.resetStepper();

      // 5. Enhanced component state clean
      this.resetEnhancedComponentState();

      // 6. Enhanced success notification
      this.toastService.success(
        `Sevkiyat başarıyla tamamlandı! ${changeSummary.totalChanges} değişiklik kaydedildi. Yeni sipariş işlemeye başlayabilirsiniz.`,
        'Tamamlandı!'
      );

      // 7. Enhanced completion signal
      setTimeout(() => {
        this.shipmentCompleted.emit();
      }, 1500);

      // 8. Enhanced logging

    } catch (error) {
      this.toastService.error('Sevkiyat tamamlanırken hata oluştu');
    }
  }

  /**
   * Enhanced component state temizle
   */
  private resetEnhancedComponentState(): void {
    this.hasResults = false;
    this.showVisualization = false;
    this.isLoading = false;
    this.hasThreeJSError = false;
    this.piecesData = [];
    this.originalPiecesData = []; // NEW
    this.reportFiles = [];
    this.optimizationProgress = 0;
    this.processedPackages = [];
    this.currentViewType = 'isometric';

    // NEW: Reset change tracking
    this.hasUnsavedChanges = false;
    this.dataChangeHistory = [];
    this.lastDataChangeTime = new Date();
    this.totalPackagesProcessed = 0;

    // Enhanced reset loading stats
    this.resetEnhancedStats();

    // Enhanced reset algorithm stats
    this.algorithmStats = {
      executionTime: 0,
      generations: 0,
      bestFitness: 0,
      iterationsCount: 0,
      convergenceRate: 0
    };

    // Enhanced reset performance metrics
    this.performanceMetrics = {
      startTime: 0,
      endTime: 0,
      memoryUsage: 0,
      renderTime: 0,
      dataChangeCount: 0,
      averageResponseTime: 0
    };
  }
}

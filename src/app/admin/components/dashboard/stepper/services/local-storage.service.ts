import { Injectable } from '@angular/core';
import { Order } from '../../../../../models/order.interface';
import { OrderDetail } from '../../../../../models/order-detail.interface';
import { UiPackage } from '../components/ui-models/ui-package.model';
import { UiProduct } from '../components/ui-models/ui-product.model';

// Enhanced interfaces for better type safety
interface EnhancedLoadingStats {
  totalPackages: number;
  packagesLoaded: number;
  utilizationRate: number;
  cogScore: number;
  totalWeight: number;
  efficiency: number;
  deletedCount?: number;
  movedCount?: number;
  rotatedCount?: number;
  stackingLayers?: number;
  averagePackageSize?: number;
  weightDistribution?: {
    light: number;
    medium: number;
    heavy: number;
  };
}

interface EnhancedAlgorithmStats {
  executionTime: number;
  generations: number;
  bestFitness: number;
  iterationsCount?: number;
  convergenceRate?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  optimizationMethod?: string;
  constraintsSatisfied?: number;
  totalConstraints?: number;
}

interface EnhancedPerformanceMetrics {
  startTime: number;
  endTime: number;
  memoryUsage: number;
  renderTime: number;
  frameRate?: number;
  triangleCount?: number;
  drawCalls?: number;
  gpuMemoryUsage?: number;
}

interface EnhancedStep3Data {
  optimizationResult: any;
  reportFiles: any[];
  loadingStats?: EnhancedLoadingStats;
  algorithmStats?: EnhancedAlgorithmStats;
  truckDimension?: number[];
  hasResults?: boolean;
  showVisualization?: boolean;
  currentViewType?: string;
  hasThreeJSError?: boolean;
  performanceMetrics?: EnhancedPerformanceMetrics;
  processedPackages?: any[];
  timestamp?: string;
  isCompleted: boolean;
}

interface EnhancedStepperStorageData {
  // Step 1 verileri
  step1: {
    order: Order | null;
    orderDetails: OrderDetail[];
    hasFile: boolean;
    fileName?: string;
    isCompleted: boolean;
  };

  // Step 2 verileri
  step2: {
    packages: any[];
    availableProducts: any[];
    isCompleted: boolean;
  };

  // Enhanced Step 3 verileri
  step3: EnhancedStep3Data;

  // Enhanced Meta bilgiler
  currentStep: number;
  lastSaved: string;
  version: string;
  sessionId?: string;
  deviceInfo?: {
    userAgent: string;
    screenResolution: string;
    platform: string;
  };
  autoSaveHistory?: Array<{
    timestamp: string;
    changeType: 'user-action' | 'api-response' | 'emergency';
    dataSize: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  private readonly STORAGE_KEY = 'enhanced_stepper_draft_data';
  private readonly STORAGE_VERSION = '2.0.0'; // Enhanced version
  private readonly EXPIRY_DAYS = 30;
  private readonly MAX_AUTO_SAVE_HISTORY = 50;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.cleanupExpiredData();
    this.initializeDeviceInfo();
  }

  /**
   * ✅ Enhanced Data'yı localStorage'a kaydet
   */
  saveStepperData(data: Partial<EnhancedStepperStorageData>): void {
    try {
      const existingData = this.getStepperData();
      const updatedData: EnhancedStepperStorageData = {
        ...existingData,
        ...data,
        lastSaved: new Date().toISOString(),
        version: this.STORAGE_VERSION,
        sessionId: this.sessionId
      };

      // Enhanced storage with compression check
      const serializedData = JSON.stringify(updatedData);
      const dataSize = new Blob([serializedData]).size;

      // Check storage quota (warn if > 4MB)
      if (dataSize > 4 * 1024 * 1024) {

        this.cleanupLargeData(updatedData);
      }

      localStorage.setItem(this.STORAGE_KEY, serializedData);

    } catch (error) {

      this.handleEnhancedStorageError(error);
    }
  }

  /**
   * ✅ Enhanced Data'yı localStorage'dan oku
   */
  getStepperData(): EnhancedStepperStorageData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        // Enhanced version check with migration
        if (parsed.version !== this.STORAGE_VERSION) {

          const migratedData = this.migrateData(parsed);

          if (migratedData) {
            this.saveStepperData(migratedData);
            return migratedData;
          } else {

            this.clearStorage();
            return this.getDefaultData();
          }
        }

        // Enhanced expiry check
        if (this.isDataExpired(parsed.lastSaved)) {

          this.clearStorage();
          return this.getDefaultData();
        }

        // Enhanced data validation
        if (!this.validateStorageData(parsed)) {

          this.clearStorage();
          return this.getDefaultData();
        }

        //
        return parsed;
      }
    } catch (error) {

      this.clearStorage();
    }

    return this.getDefaultData();
  }

  /**
   * ✅ Enhanced data migration
   */
  private migrateData(oldData: any): EnhancedStepperStorageData | null {
    try {
      // Migration from v1.0.0 to v2.0.0
      if (oldData.version === '1.0.0') {
        const migratedData: EnhancedStepperStorageData = {
          step1: oldData.step1 ?? {
            order: null,
            orderDetails: [],
            hasFile: false,
            isCompleted: false
          },
          step2: oldData.step2 ?? {
            packages: [],
            availableProducts: [],
            isCompleted: false
          },
          step3: {
            ...oldData.step3,
            loadingStats: oldData.step3?.loadingStats ?? this.createDefaultLoadingStats(),
            algorithmStats: oldData.step3?.algorithmStats ?? this.createDefaultAlgorithmStats(),
            performanceMetrics: oldData.step3?.performanceMetrics ?? this.createDefaultPerformanceMetrics(),
            currentViewType: oldData.step3?.currentViewType ?? 'isometric',
            hasThreeJSError: oldData.step3?.hasThreeJSError ?? false,
            hasResults: oldData.step3?.isCompleted ?? false,
            showVisualization: oldData.step3?.isCompleted ?? false,
            timestamp: new Date().toISOString(),
            isCompleted: oldData.step3?.isCompleted ?? false,
            optimizationResult: oldData.step3?.optimizationResult ?? null,
            reportFiles: oldData.step3?.reportFiles ?? [],
            truckDimension: oldData.step3?.truckDimension ?? [13200, 2200, 2900],
            processedPackages: oldData.step3?.processedPackages ?? []
          },
          currentStep: oldData.currentStep ?? 1,
          lastSaved: new Date().toISOString(),
          version: this.STORAGE_VERSION,
          sessionId: this.sessionId,
          deviceInfo: this.getDeviceInfo(),
          autoSaveHistory: []
        };


        return migratedData;
      }

      return null;
    } catch (error) {

      return null;
    }
  }

  /**
   * ✅ Enhanced data validation
   */
  private validateStorageData(data: any): boolean {
    try {
      // Basic structure validation
      if (!data || typeof data !== 'object') return false;
      if (!data.step1 || !data.step2 || !data.step3) return false;
      if (typeof data.currentStep !== 'number') return false;
      if (!data.lastSaved) return false;

      // Enhanced step3 validation
      if (data.step3.isCompleted) {
        if (!data.step3.optimizationResult && !data.step3.reportFiles) {
          return false;
        }
      }

      return true;
    } catch (error) {

      return false;
    }
  }

  /**
   * ✅ Enhanced storage error handling
   */
  private handleEnhancedStorageError(error: any): void {
    try {
      // Check if quota exceeded
      if (error.name === 'QuotaExceededError') {

        this.cleanupOldData();
        return;
      }

      // Generic storage error cleanup
      const keys = Object.keys(localStorage);
      let cleanedCount = 0;

      keys.forEach(key => {
        if (key.startsWith('stepper_') && key !== this.STORAGE_KEY) {
          try {
            localStorage.removeItem(key);
            cleanedCount++;
          } catch (cleanupError) {

          }
        }
      });


    } catch (cleanupError) {

    }
  }

  /**
   * ✅ Enhanced large data cleanup
   */
  private cleanupLargeData(data: EnhancedStepperStorageData): void {
    try {
      // Remove old auto-save history
      if (data.autoSaveHistory && data.autoSaveHistory.length > this.MAX_AUTO_SAVE_HISTORY) {
        data.autoSaveHistory = data.autoSaveHistory.slice(-this.MAX_AUTO_SAVE_HISTORY);
      }

      // Compress performance metrics (keep only recent data)
      if (data.step3?.performanceMetrics) {
        // Keep essential metrics only
        data.step3.performanceMetrics = {
          startTime: data.step3.performanceMetrics.startTime,
          endTime: data.step3.performanceMetrics.endTime,
          memoryUsage: data.step3.performanceMetrics.memoryUsage,
          renderTime: data.step3.performanceMetrics.renderTime
        };
      }


    } catch (error) {

    }
  }

  /**
   * ✅ Enhanced Step 1 verilerini kaydet
   */
  saveStep1Data(order: Order | null, orderDetails: OrderDetail[], hasFile: boolean = false, fileName?: string): void {
    this.saveStepperData({
      step1: {
        order,
        orderDetails,
        hasFile,
        fileName,
        isCompleted: order !== null && orderDetails.length > 0
      },
      currentStep: 1
    });
  }

  /**
   * ✅ Enhanced Step 2 verilerini kaydet
   */
  saveStep2Data(packages: UiPackage[], availableProducts: UiProduct[]): void {
    const serializedPackages = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      pallet: pkg.pallet,
      products: pkg.products,
      order: pkg.order
    }));

    const serializedProducts = availableProducts.map(prd => ({
      id: prd.id,
      name: prd.name,
      count: prd.count,
      product_type: prd.product_type,
      dimension: prd.dimension,
      weight_type: prd.weight_type,
      company: prd.company,
    }));

    this.saveStepperData({
      step2: {
        packages: serializedPackages,
        availableProducts: serializedProducts,
        isCompleted: packages.length > 0
      },
      currentStep: 2
    });
  }

  /**
   * ✅ Enhanced Step 3 verilerini kaydet
   */
  saveStep3Data(
    optimizationResult: any,
    reportFiles: any[] = [],
    enhancedData?: Partial<EnhancedStep3Data>
  ): void {
    const step3Data: EnhancedStep3Data = {
      optimizationResult,
      reportFiles,
      isCompleted: true,
      timestamp: new Date().toISOString(),
      // Enhanced defaults
      loadingStats: this.createDefaultLoadingStats(),
      algorithmStats: this.createDefaultAlgorithmStats(),
      performanceMetrics: this.createDefaultPerformanceMetrics(),
      currentViewType: 'isometric',
      hasThreeJSError: false,
      hasResults: true,
      showVisualization: true,
      // Merge with provided enhanced data
      ...enhancedData
    };

    this.saveStepperData({
      step3: step3Data,
      currentStep: 3
    });

    // Enhanced auto-save history tracking
    this.addToAutoSaveHistory('api-response', JSON.stringify(step3Data).length);
  }

  /**
   * ✅ Enhanced auto-save history management
   */
  addToAutoSaveHistory(changeType: 'user-action' | 'api-response' | 'emergency', dataSize: number): void {
    try {
      const data = this.getStepperData();

      if (!data.autoSaveHistory) {
        data.autoSaveHistory = [];
      }

      data.autoSaveHistory.push({
        timestamp: new Date().toISOString(),
        changeType,
        dataSize
      });

      // Keep only recent history
      if (data.autoSaveHistory.length > this.MAX_AUTO_SAVE_HISTORY) {
        data.autoSaveHistory = data.autoSaveHistory.slice(-this.MAX_AUTO_SAVE_HISTORY);
      }

      // Save updated history
      this.saveStepperData({ autoSaveHistory: data.autoSaveHistory });
    } catch (error) {

    }
  }

  /**
   * ✅ Enhanced Step completion status
   */
  isStepCompleted(stepNumber: number): boolean {
    const data = this.getStepperData();

    switch (stepNumber) {
      case 1: return data.step1?.isCompleted || false;
      case 2: return data.step2?.isCompleted || false;
      case 3: return data.step3?.isCompleted || false;
      default: return false;
    }
  }

  /**
   * ✅ Enhanced Data restore metodları
   */
  restoreStep1Data(): { order: Order | null, orderDetails: OrderDetail[], hasFile: boolean, fileName?: string } | null {
    const data = this.getStepperData();

    if (data.step1?.isCompleted) {
      return {
        order: data.step1.order,
        orderDetails: data.step1.orderDetails,
        hasFile: data.step1.hasFile,
        fileName: data.step1.fileName
      };
    }
    return null;
  }

  restoreStep2Data(): { packages: UiPackage[], availableProducts: UiProduct[] } | null {
    const data = this.getStepperData();
    if (data.step2?.isCompleted) {
      return {
        packages: data.step2.packages,
        availableProducts: data.step2.availableProducts
      };
    }
    return null;
  }

  restoreStep3Data(): EnhancedStep3Data | null {
    const data = this.getStepperData();

    if (data.step3?.isCompleted) {
      // Enhanced restore with fallback values
      return {
        optimizationResult: data.step3.optimizationResult,
        reportFiles: data.step3.reportFiles,
        loadingStats: data.step3.loadingStats || this.createDefaultLoadingStats(),
        algorithmStats: data.step3.algorithmStats || this.createDefaultAlgorithmStats(),
        performanceMetrics: data.step3.performanceMetrics || this.createDefaultPerformanceMetrics(),
        truckDimension: data.step3.truckDimension || [13200, 2200, 2900],
        hasResults: data.step3.hasResults ?? true,
        showVisualization: data.step3.showVisualization ?? true,
        currentViewType: data.step3.currentViewType || 'isometric',
        hasThreeJSError: data.step3.hasThreeJSError || false,
        processedPackages: data.step3.processedPackages || [],
        timestamp: data.step3.timestamp || new Date().toISOString(),
        isCompleted: data.step3.isCompleted
      };
    }
    return null;
  }

  /**
   * ✅ Enhanced Utility metodlar
   */
  getCurrentStep(): number {
    const data = this.getStepperData();
    return data.currentStep || 1;
  }

  hasExistingData(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored !== null;
    } catch {
      return false;
    }
  }

  clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);

    } catch (error) {

    }
  }

  /**
   * ✅ Enhanced Storage bilgileri
   */
  getStorageInfo(): {
    hasData: boolean;
    lastSaved: Date | null;
    daysOld: number;
    isExpiringSoon: boolean;
    dataSize: string;
    version: string;
    sessionId?: string;
    autoSaveCount?: number;
    deviceInfo?: any;
  } {
    try {
      const data = this.getStepperData();

      if (!data.lastSaved) {
        return {
          hasData: false,
          lastSaved: null,
          daysOld: 0,
          isExpiringSoon: false,
          dataSize: '0 B',
          version: this.STORAGE_VERSION
        };
      }

      // Calculate data size
      const serializedData = JSON.stringify(data);
      const dataSize = new Blob([serializedData]).size;

      const lastSaved = new Date(data.lastSaved);
      const now = new Date();
      const daysOld = (now.getTime() - lastSaved.getTime()) / (1000 * 3600 * 24);
      const isExpiringSoon = daysOld > (this.EXPIRY_DAYS - 7);

      return {
        hasData: true,
        lastSaved,
        daysOld: Math.round(daysOld * 10) / 10,
        isExpiringSoon,
        dataSize: this.formatFileSize(dataSize),
        version: data.version || 'Unknown',
        sessionId: data.sessionId,
        autoSaveCount: data.autoSaveHistory?.length || 0,
        deviceInfo: data.deviceInfo
      };
    } catch {
      return {
        hasData: false,
        lastSaved: null,
        daysOld: 0,
        isExpiringSoon: false,
        dataSize: '0 B',
        version: this.STORAGE_VERSION
      };
    }
  }

  /**
   * ✅ Enhanced default data structures
   */
  private createDefaultLoadingStats(): EnhancedLoadingStats {
    return {
      totalPackages: 0,
      packagesLoaded: 0,
      utilizationRate: 0,
      cogScore: 0,
      totalWeight: 0,
      efficiency: 0,
      deletedCount: 0,
      movedCount: 0,
      rotatedCount: 0,
      stackingLayers: 1,
      averagePackageSize: 0,
      weightDistribution: {
        light: 0,
        medium: 0,
        heavy: 0
      }
    };
  }

  private createDefaultAlgorithmStats(): EnhancedAlgorithmStats {
    return {
      executionTime: 0,
      generations: 0,
      bestFitness: 0,
      iterationsCount: 0,
      convergenceRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      optimizationMethod: 'genetic',
      constraintsSatisfied: 0,
      totalConstraints: 0
    };
  }

  private createDefaultPerformanceMetrics(): EnhancedPerformanceMetrics {
    return {
      startTime: 0,
      endTime: 0,
      memoryUsage: 0,
      renderTime: 0,
      frameRate: 60,
      triangleCount: 0,
      drawCalls: 0,
      gpuMemoryUsage: 0
    };
  }

  private getDefaultData(): EnhancedStepperStorageData {
    return {
      step1: {
        order: null,
        orderDetails: [],
        hasFile: false,
        isCompleted: false
      },
      step2: {
        packages: [],
        availableProducts: [],
        isCompleted: false
      },
      step3: {
        optimizationResult: null,
        reportFiles: [],
        loadingStats: this.createDefaultLoadingStats(),
        algorithmStats: this.createDefaultAlgorithmStats(),
        performanceMetrics: this.createDefaultPerformanceMetrics(),
        truckDimension: [13200, 2200, 2900],
        hasResults: false,
        showVisualization: false,
        currentViewType: 'isometric',
        hasThreeJSError: false,
        processedPackages: [],
        timestamp: new Date().toISOString(),
        isCompleted: false
      },
      currentStep: 1,
      lastSaved: new Date().toISOString(),
      version: this.STORAGE_VERSION,
      sessionId: this.sessionId,
      deviceInfo: this.getDeviceInfo(),
      autoSaveHistory: []
    };
  }

  /**
   * ✅ Enhanced helper methods
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDeviceInfo(): void {
    try {
      // Device info is already captured in getDeviceInfo()

    } catch (error) {

    }
  }

  private getDeviceInfo(): any {
    try {
      return {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };
    } catch (error) {
      return {
        userAgent: 'Unknown',
        screenResolution: 'Unknown',
        platform: 'Unknown'
      };
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private isDataExpired(lastSaved: string): boolean {
    try {
      const lastSavedDate = new Date(lastSaved);
      const now = new Date();
      const daysDiff = (now.getTime() - lastSavedDate.getTime()) / (1000 * 3600 * 24);

      return daysDiff > this.EXPIRY_DAYS;
    } catch (error) {
      return true;
    }
  }

  private cleanupExpiredData(): void {
    try {
      const data = this.getStepperData();
      // getStepperData already handles expiry check
    } catch (error) {

      this.clearStorage();
    }
  }

  private cleanupOldData(): void {
    try {
      // Remove old localStorage entries
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('stepper') && key !== this.STORAGE_KEY) {
          localStorage.removeItem(key);
        }
      });

      // Clean up current data
      const data = this.getStepperData();
      if (data.autoSaveHistory && data.autoSaveHistory.length > 10) {
        data.autoSaveHistory = data.autoSaveHistory.slice(-10);
        this.saveStepperData({ autoSaveHistory: data.autoSaveHistory });
      }


    } catch (error) {

    }
  }

  /**
   * ✅ Enhanced debug and maintenance methods
   */
  getAutoSaveHistory(): Array<any> {
    const data = this.getStepperData();
    return data.autoSaveHistory || [];
  }

  clearAutoSaveHistory(): void {
    this.saveStepperData({ autoSaveHistory: [] });
  }

  exportStorageData(): string {
    try {
      const data = this.getStepperData();
      return JSON.stringify(data, null, 2);
    } catch (error) {

      return '';
    }
  }

  importStorageData(jsonData: string): boolean {
    try {
      const importedData = JSON.parse(jsonData);

      if (this.validateStorageData(importedData)) {
        this.saveStepperData(importedData);

        return true;
      } else {

        return false;
      }
    } catch (error) {

      return false;
    }
  }

  /**
   * ✅ Enhanced storage diagnostics
   */
  getDiagnostics(): {
    storageAvailable: boolean;
    totalStorageUsed: number;
    availableSpace: number;
    isQuotaExceeded: boolean;
    lastError?: string;
  } {
    try {
      // Test storage availability
      const testKey = 'storage_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);

      // Calculate storage usage
      let totalUsed = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalUsed += localStorage[key].length;
        }
      }

      return {
        storageAvailable: true,
        totalStorageUsed: totalUsed,
        availableSpace: 5242880 - totalUsed, // 5MB typical limit
        isQuotaExceeded: false
      };
    } catch (error) {
      return {
        storageAvailable: false,
        totalStorageUsed: 0,
        availableSpace: 0,
        isQuotaExceeded: typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'QuotaExceededError',
        lastError: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)
      };
    }
  }
}

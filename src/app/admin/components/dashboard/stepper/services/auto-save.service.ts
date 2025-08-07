import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, merge } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { ToastService } from '../../../../../services/toast.service';

export interface AutoSaveConfig {
  debounceMs: number;
  showNotifications: boolean;
  logActivity: boolean;
  maxHistorySize: number;
}

export interface AutoSaveEvent {
  stepNumber: number;
  data: any;
  timestamp: Date;
  changeType: 'form' | 'drag-drop' | 'user-action' | 'api-response' | 'emergency';
  dataHash?: string; // ✅ Better change detection
}

@Injectable({
  providedIn: 'root'
})
export class AutoSaveService implements OnDestroy {

  private localStorageService = inject(LocalStorageService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>(); // ✅ Memory leak prevention

  // ✅ Separate subjects for each step
  private step1AutoSave$ = new Subject<AutoSaveEvent>();
  private step2AutoSave$ = new Subject<AutoSaveEvent>();
  private step3AutoSave$ = new Subject<AutoSaveEvent>();

  // ✅ Improved configuration
  private config: AutoSaveConfig = {
    debounceMs: 1500, // Daha responsive
    showNotifications: false,
    logActivity: true,
    maxHistorySize: 25 // Daha az memory kullanımı
  };

  // ✅ Activity tracking
  private saveHistory: AutoSaveEvent[] = [];
  private lastSaveTime: Date | null = null;
  private saveInProgress = false;

  constructor() {
    this.setupAutoSaveStreams();
  }

  ngOnDestroy(): void {

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Auto-save stream'lerini setup et (memory safe)
   */
  private setupAutoSaveStreams(): void {
    // Combine all streams for better management
    const allStreams$ = merge(
      this.step1AutoSave$,
      this.step2AutoSave$,
      this.step3AutoSave$
    );

    allStreams$.pipe(
      debounceTime(this.config.debounceMs),
      distinctUntilChanged((prev, curr) => this.isDataEqual(prev, curr)),
      takeUntil(this.destroy$) // ✅ Auto cleanup
    ).subscribe(event => {
      this.performAutoSave(event);
    });

    if (this.config.logActivity) {

    }
  }

  /**
   * ✅ Step auto-save trigger metodları
   */
  triggerStep1AutoSave(data: any, changeType: AutoSaveEvent['changeType'] = 'user-action'): void {
    if (!data || this.saveInProgress) return;

    const event = this.createAutoSaveEvent(1, data, changeType);
    this.step1AutoSave$.next(event);

    this.logActivity(`Step 1 auto-save triggered: ${changeType}`);
  }

  triggerStep2AutoSave(data: any, changeType: AutoSaveEvent['changeType'] = 'user-action'): void {
    if (!data || this.saveInProgress) return;

    const event = this.createAutoSaveEvent(2, data, changeType);
    this.step2AutoSave$.next(event);

    this.logActivity(`Step 2 auto-save triggered: ${changeType}`);
  }

  triggerStep3AutoSave(data: any, changeType: AutoSaveEvent['changeType'] = 'user-action'): void {
    if (!data || this.saveInProgress) return;

    const event = this.createAutoSaveEvent(3, data, changeType);
    this.step3AutoSave$.next(event);

    this.logActivity(`Step 3 auto-save triggered: ${changeType}`);
  }

  /**
   * ✅ AutoSave event oluşturma
   */
  private createAutoSaveEvent(stepNumber: number, data: any, changeType: AutoSaveEvent['changeType']): AutoSaveEvent {
    return {
      stepNumber,
      data,
      timestamp: new Date(),
      changeType,
      dataHash: this.generateDataHash(data)
    };
  }

  /**
   * ✅ Improved data hash generation
   */
  private generateDataHash(data: any): string {
    try {
      const jsonString = JSON.stringify(data, Object.keys(data).sort());
      return btoa(jsonString).substring(0, 16); // Simple hash
    } catch {
      return Date.now().toString();
    }
  }

  /**
   * ✅ Better data equality check
   */
  private isDataEqual(prev: AutoSaveEvent, curr: AutoSaveEvent): boolean {
    // Step farklıysa false
    if (prev.stepNumber !== curr.stepNumber) return false;

    // Hash varsa hash'i karşılaştır
    if (prev.dataHash && curr.dataHash) {
      return prev.dataHash === curr.dataHash;
    }

    // Fallback to JSON comparison
    try {
      return JSON.stringify(prev.data) === JSON.stringify(curr.data);
    } catch {
      return false;
    }
  }

  /**
   * ✅ Actual auto-save operation (improved)
   */
  private async performAutoSave(event: AutoSaveEvent): Promise<void> {
    if (this.saveInProgress) {
      this.logActivity('Save already in progress, skipping...');
      return;
    }

    this.saveInProgress = true;

    try {
      const { stepNumber, data, changeType } = event;

      this.logActivity(`💾 Auto-saving Step ${stepNumber} (${changeType})`);

      // Step-specific save logic
      switch (stepNumber) {
        case 1:
          await this.saveStep1Data(data);
          break;
        case 2:
          await this.saveStep2Data(data);
          break;
        case 3:
          await this.saveStep3Data(data);
          break;
        default:
          throw new Error(`Invalid step number: ${stepNumber}`);
      }

      // Track successful save
      this.trackSuccessfulSave(event);

      this.logActivity(`✅ Step ${stepNumber} auto-save completed`);

    } catch (error) {

      this.handleSaveError(error, event);
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * ✅ Step-specific save metodları
   */
  private async saveStep1Data(data: any): Promise<void> {
    if (data.order && data.orderDetails) {
      this.localStorageService.saveStep1Data(
        data.order,
        data.orderDetails,
        data.hasFile,
        data.fileName
      );
    } else {
      throw new Error('Invalid Step 1 data structure');
    }
  }

  private async saveStep2Data(data: any): Promise<void> {
    if (data.packages && Array.isArray(data.packages)) {
      this.localStorageService.saveStep2Data(data.packages,data.availableProducts);
    } else {
      throw new Error('Invalid Step 2 data structure');
    }
  }

  private async saveStep3Data(data: any): Promise<void> {
    this.localStorageService.saveStep3Data(
      data.optimizationResult,
      data.reportFiles || []
    );
  }

  /**
   * ✅ Successful save tracking
   */
  private trackSuccessfulSave(event: AutoSaveEvent): void {
    this.saveHistory.push(event);
    this.lastSaveTime = new Date();

    // Keep history size under control
    if (this.saveHistory.length > this.config.maxHistorySize) {
      this.saveHistory = this.saveHistory.slice(-this.config.maxHistorySize);
    }

    // Show notification if enabled
    if (this.config.showNotifications) {
      this.toastService.info(`Step ${event.stepNumber} kaydedildi`, 'Auto-Save');
    }
  }

  /**
   * ✅ Error handling
   */
  private handleSaveError(error: any, event: AutoSaveEvent): void {


    if (this.config.showNotifications) {
      this.toastService.warning(`Step ${event.stepNumber} kaydetme hatası`);
    }
  }

  /**
   * ✅ Configuration management
   */
  updateConfig(newConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logActivity('Auto-save config updated');
  }

  setNotifications(enabled: boolean): void {
    this.config.showNotifications = enabled;
  }

  setDebounceTime(ms: number): void {
    if (ms >= 500 && ms <= 10000) {
      this.config.debounceMs = ms;
      this.logActivity(`Debounce time updated: ${ms}ms`);
    }
  }

  /**
   * ✅ Force save (bypass debounce)
   */
  async forceSave(stepNumber: number, data: any): Promise<void> {
    const event = this.createAutoSaveEvent(stepNumber, data, 'user-action');

    this.logActivity(`⚡ Force save triggered for Step ${stepNumber}`);

    try {
      await this.performAutoSave(event);
    } catch (error) {

      throw error;
    }
  }

  /**
   * ✅ Status and statistics
   */
  getSaveStats(): {
    totalSaves: number;
    lastSaveTime: Date | null;
    savesPerStep: { [step: number]: number };
    recentActivity: AutoSaveEvent[];
    isActive: boolean;
  } {
    const savesPerStep = this.saveHistory.reduce((acc, event) => {
      acc[event.stepNumber] = (acc[event.stepNumber] || 0) + 1;
      return acc;
    }, {} as { [step: number]: number });

    return {
      totalSaves: this.saveHistory.length,
      lastSaveTime: this.lastSaveTime,
      savesPerStep,
      recentActivity: this.saveHistory.slice(-5),
      isActive: this.isAutoSaveActive()
    };
  }

  isAutoSaveActive(): boolean {
    if (!this.lastSaveTime) return false;

    const now = new Date();
    const timeDiff = now.getTime() - this.lastSaveTime.getTime();

    return timeDiff < 30000; // Son 30 saniye içinde save varsa active
  }

  clearHistory(): void {
    this.saveHistory = [];
    this.lastSaveTime = null;
    this.logActivity('Auto-save history cleared');
  }

  /**
   * ✅ Utility metodlar
   */
  private logActivity(message: string): void {
    if (this.config.logActivity) {

    }
  }

  // Debug için
  getConfig(): AutoSaveConfig {
    return { ...this.config };
  }
}

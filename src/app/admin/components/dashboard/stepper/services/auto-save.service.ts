// auto-save.service.ts
import { Injectable, inject } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { SessionStorageService } from './session-storage.service';
import { ToastService } from '../../../../../services/toast.service';

export interface AutoSaveConfig {
  debounceMs: number;
  showNotifications: boolean;
  logActivity: boolean;
}

export interface AutoSaveEvent {
  stepNumber: number;
  data: any;
  timestamp: Date;
  changeType: 'form' | 'drag-drop' | 'user-action' | 'api-response';
}

@Injectable({
  providedIn: 'root'
})
export class AutoSaveService {

  private sessionService = inject(SessionStorageService);
  private toastService = inject(ToastService);

  // Auto-save streams for each step
  private step1AutoSave$ = new Subject<AutoSaveEvent>();
  private step2AutoSave$ = new Subject<AutoSaveEvent>();
  private step3AutoSave$ = new Subject<AutoSaveEvent>();

  // Configuration
  private config: AutoSaveConfig = {
    debounceMs: 2000, // 2 saniye bekle
    showNotifications: false, // Sessiz kaydet
    logActivity: true
  };

  // Activity tracking
  private saveHistory: AutoSaveEvent[] = [];
  private lastSaveTime: Date | null = null;

  constructor() {
    this.setupAutoSaveStreams();
  }

  /**
   * Auto-save stream'lerini setup et
   */
  private setupAutoSaveStreams(): void {
    // Step 1 auto-save
    this.step1AutoSave$.pipe(
      debounceTime(this.config.debounceMs),
      distinctUntilChanged((prev, curr) => this.isDataEqual(prev.data, curr.data))
    ).subscribe(event => {
      this.performAutoSave(event);
    });

    // Step 2 auto-save
    this.step2AutoSave$.pipe(
      debounceTime(this.config.debounceMs),
      distinctUntilChanged((prev, curr) => this.isDataEqual(prev.data, curr.data))
    ).subscribe(event => {
      this.performAutoSave(event);
    });

    // Step 3 auto-save
    this.step3AutoSave$.pipe(
      debounceTime(this.config.debounceMs),
      distinctUntilChanged((prev, curr) => this.isDataEqual(prev.data, curr.data))
    ).subscribe(event => {
      this.performAutoSave(event);
    });
  }

  /**
   * Step 1 için auto-save trigger et
   */
  triggerStep1AutoSave(data: any, changeType: AutoSaveEvent['changeType'] = 'user-action'): void {
    const event: AutoSaveEvent = {
      stepNumber: 1,
      data: data,
      timestamp: new Date(),
      changeType
    };

    this.step1AutoSave$.next(event);

    if (this.config.logActivity) {
      console.log('🔄 Step 1 auto-save triggered:', changeType);
    }
  }

  /**
   * Step 2 için auto-save trigger et
   */
  triggerStep2AutoSave(data: any, changeType: AutoSaveEvent['changeType'] = 'user-action'): void {
    const event: AutoSaveEvent = {
      stepNumber: 2,
      data: data,
      timestamp: new Date(),
      changeType
    };

    this.step2AutoSave$.next(event);

    if (this.config.logActivity) {
      console.log('🔄 Step 2 auto-save triggered:', changeType);
    }
  }

  /**
   * Step 3 için auto-save trigger et
   */
  triggerStep3AutoSave(data: any, changeType: AutoSaveEvent['changeType'] = 'user-action'): void {
    const event: AutoSaveEvent = {
      stepNumber: 3,
      data: data,
      timestamp: new Date(),
      changeType
    };

    this.step3AutoSave$.next(event);

    if (this.config.logActivity) {
      console.log('🔄 Step 3 auto-save triggered:', changeType);
    }
  }

  /**
   * Actual auto-save operation
   */
  private performAutoSave(event: AutoSaveEvent): void {
    try {
      const { stepNumber, data, changeType } = event;

      if (this.config.logActivity) {
        console.log(`💾 Auto-saving Step ${stepNumber} (${changeType}):`, data);
      }

      // Step-specific save logic
      switch (stepNumber) {
        case 1:
          if (data.order && data.orderDetails) {
            this.sessionService.saveStep1Data(
              data.order,
              data.orderDetails,
              data.hasFile,
              data.fileName
            );
          }
          break;

        case 2:
          if (data.packages && Array.isArray(data.packages)) {
            this.sessionService.saveStep2Data(data.packages);
          }
          break;

        case 3:
          if (data.optimizationResult || data.reportFiles) {
            this.sessionService.saveStep3Data(
              data.optimizationResult,
              data.reportFiles || []
            );
          }
          break;
      }

      // Track save history
      this.saveHistory.push(event);
      this.lastSaveTime = new Date();

      // Keep only last 50 saves in history
      if (this.saveHistory.length > 50) {
        this.saveHistory = this.saveHistory.slice(-50);
      }

      // Show notification if enabled
      if (this.config.showNotifications) {
        this.toastService.info(`Step ${stepNumber} otomatik kaydedildi`, 'Auto-Save');
      }

      if (this.config.logActivity) {
        console.log(`✅ Step ${stepNumber} auto-save completed`);
      }

    } catch (error) {
      console.error('❌ Auto-save error:', error);

      if (this.config.showNotifications) {
        this.toastService.warning('Otomatik kaydetme hatası');
      }
    }
  }

  /**
   * Data equality check for distinctUntilChanged
   */
  private isDataEqual(prev: any, curr: any): boolean {
    try {
      return JSON.stringify(prev) === JSON.stringify(curr);
    } catch (error) {
      return false; // If can't stringify, assume different
    }
  }

  /**
   * Configuration update
   */
  updateConfig(newConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Auto-save config updated:', this.config);
  }

  /**
   * Enable/disable notifications
   */
  setNotifications(enabled: boolean): void {
    this.config.showNotifications = enabled;
  }

  /**
   * Get save statistics
   */
  getSaveStats(): {
    totalSaves: number;
    lastSaveTime: Date | null;
    savesPerStep: { [step: number]: number };
    recentActivity: AutoSaveEvent[];
  } {
    const savesPerStep = this.saveHistory.reduce((acc, event) => {
      acc[event.stepNumber] = (acc[event.stepNumber] || 0) + 1;
      return acc;
    }, {} as { [step: number]: number });

    return {
      totalSaves: this.saveHistory.length,
      lastSaveTime: this.lastSaveTime,
      savesPerStep,
      recentActivity: this.saveHistory.slice(-10) // Last 10 saves
    };
  }

  /**
   * Clear save history
   */
  clearHistory(): void {
    this.saveHistory = [];
    this.lastSaveTime = null;
    console.log('🗑️ Auto-save history cleared');
  }

  /**
   * Force immediate save (bypass debounce)
   */
  forceSave(stepNumber: number, data: any): void {
    const event: AutoSaveEvent = {
      stepNumber,
      data,
      timestamp: new Date(),
      changeType: 'user-action'
    };

    this.performAutoSave(event);
    console.log(`⚡ Force save executed for Step ${stepNumber}`);
  }

  /**
   * Check if auto-save is active
   */
  isAutoSaveActive(): boolean {
    if (!this.lastSaveTime) return false;

    const now = new Date();
    const timeDiff = now.getTime() - this.lastSaveTime.getTime();

    // If last save was within 10 seconds, consider active
    return timeDiff < 10000;
  }

  /**
   * Get pending save status
   */
  getPendingSaveStatus(): {
    step1Pending: boolean;
    step2Pending: boolean;
    step3Pending: boolean;
  } {
    // This would require more complex tracking, simplified for now
    return {
      step1Pending: false,
      step2Pending: false,
      step3Pending: false
    };
  }
}

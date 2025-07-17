// state-manager.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { SessionStorageService } from './session-storage.service';
import { AutoSaveService } from './auto-save.service';
import { OrderDetail } from '../../../../../models/order-detail.interface';
import { Order } from '../../../../../models/order.interface';

// Generic state interface
interface StepState<T> {
  original: T[];
  current: T[];
  added: T[];
  modified: T[];
  deleted: T[];
  isDirty: boolean;
  lastSaved?: Date;
}

// Step-specific interfaces
interface Step1Data {
  order: Order | null;
  orderDetails: OrderDetail[];
  hasFile: boolean;
  fileName?: string;
}

interface Step2Data {
  packages: any[]; // UiPackage array
}

interface Step3Data {
  optimizationResult: any;
  reportFiles: any[];
}

@Injectable({
  providedIn: 'root'
})
export class StateManager {
  private sessionService = inject(SessionStorageService);
  private autoSaveService = inject(AutoSaveService);

  // Step 1 State - OrderDetails
  private step1State = signal<StepState<OrderDetail>>({
    original: [],
    current: [],
    added: [],
    modified: [],
    deleted: [],
    isDirty: false
  });

  // Step 2 State - Packages
  private step2State = signal<StepState<any>>({
    original: [],
    current: [],
    added: [],
    modified: [],
    deleted: [],
    isDirty: false
  });

  // Step 3 State - Reports
  private step3State = signal<StepState<any>>({
    original: [],
    current: [],
    added: [],
    modified: [],
    deleted: [],
    isDirty: false
  });

  // Additional Step 1 metadata
  private step1Metadata = signal<{
    order: Order | null;
    hasFile: boolean;
    fileName?: string;
  }>({
    order: null,
    hasFile: false
  });

  // Public computed properties
  public step1 = {
    // Order Details state
    state: this.step1State.asReadonly(),

    // Metadata
    order: computed(() => this.step1Metadata().order),
    hasFile: computed(() => this.step1Metadata().hasFile),
    fileName: computed(() => this.step1Metadata().fileName),

    // Computed properties
    isDirty: computed(() => this.step1State().isDirty),
    canSave: computed(() => this.step1State().isDirty && this.step1State().current.length > 0),
    totalItems: computed(() => this.step1State().current.length),

    // Helper methods
    getOriginal: () => this.step1State().original,
    getCurrent: () => this.step1State().current,
    getAdded: () => this.step1State().added,
    getModified: () => this.step1State().modified,
    getDeleted: () => this.step1State().deleted
  };

  public step2 = {
    state: this.step2State.asReadonly(),
    isDirty: computed(() => this.step2State().isDirty),
    canSave: computed(() => this.step2State().isDirty && this.step2State().current.length > 0),
    getOriginal: () => this.step2State().original,
    getCurrent: () => this.step2State().current,
    getAdded: () => this.step2State().added,
    getModified: () => this.step2State().modified,
    getDeleted: () => this.step2State().deleted
  };

  public step3 = {
    state: this.step3State.asReadonly(),
    isDirty: computed(() => this.step3State().isDirty),
    canSave: computed(() => this.step3State().isDirty),
    getOriginal: () => this.step3State().original,
    getCurrent: () => this.step3State().current,
    getAdded: () => this.step3State().added,
    getModified: () => this.step3State().modified,
    getDeleted: () => this.step3State().deleted
  };

  constructor() {
    this.restoreFromSession();
  }

  // ==================== STEP 1 METHODS ====================

  /**
   * Step 1: Initial data set (processFile sonrası)
   */
  initializeStep1(order: Order, orderDetails: OrderDetail[], hasFile: boolean = false, fileName?: string): void {
    console.log('🎯 Step 1 initialize ediliyor:', { order: order.id, detailCount: orderDetails.length });

    // Original state'i set et
    this.step1State.update(state => ({
      ...state,
      original: [...orderDetails],
      current: [...orderDetails],
      added: [],
      modified: [],
      deleted: [],
      isDirty: false,
      lastSaved: new Date()
    }));

    // Metadata'yı set et
    this.step1Metadata.set({
      order,
      hasFile,
      fileName
    });

    // Session'a kaydet
    this.sessionService.saveStep1Data(order, orderDetails, hasFile, fileName);
    console.log('✅ Step 1 initialized');
  }

  /**
   * Step 1: OrderDetail ekle
   */
  addOrderDetail(orderDetail: OrderDetail): void {
    console.log('➕ OrderDetail ekleniyor:', orderDetail.id);

    this.step1State.update(state => {
      const newCurrent = [...state.current, orderDetail];
      const newAdded = [...state.added, orderDetail];

      return {
        ...state,
        current: newCurrent,
        added: newAdded,
        isDirty: true
      };
    });

    this.triggerAutoSave(1, 'user-action');
  }

  /**
   * Step 1: OrderDetail güncelle
   */
  updateOrderDetail(updatedOrderDetail: OrderDetail): void {
    console.log('✏️ OrderDetail güncelleniyor:', updatedOrderDetail.id);

    this.step1State.update(state => {
      const currentIndex = state.current.findIndex(item => item.id === updatedOrderDetail.id);
      if (currentIndex === -1) {
        console.warn('⚠️ Güncellenecek OrderDetail bulunamadı');
        return state;
      }

      const newCurrent = [...state.current];
      newCurrent[currentIndex] = updatedOrderDetail;

      // Modified array'ını güncelle
      const isOriginal = state.original.some(item => item.id === updatedOrderDetail.id);
      const isAlreadyModified = state.modified.some(item => item.id === updatedOrderDetail.id);

      let newModified = [...state.modified];
      if (isOriginal && !isAlreadyModified) {
        newModified.push(updatedOrderDetail);
      } else if (isAlreadyModified) {
        const modifiedIndex = newModified.findIndex(item => item.id === updatedOrderDetail.id);
        newModified[modifiedIndex] = updatedOrderDetail;
      }

      return {
        ...state,
        current: newCurrent,
        modified: newModified,
        isDirty: true
      };
    });

    this.triggerAutoSave(1, 'user-action');
  }

  /**
   * Step 1: OrderDetail sil
   */
  deleteOrderDetail(orderDetailId: string): void {
    console.log('🗑️ OrderDetail siliniyor:', orderDetailId);

    this.step1State.update(state => {
      const currentIndex = state.current.findIndex(item => item.id === orderDetailId);
      if (currentIndex === -1) {
        console.warn('⚠️ Silinecek OrderDetail bulunamadı');
        return state;
      }

      const itemToDelete = state.current[currentIndex];
      const newCurrent = state.current.filter(item => item.id !== orderDetailId);

      // Deleted array'ını güncelle
      const isOriginal = state.original.some(item => item.id === orderDetailId);
      const newDeleted = isOriginal ? [...state.deleted, itemToDelete] : state.deleted;

      // Added array'ından çıkar (eğer yeni eklenmişse)
      const newAdded = state.added.filter(item => item.id !== orderDetailId);

      // Modified array'ından çıkar
      const newModified = state.modified.filter(item => item.id !== orderDetailId);

      return {
        ...state,
        current: newCurrent,
        added: newAdded,
        modified: newModified,
        deleted: newDeleted,
        isDirty: true
      };
    });

    this.triggerAutoSave(1, 'user-action');
  }

  /**
   * Step 1: Changes'i kaydet
   */
  saveStep1Changes(): { added: OrderDetail[], modified: OrderDetail[], deleted: OrderDetail[] } {
    console.log('💾 Step 1 changes kaydediliyor...');

    const currentState = this.step1State();
    const changes = {
      added: currentState.added,
      modified: currentState.modified,
      deleted: currentState.deleted
    };

    console.log('📊 Step 1 Changes:', {
      added: changes.added.length,
      modified: changes.modified.length,
      deleted: changes.deleted.length
    });

    return changes;
  }

  /**
   * Step 1: Save işlemi tamamlandı
   */
  markStep1AsSaved(): void {
    console.log('✅ Step 1 saved olarak işaretleniyor');

    this.step1State.update(state => ({
      ...state,
      original: [...state.current], // Current state'i yeni original yap
      added: [],
      modified: [],
      deleted: [],
      isDirty: false,
      lastSaved: new Date()
    }));

    // Session'ı güncelle
    const order = this.step1Metadata().order;
    const orderDetails = this.step1State().current;
    const hasFile = this.step1Metadata().hasFile;
    const fileName = this.step1Metadata().fileName;

    if (order) {
      this.sessionService.saveStep1Data(order, orderDetails, hasFile, fileName);
    }
  }

  // ==================== STEP 2 METHODS ====================

  /**
   * Step 2: Initialize
   */
  initializeStep2(packages: any[]): void {
    console.log('🎯 Step 2 initialize ediliyor:', { packageCount: packages.length });

    this.step2State.update(state => ({
      ...state,
      original: [...packages],
      current: [...packages],
      added: [],
      modified: [],
      deleted: [],
      isDirty: false,
      lastSaved: new Date()
    }));

    this.sessionService.saveStep2Data(packages);
    console.log('✅ Step 2 initialized');
  }

  /**
   * Step 2: Package ekle
   */
  addPackage(packageItem: any): void {
    console.log('➕ Package ekleniyor:', packageItem.id);

    this.step2State.update(state => {
      const newCurrent = [...state.current, packageItem];
      const newAdded = [...state.added, packageItem];

      return {
        ...state,
        current: newCurrent,
        added: newAdded,
        isDirty: true
      };
    });

    this.triggerAutoSave(2, 'user-action');
  }

  /**
   * Step 2: Package güncelle
   */
  updatePackage(updatedPackage: any): void {
    console.log('✏️ Package güncelleniyor:', updatedPackage.id);

    this.step2State.update(state => {
      const currentIndex = state.current.findIndex(item => item.id === updatedPackage.id);
      if (currentIndex === -1) return state;

      const newCurrent = [...state.current];
      newCurrent[currentIndex] = updatedPackage;

      const isOriginal = state.original.some(item => item.id === updatedPackage.id);
      const isAlreadyModified = state.modified.some(item => item.id === updatedPackage.id);

      let newModified = [...state.modified];
      if (isOriginal && !isAlreadyModified) {
        newModified.push(updatedPackage);
      } else if (isAlreadyModified) {
        const modifiedIndex = newModified.findIndex(item => item.id === updatedPackage.id);
        newModified[modifiedIndex] = updatedPackage;
      }

      return {
        ...state,
        current: newCurrent,
        modified: newModified,
        isDirty: true
      };
    });

    this.triggerAutoSave(2, 'user-action');
  }

  /**
   * Step 2: Package sil
   */
  deletePackage(packageId: string): void {
    console.log('🗑️ Package siliniyor:', packageId);

    this.step2State.update(state => {
      const currentIndex = state.current.findIndex(item => item.id === packageId);
      if (currentIndex === -1) return state;

      const itemToDelete = state.current[currentIndex];
      const newCurrent = state.current.filter(item => item.id !== packageId);

      const isOriginal = state.original.some(item => item.id === packageId);
      const newDeleted = isOriginal ? [...state.deleted, itemToDelete] : state.deleted;
      const newAdded = state.added.filter(item => item.id !== packageId);
      const newModified = state.modified.filter(item => item.id !== packageId);

      return {
        ...state,
        current: newCurrent,
        added: newAdded,
        modified: newModified,
        deleted: newDeleted,
        isDirty: true
      };
    });

    this.triggerAutoSave(2, 'user-action');
  }

  /**
   * Step 2: Changes'i kaydet
   */
  saveStep2Changes(): { added: any[], modified: any[], deleted: any[] } {
    const currentState = this.step2State();
    return {
      added: currentState.added,
      modified: currentState.modified,
      deleted: currentState.deleted
    };
  }

  /**
   * Step 2: Save işlemi tamamlandı
   */
  markStep2AsSaved(): void {
    console.log('✅ Step 2 saved olarak işaretleniyor');

    this.step2State.update(state => ({
      ...state,
      original: [...state.current],
      added: [],
      modified: [],
      deleted: [],
      isDirty: false,
      lastSaved: new Date()
    }));

    this.sessionService.saveStep2Data(this.step2State().current);
  }

  // ==================== STEP 3 METHODS ====================

  /**
   * Step 3: Initialize
   */
  initializeStep3(optimizationResult: any, reportFiles: any[] = []): void {
    console.log('🎯 Step 3 initialize ediliyor');

    this.step3State.update(state => ({
      ...state,
      original: [...reportFiles],
      current: [...reportFiles],
      added: [],
      modified: [],
      deleted: [],
      isDirty: false,
      lastSaved: new Date()
    }));

    this.sessionService.saveStep3Data(optimizationResult, reportFiles);
    console.log('✅ Step 3 initialized');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Auto-save trigger
   */
  private triggerAutoSave(stepNumber: number, changeType: 'form' | 'user-action' | 'api-response' = 'user-action'): void {
    let data: any;

    switch (stepNumber) {
      case 1:
        data = {
          order: this.step1Metadata().order,
          orderDetails: this.step1State().current,
          hasFile: this.step1Metadata().hasFile,
          fileName: this.step1Metadata().fileName
        };
        this.autoSaveService.triggerStep1AutoSave(data, changeType);
        break;
      case 2:
        data = { packages: this.step2State().current };
        this.autoSaveService.triggerStep2AutoSave(data, changeType);
        break;
      case 3:
        data = {
          optimizationResult: null, // Bu değer başka yerden gelecek
          reportFiles: this.step3State().current
        };
        this.autoSaveService.triggerStep3AutoSave(data, changeType);
        break;
    }
  }

  /**
   * Session'dan restore
   */
  private restoreFromSession(): void {
    console.log('📖 StateManager session restore ediliyor...');

    // Step 1 restore
    const step1Data = this.sessionService.restoreStep1Data();
    if (step1Data?.order && step1Data?.orderDetails) {
      this.initializeStep1(step1Data.order, step1Data.orderDetails, step1Data.hasFile, step1Data.fileName);
    }

    // Step 2 restore
    const step2Data = this.sessionService.restoreStep2Data();
    if (step2Data && step2Data.length > 0) {
      this.initializeStep2(step2Data);
    }

    // Step 3 restore
    const step3Data = this.sessionService.restoreStep3Data();
    if (step3Data) {
      this.initializeStep3(step3Data.optimizationResult, step3Data.reportFiles);
    }
  }

  /**
   * Tüm state'i reset et
   */
  resetAllStates(): void {
    console.log('🔄 Tüm stateler reset ediliyor...');

    this.step1State.set({
      original: [],
      current: [],
      added: [],
      modified: [],
      deleted: [],
      isDirty: false
    });

    this.step1Metadata.set({
      order: null,
      hasFile: false
    });

    this.step2State.set({
      original: [],
      current: [],
      added: [],
      modified: [],
      deleted: [],
      isDirty: false
    });

    this.step3State.set({
      original: [],
      current: [],
      added: [],
      modified: [],
      deleted: [],
      isDirty: false
    });

    this.sessionService.clearSession();
    console.log('✅ Tüm stateler reset edildi');
  }

  /**
   * Debug bilgileri
   */
  logDebugInfo(): void {
    console.log('📊 StateManager Debug Info:');
    console.log('Step 1:', {
      original: this.step1State().original.length,
      current: this.step1State().current.length,
      added: this.step1State().added.length,
      modified: this.step1State().modified.length,
      deleted: this.step1State().deleted.length,
      isDirty: this.step1State().isDirty
    });
    console.log('Step 2:', {
      original: this.step2State().original.length,
      current: this.step2State().current.length,
      isDirty: this.step2State().isDirty
    });
    console.log('Step 3:', {
      original: this.step3State().original.length,
      current: this.step3State().current.length,
      isDirty: this.step3State().isDirty
    });
  }
}

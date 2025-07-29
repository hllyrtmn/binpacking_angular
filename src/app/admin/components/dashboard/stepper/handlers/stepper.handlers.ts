// ==========================================
// FIXED: Handler Classes with Injection Tokens
// ==========================================

import { Injectable, Inject } from '@angular/core';
import { BaseComponentManager, BaseStepperHandler, ComponentType, IActivityTracker, IErrorHandler, INotificationService, isConfigurableComponent, isResettableComponent, IStepManager, IStepperConfig, IStepValidator, IStorageInfo, IStorageManager, NOTIFICATION_SERVICE_TOKEN, STEP_MANAGER_TOKEN, STEPPER_CONFIG, STORAGE_MANAGER_TOKEN } from '../interfaces/stepper.interface';
// ✅ 1. FIXED: Step Validation Handler (SRP - Single Responsibility)
@Injectable({
  providedIn: 'root'
})
export class StepValidationHandler extends BaseStepperHandler implements IStepValidator {
  protected serviceName = 'StepValidationHandler';

  constructor(
    @Inject(STEP_MANAGER_TOKEN) private stepManager: IStepManager
  ) {
    super();
  }

  // ✅ FIXED: Override modifier eklendi
  protected override handleError(error: any, method: string): void {
    console.error(`❌ ${this.serviceName}.${method} error:`, error);
  }

  isCompleted(stepIndex: number): boolean {
    try {
      if (!this.validateStepIndex(stepIndex)) {
        return false;
      }

      if (!this.validateService(this.stepManager, 'StepManager')) {
        return false;
      }

      // Delegate to step manager with safe access
      const steps = (this.stepManager as any).steps;
      if (!steps || !steps[stepIndex]) {
        console.warn(`⚠️ Step ${stepIndex} not found`);
        return false;
      }

      const step = steps[stepIndex];
      return step.completed?.() || false;

    } catch (error) {
      this.handleError(error, 'isCompleted');
      return false;
    }
  }

  isEditable(stepIndex: number): boolean {
    try {
      if (!this.validateStepIndex(stepIndex)) {
        return stepIndex === 0; // Safe default: first step always editable
      }

      if (!this.validateService(this.stepManager, 'StepManager')) {
        return stepIndex === 0;
      }

      const steps = (this.stepManager as any).steps;
      if (!steps || !steps[stepIndex]) {
        return stepIndex === 0;
      }

      const step = steps[stepIndex];
      return step.editable?.() || false;

    } catch (error) {
      this.handleError(error, 'isEditable');
      return stepIndex === 0; // Safe fallback
    }
  }

  isDirty(stepIndex: number): boolean {
    try {
      if (!this.validateStepIndex(stepIndex) || !this.validateService(this.stepManager, 'StepManager')) {
        return false;
      }

      const steps = (this.stepManager as any).steps;
      if (!steps || !steps[stepIndex]) {
        return false;
      }

      const step = steps[stepIndex];
      return step.is_dirty?.() || false;

    } catch (error) {
      this.handleError(error, 'isDirty');
      return false;
    }
  }

  private validateStepIndex(stepIndex: number): boolean {
    if (typeof stepIndex !== 'number' || stepIndex < 0 || stepIndex >= STEPPER_CONFIG.MAX_STEPS) {
      console.warn(`⚠️ Invalid step index: ${stepIndex}`);
      return false;
    }
    return true;
  }
}

// ✅ 2. FIXED: Storage Management Handler (SRP)
@Injectable({
  providedIn: 'root'
})
export class StorageHandler extends BaseStepperHandler implements IStorageManager {
  protected serviceName = 'StorageHandler';

  constructor(
    // ✅ FIXED: LocalStorageService'i direkt inject ediyoruz (legacy uyumluluk için)
    @Inject('LocalStorageService') private localStorage: any
  ) {
    super();
  }

  // ✅ FIXED: Override modifier eklendi
  protected override handleError(error: any, method: string): void {
    console.error(`❌ ${this.serviceName}.${method} error:`, error);
  }

  hasExistingData(): boolean {
    try {
      if (!this.validateService(this.localStorage, 'LocalStorageService')) {
        return false;
      }

      return this.localStorage.hasExistingData?.() || false;
    } catch (error) {
      this.handleError(error, 'hasExistingData');
      return false;
    }
  }

  getCurrentStep(): number {
    try {
      if (!this.validateService(this.localStorage, 'LocalStorageService')) {
        return 1; // Safe default
      }

      const step = this.localStorage.getCurrentStep?.();

      // Validate step number
      if (typeof step !== 'number' || step < 1 || step > STEPPER_CONFIG.MAX_STEPS) {
        console.warn(`⚠️ Invalid current step: ${step}`);
        return 1;
      }

      return step;
    } catch (error) {
      this.handleError(error, 'getCurrentStep');
      return 1;
    }
  }

  isStepCompleted(stepIndex: number): boolean {
    try {
      if (!this.validateService(this.localStorage, 'LocalStorageService')) {
        return false;
      }

      return this.localStorage.isStepCompleted?.(stepIndex) || false;
    } catch (error) {
      this.handleError(error, 'isStepCompleted');
      return false;
    }
  }

  getStorageInfo(): IStorageInfo {
    try {
      if (!this.validateService(this.localStorage, 'LocalStorageService')) {
        return this.getDefaultStorageInfo();
      }

      const info = this.localStorage.getStorageInfo?.();
      return info || this.getDefaultStorageInfo();
    } catch (error) {
      this.handleError(error, 'getStorageInfo');
      return this.getDefaultStorageInfo();
    }
  }

  clearStorage(): void {
    try {
      if (!this.validateService(this.localStorage, 'LocalStorageService')) {
        return;
      }

      this.localStorage.clearStorage?.();
      this.logAction('clearStorage', 'Storage cleared successfully');
    } catch (error) {
      this.handleError(error, 'clearStorage');
    }
  }

  private getDefaultStorageInfo(): IStorageInfo {
    return {
      hasData: false,
      isExpiringSoon: false,
      currentStep: 1,
      lastActivity: new Date()
    };
  }
}

// ✅ 3. FIXED: Activity Tracking Handler (SRP)
@Injectable({
  providedIn: 'root'
})
export class ActivityTrackingHandler extends BaseStepperHandler implements IActivityTracker {
  protected serviceName = 'ActivityTrackingHandler';

  private intervalId?: number;
  private eventListeners: Array<{ event: string, handler: EventListener }> = [];
  private isTracking = false;

  constructor(
    @Inject(STORAGE_MANAGER_TOKEN) private storageManager: IStorageManager,
    // ✅ FIXED: Config'i direkt inject ediyoruz
    @Inject('StepperConfig') private config: IStepperConfig
  ) {
    super();
  }

  // ✅ FIXED: Override modifier eklendi
  protected override handleError(error: any, method: string): void {
    console.error(`❌ ${this.serviceName}.${method} error:`, error);
  }

  startTracking(): void {
    try {
      if (this.isTracking) {
        console.warn('⚠️ Activity tracking already started');
        return;
      }

      this.setupIntervalTracking();
      this.setupEventTracking();
      this.isTracking = true;

      this.logAction('startTracking', 'Activity tracking started');
    } catch (error) {
      this.handleError(error, 'startTracking');
    }
  }

  stopTracking(): void {
    try {
      this.clearIntervalTracking();
      this.clearEventTracking();
      this.isTracking = false;

      this.logAction('stopTracking', 'Activity tracking stopped');
    } catch (error) {
      this.handleError(error, 'stopTracking');
    }
  }

  refreshActivity(): void {
    try {
      if (!this.storageManager.hasExistingData()) {
        return;
      }

      // Refresh activity timestamp
      this.logAction('refreshActivity', 'Activity refreshed');
    } catch (error) {
      this.handleError(error, 'refreshActivity');
    }
  }

  private setupIntervalTracking(): void {
    if (!this.config.enableActivityTracking) {
      return;
    }

    this.intervalId = window.setInterval(() => {
      this.refreshActivity();
    }, this.config.activityRefreshInterval || STEPPER_CONFIG.DEFAULT_ACTIVITY_INTERVAL);
  }

  private setupEventTracking(): void {
    const activityHandler = () => this.refreshActivity();
    const events = ['click', 'keypress', 'scroll'];
    const options = { passive: true };

    events.forEach(eventType => {
      try {
        document.addEventListener(eventType, activityHandler, options);
        this.eventListeners.push({ event: eventType, handler: activityHandler });
      } catch (error) {
        console.error(`❌ Event listener setup error for ${eventType}:`, error);
      }
    });
  }

  private clearIntervalTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private clearEventTracking(): void {
    this.eventListeners.forEach(({ event, handler }) => {
      try {
        document.removeEventListener(event, handler);
      } catch (error) {
        console.error(`❌ Event listener cleanup error for ${event}:`, error);
      }
    });
    this.eventListeners = [];
  }
}

// ✅ 4. FIXED: Error Handling Handler (SRP)
@Injectable({
  providedIn: 'root'
})
export class ErrorHandler extends BaseStepperHandler implements IErrorHandler {
  protected serviceName = 'ErrorHandler';

  constructor(
    @Inject(NOTIFICATION_SERVICE_TOKEN) private notificationService: INotificationService,
    @Inject(STORAGE_MANAGER_TOKEN) private storageManager: IStorageManager,
    @Inject(STEP_MANAGER_TOKEN) private stepManager: IStepManager
  ) {
    super();
  }

  // ✅ FIXED: Override modifier eklendi
  protected override handleError(error: any, method: string): void {
    console.error(`❌ ${this.serviceName}.${method} error:`, error);
  }

  handleErrors(error: any, context: string): void {
    const errorId = this.generateErrorId();

    console.error(`❌ [${errorId}] Error in ${context}:`, error);

    // Log additional context
    console.error(`Context details:`, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Don't show every error to user, only critical ones
    if (this.isCriticalError(error, context)) {
      this.notificationService.error(`Sistem hatası oluştu. Hata ID: ${errorId}`);
    }
  }

  handleInitializationError(): void {
    try {
      this.logAction('handleInitializationError', 'Attempting fallback initialization');

      // Try to reset services
      this.attemptServiceReset();

      // Show user notification
      this.notificationService.warning('Sistem başlatılırken bir sorun oluştu. Sayfa yeniden yüklenecek.');

      // Schedule page reload as last resort
      setTimeout(() => {
        window.location.reload();
      }, STEPPER_CONFIG.RELOAD_DELAY);

    } catch (error) {
      this.handleError(error, 'handleInitializationError');

      // Force immediate reload if fallback fails
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  private attemptServiceReset(): void {
    try {
      if (this.stepManager?.resetStepper) {
        this.stepManager.resetStepper();
      }
    } catch (error) {
      console.error('❌ StepManager reset failed:', error);
    }

    try {
      if (this.storageManager?.clearStorage) {
        this.storageManager.clearStorage();
      }
    } catch (error) {
      console.error('❌ StorageManager clear failed:', error);
    }
  }

  private isCriticalError(error: any, context: string): boolean {
    const criticalContexts = ['initialization', 'serviceHealth', 'navigation'];
    return criticalContexts.some(ctx => context.toLowerCase().includes(ctx));
  }

  private generateErrorId(): string {
    return `ERR_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ✅ 5. FIXED: Component Management Handler (SRP) - Safe Implementation
@Injectable({
  providedIn: 'root'
})
export class ComponentManager extends BaseComponentManager {
  protected serviceName = 'ComponentManager';

  private componentRefs = new Map<ComponentType, any>();

  // ✅ FIXED: Override modifier eklendi
  protected override handleError(error: any, method: string): void {
    console.error(`❌ ${this.serviceName}.${method} error:`, error);
  }

  // ✅ FIXED: Güvenli component registration - interface kontrolü yapmıyor
  registerComponent(type: ComponentType, component: any): void {
    this.componentRefs.set(type, component);
    this.logAction('registerComponent', `${type} registered`);
  }

  resetAllComponents(): void {
    try {
      this.logAction('resetAllComponents', 'Starting component reset');

      for (const [type, component] of this.componentRefs) {
        try {
          // ✅ FIXED: Güvenli reset - sadece method varsa çağır
          if (component && isResettableComponent(component)) {
            component.resetComponentState();
            this.logAction('resetComponent', `${type} reset successful`);
          } else {
            console.warn(`⚠️ Component ${type} is not resettable`);
          }
        } catch (error) {
          this.handleError(error, `resetComponent_${type}`);
        }
      }

      this.logAction('resetAllComponents', 'Component reset completed');
    } catch (error) {
      this.handleError(error, 'resetAllComponents');
    }
  }

  configureComponent(componentName: string): void {
    try {
      const type = componentName as ComponentType;
      const component = this.componentRefs.get(type);

      if (!component) {
        console.warn(`⚠️ Component ${componentName} not found`);
        return;
      }

      // ✅ FIXED: Güvenli configure - sadece method varsa çağır
      if (isConfigurableComponent(component)) {
        component.configureComponent();
        this.logAction('configureComponent', `${componentName} configured`);
      } else {
        console.warn(`⚠️ Component ${componentName} is not configurable`);
      }
    } catch (error) {
      this.handleError(error, 'configureComponent');
    }
  }

  getComponent<T>(type: ComponentType): T | undefined {
    return this.componentRefs.get(type) as T;
  }
}

// ✅ 6. FIXED: Service Health Checker (SRP)
@Injectable({
  providedIn: 'root'
})
export class ServiceHealthChecker extends BaseStepperHandler {
  protected serviceName = 'ServiceHealthChecker';

  // ✅ FIXED: Override modifier eklendi
  protected override handleError(error: any, method: string): void {
    console.error(`❌ ${this.serviceName}.${method} error:`, error);
  }

  checkAllServices(services: Array<{ name: string, service: any }>): boolean {
    try {
      this.logAction('checkAllServices', 'Starting health check');

      let allHealthy = true;

      for (const { name, service } of services) {
        const isHealthy = this.checkSingleService(name, service);
        if (!isHealthy) {
          allHealthy = false;
        }
      }

      this.logAction('checkAllServices', `Health check completed. All healthy: ${allHealthy}`);
      return allHealthy;

    } catch (error) {
      this.handleError(error, 'checkAllServices');
      return false;
    }
  }

  private checkSingleService(name: string, service: any): boolean {
    if (!service) {
      console.error(`❌ ${name} injection failed`);
      return false;
    }

    // Check if service has health check method
    if (typeof service.isHealthy === 'function') {
      const isHealthy = service.isHealthy();
      if (!isHealthy) {
        console.error(`❌ ${name} is not healthy`);
        return false;
      }
    }

    console.log(`✅ ${name} is healthy`);
    return true;
  }
}

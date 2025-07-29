// ==========================================
// FIXED: Interfaces with Injection Tokens
// ==========================================

import { InjectionToken } from '@angular/core';

// ✅ 1. Core Interfaces (ISP - Interface Segregation Principle)

export interface IStepValidator {
  isCompleted(stepIndex: number): boolean;
  isEditable(stepIndex: number): boolean;
  isDirty(stepIndex: number): boolean;
}

export interface IStorageManager {
  hasExistingData(): boolean;
  getCurrentStep(): number;
  isStepCompleted(stepIndex: number): boolean;
  getStorageInfo(): IStorageInfo;
  clearStorage(): void;
}

export interface IActivityTracker {
  startTracking(): void;
  stopTracking(): void;
  refreshActivity(): void;
}

export interface IStepManager {
  setStepStatus(stepIndex: number, status: string, completed: boolean): void;
  resetStepper(): void;
  isHealthy(): boolean;
  logStatus(): void;
}

export interface IErrorHandler {
  handleErrors(error: any, context: string): void;
  handleInitializationError(): void;
}

export interface INotificationService {
  warning(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

// ✅ FIXED: Injection Tokens for Angular DI
export const STEP_MANAGER_TOKEN = new InjectionToken<IStepManager>('StepManager');
export const STORAGE_MANAGER_TOKEN = new InjectionToken<IStorageManager>('StorageManager');
export const ACTIVITY_TRACKER_TOKEN = new InjectionToken<IActivityTracker>('ActivityTracker');
export const ERROR_HANDLER_TOKEN = new InjectionToken<IErrorHandler>('ErrorHandler');
export const NOTIFICATION_SERVICE_TOKEN = new InjectionToken<INotificationService>('NotificationService');
export const STEP_VALIDATOR_TOKEN = new InjectionToken<IStepValidator>('StepValidator');

// ✅ 2. Data Transfer Objects (Value Objects)

export interface IStorageInfo {
  hasData: boolean;
  isExpiringSoon: boolean;
  currentStep: number;
  lastActivity: Date;
}

export interface IStepState {
  index: number;
  completed: boolean;
  editable: boolean;
  dirty: boolean;
  label: string;
}

export interface IStepperConfig {
  enableActivityTracking: boolean;
  activityRefreshInterval: number;
  enableAutoSave: boolean;
  enableLinearMode: boolean;
}

// ✅ 3. Event Interfaces

export interface IStepChangeEvent {
  previousIndex: number;
  selectedIndex: number;
  timestamp: Date;
}

export interface IComponentStateEvent {
  componentName: string;
  action: 'reset' | 'configure' | 'upload' | 'complete';
  data?: any;
}

// ✅ 4. Component Interfaces (OPTIONAL - Güvenli Implementation için)

export interface IResettableComponent {
  resetComponentState(): void;
}

export interface IConfigurableComponent {
  configureComponent(): void;
}

export interface IUploadComponent extends IResettableComponent {
  uploadCompleted: boolean;
}

// ✅ 5. FIXED: Abstract Base Classes (Template Method Pattern)

export abstract class BaseStepperHandler {
  protected abstract serviceName: string;

  // ✅ FIXED: Abstract method tanımlaması
  protected abstract handleError(error: any, method: string): void;

  protected logAction(action: string, data?: any): void {
    console.log(`🔄 ${this.serviceName}.${action}`, data || '');
  }

  protected validateService<T>(service: T, serviceName: string): boolean {
    if (!service) {
      console.error(`❌ ${serviceName} is not available`);
      return false;
    }
    return true;
  }
}

export abstract class BaseComponentManager extends BaseStepperHandler {
  abstract resetAllComponents(): void;
  abstract configureComponent(componentName: string): void;
}

// ✅ 6. Factory Interface

export interface IStepperServiceFactory {
  createStepValidator(): IStepValidator;
  createStorageManager(): IStorageManager;
  createActivityTracker(): IActivityTracker;
  createErrorHandler(): IErrorHandler;
}

// ✅ 7. Observer Pattern Interfaces

export interface IStepperObserver {
  onStepChange(event: IStepChangeEvent): void;
  onComponentStateChange(event: IComponentStateEvent): void;
}

export interface IStepperSubject {
  addObserver(observer: IStepperObserver): void;
  removeObserver(observer: IStepperObserver): void;
  notifyStepChange(event: IStepChangeEvent): void;
  notifyComponentStateChange(event: IComponentStateEvent): void;
}

// ✅ 8. Strategy Pattern Interfaces

export interface IInitializationStrategy {
  initialize(): Promise<void>;
  canHandle(context: any): boolean;
}

export interface IResetStrategy {
  reset(): Promise<void>;
  canHandle(context: any): boolean;
}

// ✅ 9. Enums ve Constants

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export enum ComponentType {
  INVOICE_UPLOAD = 'invoice-upload',
  PALLET_CONTROL = 'pallet-control',
  RESULT_STEP = 'result-step'
}

export const STEPPER_CONFIG = {
  DEFAULT_ACTIVITY_INTERVAL: 5 * 60 * 1000, // 5 dakika
  MAX_STEPS: 3,
  NAVIGATION_DELAY: 100,
  RESET_DELAY: 500,
  RELOAD_DELAY: 2000
} as const;

// ✅ 10. Safe Component Type Checking (Runtime Guards)

export function isResettableComponent(component: any): component is IResettableComponent {
  return component && typeof component.resetComponentState === 'function';
}

export function isConfigurableComponent(component: any): component is IConfigurableComponent {
  return component && typeof component.configureComponent === 'function';
}

export function isUploadComponent(component: any): component is IUploadComponent {
  return isResettableComponent(component) &&
         'uploadCompleted' in component &&
         typeof component.uploadCompleted === 'boolean';
}

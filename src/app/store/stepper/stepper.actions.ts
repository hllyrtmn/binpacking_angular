import { createAction, props } from '@ngrx/store';

// Navigation Actions
export const navigateToStep = createAction(
  '[Stepper] Navigate To Step',
  props<{ stepIndex: number }>()
);

export const setStepCompleted = createAction(
  '[Stepper] Set Step Completed',
  props<{ stepIndex: number }>()
);

export const setStepValidation = createAction(
  '[Stepper] Set Step Validation',
  props<{ stepIndex: number; isValid: boolean }>()
);

// Edit Mode Actions
export const enableEditMode = createAction(
  '[Stepper] Enable Edit Mode',
  props<{ orderId: string }>()
);

export const disableEditMode = createAction(
  '[Stepper] Disable Edit Mode'
);

// Step Data Actions (geçici veri saklama için)
export const setStepData = createAction(
  '[Stepper] Set Step Data',
  props<{ stepNumber: number; data: any }>()
);

export const clearStepData = createAction(
  '[Stepper] Clear Step Data',
  props<{ stepNumber?: number }>() // stepNumber yoksa tümünü temizle
);

// Reset Actions
export const resetStepper = createAction(
  '[Stepper] Reset Stepper'
);

// Loading & Error Actions
export const setStepperLoading = createAction(
  '[Stepper] Set Loading',
  props<{ loading: boolean }>()
);

export const setStepperError = createAction(
  '[Stepper] Set Error',
  props<{ error: string | null }>()
);

// Initialization Action
export const initializeStepper = createAction(
  '[Stepper] Initialize Stepper',
  props<{ editMode?: boolean; editOrderId?: string }>()
);

// Auto-Save Actions (dosyanın sonuna ekleyin)

// Auto-save trigger actions
export const triggerAutoSave = createAction(
  '[Auto-Save] Trigger Auto Save',
  props<{ stepNumber: number; data: any; changeType:  'emergency' | 'data-change' |'drag-drop' | 'form' | 'user-action' | 'api-response' | 'form-change' }>()
);

export const performAutoSave = createAction(
  '[Auto-Save] Perform Auto Save',
  props<{ stepNumber: number; data: any }>()
);

export const autoSaveSuccess = createAction(
  '[Auto-Save] Auto Save Success',
  props<{ stepNumber: number; timestamp: Date }>()
);

export const autoSaveFailure = createAction(
  '[Auto-Save] Auto Save Failure',
  props<{ stepNumber: number; error: string }>()
);

// Auto-save status actions
export const setAutoSaveStatus = createAction(
  '[Auto-Save] Set Auto Save Status',
  props<{ stepNumber: number; status: 'idle' | 'saving' | 'saved' | 'error' }>()
);

export const clearAutoSaveStatus = createAction(
  '[Auto-Save] Clear Auto Save Status',
  props<{ stepNumber: number }>()
);

// Force save action (manuel kaydetme için)
export const forceSave = createAction(
  '[Auto-Save] Force Save',
  props<{ stepNumber: number; data: any }>()
);

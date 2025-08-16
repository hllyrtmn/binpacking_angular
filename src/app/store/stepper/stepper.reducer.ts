import { createReducer, on } from '@ngrx/store';
import { StepperState, initialStepperState } from './stepper.state';
import * as StepperActions from './stepper.actions';

export const stepperReducer = createReducer(
  initialStepperState,

  // Navigation
  on(StepperActions.navigateToStep, (state, { stepIndex }) => ({
    ...state,
    currentStep: stepIndex,
    error: null
  })),

  on(StepperActions.setStepCompleted, (state, { stepIndex }) => {
    const newCompletedSteps = state.completedSteps.includes(stepIndex)
      ? state.completedSteps
      : [...state.completedSteps, stepIndex];

    const newAvailableSteps = [...state.availableSteps];
    // Bir sonraki step'i available yap
    if (stepIndex + 1 <= 2 && !newAvailableSteps.includes(stepIndex + 1)) {
      newAvailableSteps.push(stepIndex + 1);
    }

    return {
      ...state,
      completedSteps: newCompletedSteps,
      availableSteps: newAvailableSteps.sort()
    };
  }),

  on(StepperActions.setStepValidation, (state, { stepIndex, isValid }) => ({
    ...state,
    stepValidations: {
      ...state.stepValidations,
      [stepIndex]: isValid
    }
  })),

  // Edit Mode
  on(StepperActions.enableEditMode, (state, { orderId }) => ({
    ...state,
    isEditMode: true,
    editOrderId: orderId,
    // Edit mode'da tüm step'ler available
    availableSteps: [0, 1, 2],
    completedSteps: [0, 1, 2] // Edit mode'da tüm step'ler completed sayılır
  })),

  on(StepperActions.disableEditMode, (state) => ({
    ...state,
    isEditMode: false,
    editOrderId: null
  })),

  // Step Data
  on(StepperActions.setStepData, (state, { stepNumber, data }) => ({
    ...state,
    stepData: {
      ...state.stepData,
      [`step${stepNumber + 1}`]: data
    }
  })),

  on(StepperActions.clearStepData, (state, { stepNumber }) => {
    if (stepNumber !== undefined) {
      const newStepData = { ...state.stepData };
      delete newStepData[`step${stepNumber + 1}` as keyof typeof newStepData];
      return {
        ...state,
        stepData: newStepData
      };
    }

    // Tüm step data'yı temizle
    return {
      ...state,
      stepData: {}
    };
  }),

  // Reset & Initialize
  on(StepperActions.resetStepper, () => ({
    ...initialStepperState
  })),

  on(StepperActions.initializeStepper, (state, { editMode, editOrderId }) => ({
    ...state,
    isEditMode: editMode || false,
    editOrderId: editOrderId || null,
    availableSteps: editMode ? [0, 1, 2] : [0],
    completedSteps: editMode ? [0, 1, 2] : [],
    error: null
  })),

  // Loading & Error
  on(StepperActions.setStepperLoading, (state, { loading }) => ({
    ...state,
    loading
  })),

  on(StepperActions.setStepperError, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  // Auto-save trigger - status'u saving yap
  on(StepperActions.triggerAutoSave, (state, { stepNumber }) => ({
    ...state,
    autoSave: {
      ...state.autoSave,
      [stepNumber]: {
        ...state.autoSave[stepNumber],
        status: 'saving' as const,
        pendingChanges: true,
        error: null
      }
    }
  })),

  // Auto-save perform - actual save işlemi başladı
  on(StepperActions.performAutoSave, (state, { stepNumber }) => ({
    ...state,
    autoSave: {
      ...state.autoSave,
      [stepNumber]: {
        ...state.autoSave[stepNumber],
        status: 'saving' as const
      }
    }
  })),

  // Auto-save success
  on(StepperActions.autoSaveSuccess, (state, { stepNumber, timestamp }) => ({
    ...state,
    autoSave: {
      ...state.autoSave,
      [stepNumber]: {
        ...state.autoSave[stepNumber],
        status: 'saved' as const,
        lastSaved: timestamp,
        pendingChanges: false,
        error: null
      }
    }
  })),

  // Auto-save failure
  on(StepperActions.autoSaveFailure, (state, { stepNumber, error }) => ({
    ...state,
    autoSave: {
      ...state.autoSave,
      [stepNumber]: {
        ...state.autoSave[stepNumber],
        status: 'error' as const,
        error: error,
        pendingChanges: true
      }
    }
  })),

  // Set auto-save status (manuel status güncelleme)
  on(StepperActions.setAutoSaveStatus, (state, { stepNumber, status }) => ({
    ...state,
    autoSave: {
      ...state.autoSave,
      [stepNumber]: {
        ...state.autoSave[stepNumber],
        status: status
      }
    }
  })),

  // Clear auto-save status
  on(StepperActions.clearAutoSaveStatus, (state, { stepNumber }) => ({
    ...state,
    autoSave: {
      ...state.autoSave,
      [stepNumber]: {
        status: 'idle' as const,
        lastSaved: null,
        error: null,
        pendingChanges: false
      }
    }
  })),

  // Force save - immediate save trigger
  on(StepperActions.forceSave, (state, { stepNumber }) => ({
    ...state,
    autoSave: {
      ...state.autoSave,
      [stepNumber]: {
        ...state.autoSave[stepNumber],
        status: 'saving' as const,
        pendingChanges: true
      }
    }
  }))
);

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
  })),
  // Global Error Management Reducers
  on(StepperActions.setGlobalError, (state, { error }) => ({
    ...state,
    globalError: {
      ...error,
      timestamp: new Date()
    }
  })),

  on(StepperActions.clearGlobalError, (state) => ({
    ...state,
    globalError: null
  })),

  on(StepperActions.retryOperation, (state, { stepIndex }) => ({
    ...state,
    retryAttempts: {
      ...state.retryAttempts,
      [stepIndex]: (state.retryAttempts[stepIndex] || 0) + 1
    },
    globalError: null // Retry'da error'ı temizle
  })),

    // Step Loading Reducers (error reducers'ların altına ekle)
  on(StepperActions.setStepLoading, (state, { stepIndex, loading, operation }) => ({
    ...state,
    stepLoading: {
      ...state.stepLoading,
      [stepIndex]: {
        ...state.stepLoading[stepIndex],
        isLoading: loading,
        operation: loading ? operation : undefined,
        progress: loading ? state.stepLoading[stepIndex]?.progress : undefined,
        message: loading ? state.stepLoading[stepIndex]?.message : undefined
      }
    }
  })),

  on(StepperActions.setStepProgress, (state, { stepIndex, progress, message }) => ({
    ...state,
    stepLoading: {
      ...state.stepLoading,
      [stepIndex]: {
        ...state.stepLoading[stepIndex],
        progress,
        message
      }
    }
  })),

  on(StepperActions.clearStepProgress, (state, { stepIndex }) => ({
    ...state,
    stepLoading: {
      ...state.stepLoading,
      [stepIndex]: {
        ...state.stepLoading[stepIndex],
        progress: undefined,
        message: undefined
      }
    }
  })),

  // Step1 Migration Reducers
  on(StepperActions.initializeStep1State, (state, { order, orderDetails, hasFile, fileName }) => ({
    ...state,
    step1State: {
      order,
      orderDetails: [...orderDetails],
      original: [...orderDetails],
      added: [],
      modified: [],
      deleted: [],
      hasFile,
      fileName,
      isDirty: false
    }
  })),

  on(StepperActions.updateStep1OrderDetails, (state, { orderDetails }) => ({
    ...state,
    step1State: {
      ...state.step1State,
      orderDetails: [...orderDetails],
      isDirty: true
    }
  })),

  on(StepperActions.addOrderDetail, (state, { orderDetail }) => ({
    ...state,
    step1State: {
      ...state.step1State,
      orderDetails: [...state.step1State.orderDetails, orderDetail],
      added: [...state.step1State.added, orderDetail],
      isDirty: true
    }
  })),

  on(StepperActions.updateOrderDetail, (state, { orderDetail }) => {
    const orderDetails = state.step1State.orderDetails.map(detail =>
      detail.id === orderDetail.id ? orderDetail : detail
    );

    const isOriginal = state.step1State.original.some(item => item.id === orderDetail.id);
    const isAlreadyModified = state.step1State.modified.some(item => item.id === orderDetail.id);

    let modified = [...state.step1State.modified];
    if (isOriginal && !isAlreadyModified) {
      modified.push(orderDetail);
    } else if (isAlreadyModified) {
      modified = modified.map(item => item.id === orderDetail.id ? orderDetail : item);
    }

    return {
      ...state,
      step1State: {
        ...state.step1State,
        orderDetails,
        modified,
        isDirty: true
      }
    };
  }),

  on(StepperActions.deleteOrderDetail, (state, { orderDetailId }) => {
    const itemToDelete = state.step1State.orderDetails.find(item => item.id === orderDetailId);
    const orderDetails = state.step1State.orderDetails.filter(item => item.id !== orderDetailId);

    const isOriginal = state.step1State.original.some(item => item.id === orderDetailId);
    const deleted = isOriginal && itemToDelete ? [...state.step1State.deleted, itemToDelete] : state.step1State.deleted;
    const added = state.step1State.added.filter(item => item.id !== orderDetailId);
    const modified = state.step1State.modified.filter(item => item.id !== orderDetailId);

    return {
      ...state,
      step1State: {
        ...state.step1State,
        orderDetails,
        added,
        modified,
        deleted,
        isDirty: true
      }
    };
  })
);

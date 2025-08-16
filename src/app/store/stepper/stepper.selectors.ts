import { createFeatureSelector, createSelector } from '@ngrx/store';
import { StepperState } from './stepper.state';

// Feature selector
export const selectStepperState = createFeatureSelector<StepperState>('stepper');

// Basic selectors
export const selectCurrentStep = createSelector(
  selectStepperState,
  (state) => state.currentStep
);

export const selectCompletedSteps = createSelector(
  selectStepperState,
  (state) => state.completedSteps
);

export const selectAvailableSteps = createSelector(
  selectStepperState,
  (state) => state.availableSteps
);

export const selectStepValidations = createSelector(
  selectStepperState,
  (state) => state.stepValidations
);

// Edit Mode selectors
export const selectIsEditMode = createSelector(
  selectStepperState,
  (state) => state.isEditMode
);

export const selectEditOrderId = createSelector(
  selectStepperState,
  (state) => state.editOrderId
);

// Step Data selectors
export const selectStepData = createSelector(
  selectStepperState,
  (state) => state.stepData
);

export const selectStepDataByNumber = (stepNumber: number) => createSelector(
  selectStepData,
  (stepData) => stepData[`step${stepNumber + 1}` as keyof typeof stepData]
);

// UI State selectors
export const selectStepperLoading = createSelector(
  selectStepperState,
  (state) => state.loading
);

export const selectStepperError = createSelector(
  selectStepperState,
  (state) => state.error
);

// Computed selectors
export const selectIsStepCompleted = (stepIndex: number) => createSelector(
  selectCompletedSteps,
  (completedSteps) => completedSteps.includes(stepIndex)
);

export const selectIsStepAvailable = (stepIndex: number) => createSelector(
  selectAvailableSteps,
  (availableSteps) => availableSteps.includes(stepIndex)
);

export const selectIsStepValid = (stepIndex: number) => createSelector(
  selectStepValidations,
  (validations) => validations[stepIndex] || false
);

export const selectCanNavigateToStep = (stepIndex: number) => createSelector(
  selectAvailableSteps,
  selectIsEditMode,
  (availableSteps, isEditMode) => {
    // Edit mode'da tüm step'lere gidilebilir
    if (isEditMode) return true;
    // Normal mode'da sadece available step'lere gidilebilir
    return availableSteps.includes(stepIndex);
  }
);

// Complex selectors
export const selectStepperSummary = createSelector(
  selectCurrentStep,
  selectCompletedSteps,
  selectIsEditMode,
  selectEditOrderId,
  (currentStep, completedSteps, isEditMode, editOrderId) => ({
    currentStep,
    completedSteps,
    isEditMode,
    editOrderId,
    totalSteps: 3,
    progressPercentage: Math.round((completedSteps.length / 3) * 100)
  })
);

// Auto-Save Selectors
export const selectAutoSaveState = createSelector(
  selectStepperState,
  (state) => state.autoSave
);

export const selectStepAutoSave = (stepNumber: number) => createSelector(
  selectAutoSaveState,
  (autoSave) => autoSave[stepNumber]
);

export const selectStepAutoSaveStatus = (stepNumber: number) => createSelector(
  selectStepAutoSave(stepNumber),
  (stepAutoSave) => stepAutoSave?.status || 'idle'
);

export const selectStepLastSaved = (stepNumber: number) => createSelector(
  selectStepAutoSave(stepNumber),
  (stepAutoSave) => stepAutoSave?.lastSaved
);

export const selectStepAutoSaveError = (stepNumber: number) => createSelector(
  selectStepAutoSave(stepNumber),
  (stepAutoSave) => stepAutoSave?.error
);

export const selectStepHasPendingChanges = (stepNumber: number) => createSelector(
  selectStepAutoSave(stepNumber),
  (stepAutoSave) => stepAutoSave?.pendingChanges || false
);

// Combined Auto-Save Selectors
export const selectIsAnySaving = createSelector(
  selectAutoSaveState,
  (autoSave) => Object.values(autoSave).some(step => step.status === 'saving')
);

export const selectAnyAutoSaveErrors = createSelector(
  selectAutoSaveState,
  (autoSave) => Object.values(autoSave).some(step => step.status === 'error')
);

export const selectAutoSaveSummary = createSelector(
  selectAutoSaveState,
  (autoSave) => ({
    step0: autoSave[0],
    step1: autoSave[1],
    step2: autoSave[2],
    isAnySaving: Object.values(autoSave).some(step => step.status === 'saving'),
    hasErrors: Object.values(autoSave).some(step => step.status === 'error'),
    totalPendingChanges: Object.values(autoSave).filter(step => step.pendingChanges).length
  })
);

// Helper selector for UI display
export const selectAutoSaveStatusText = (stepNumber: number) => createSelector(
  selectStepAutoSaveStatus(stepNumber),
  selectStepLastSaved(stepNumber),
  selectStepAutoSaveError(stepNumber),
  (status, lastSaved, error) => {
    switch (status) {
      case 'saving':
        return 'Kaydediliyor...';
      case 'saved':
        return lastSaved ? `Kaydedildi: ${new Date(lastSaved).toLocaleTimeString()}` : 'Kaydedildi';
      case 'error':
        return `Hata: ${error || 'Bilinmeyen hata'}`;
      case 'idle':
      default:
        return '';
    }
  }
);

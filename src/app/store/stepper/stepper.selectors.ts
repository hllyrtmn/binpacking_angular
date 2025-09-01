import { createFeatureSelector, createSelector } from '@ngrx/store';
import { StepperState } from './stepper.state';
import { mapPackageDetailToPackage } from '../../models/mappers/package-detail.mapper';


// Feature selector
export const selectStepperState = createFeatureSelector<StepperState>('stepper');

export const selectUiPackages = createSelector(selectStepperState, (state) =>
  mapPackageDetailToPackage(state.step2State.packages)
)


// Basic selectors
export const selectCurrentStep = createSelector(
  selectStepperState,
  (state) => state.currentStep
);


export const selectCompletedStep = createSelector(
  selectStepperState,
  (state) => state.completedStep
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


export const selectIsStepValid = (stepIndex: number) => createSelector(
  selectStepValidations,
  (validations) => validations[stepIndex] || false
);



// Complex selectors
export const selectStepperSummary = createSelector(
  selectCurrentStep,
  selectCompletedStep,
  selectIsEditMode,
  (currentStep, completedStep, isEditMode ) => ({
    currentStep,
    completedStep,
    isEditMode,
    totalSteps: 3,
    progressPercentage: Math.round((completedStep / 3) * 100)
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

// Global Error Management Selectors
export const selectGlobalError = createSelector(
  selectStepperState,
  (state) => state.globalError
);

export const selectHasGlobalError = createSelector(
  selectGlobalError,
  (error) => error !== null
);

export const selectRetryAttempts = createSelector(
  selectStepperState,
  (state) => state.retryAttempts
);

export const selectStepRetryCount = (stepIndex: number) => createSelector(
  selectRetryAttempts,
  (retryAttempts) => retryAttempts[stepIndex] || 0
);

export const selectCanRetry = (stepIndex: number) => createSelector(
  selectStepRetryCount(stepIndex),
  (retryCount) => retryCount < 3 // Max 3 retry
);

// Step Loading Selectors
export const selectStepLoading = createSelector(
  selectStepperState,
  (state) => state.stepLoading
);

export const selectStepLoadingState = (stepIndex: number) => createSelector(
  selectStepLoading,
  (stepLoading) => stepLoading[stepIndex]
);

export const selectIsStepLoading = (stepIndex: number) => createSelector(
  selectStepLoadingState(stepIndex),
  (loadingState) => loadingState?.isLoading || false
);

export const selectStepProgress = (stepIndex: number) => createSelector(
  selectStepLoadingState(stepIndex),
  (loadingState) => loadingState?.progress
);

export const selectStepLoadingMessage = (stepIndex: number) => createSelector(
  selectStepLoadingState(stepIndex),
  (loadingState) => loadingState?.message
);

export const selectAnyStepLoading = createSelector(
  selectStepLoading,
  (stepLoading) => Object.values(stepLoading).some(step => step.isLoading)
);

// Step1 Migration Selectors
export const selectStep1State = createSelector(
  selectStepperState,
  (state) => state.step1State
);

export const selectOrder = createSelector(selectStepperState,(stepper)=> stepper.order)


export const selectOrderId = createSelector(selectOrder, (order) => order.id )

export const selectStep1OrderDetails = createSelector(
  selectStep1State,
  (step1State) => step1State.orderDetails
);

export const selectStep1Original = createSelector(
  selectStep1State,
  (step1State) => step1State.originalOrderDetails
);

export const selectStep1Changes = createSelector(
  selectStep1State,
  (step1State) => ({
    added: step1State.added,
    modified: step1State.modified,
    deleted: step1State.deleted
  })
);

export const selectStep1IsDirty = createSelector(
  selectStep1State,
  (step1State) => step1State.isDirty
);

export const selectStep1HasFile = createSelector(
  selectStep1State,
  (step1State) => step1State.hasFile
);

export const selectStep1FileName = createSelector(
  selectStep1State,
  (step1State) => step1State.fileName
);

// Step2 Migration Selectors
export const selectStep2State = createSelector(
  selectStepperState,
  (state) => state.step2State
);

export const selectStep2Packages = createSelector(
  selectStep2State,
  (step2State) => step2State.packages
);

export const selectStep2RemainingProducts = createSelector(
  selectStep2State,
  (step2State) => step2State.remainingProducts
);

export const selectStep2OriginalPackages = createSelector(
  selectStep2State,
  (step2State) => step2State.originalPackages
);

export const selectStep2Changes = createSelector(
  selectStep2State,
  (step2State) => ({
    added: step2State.addedPackages,
    modified: step2State.modifiedPackages,
    deleted: step2State.deletedPackages
  })
);

export const selectStep2IsDirty = createSelector(
  selectStep2State,
  (step2State) => step2State.isDirty
);

export const selectStep2PackageCount = createSelector(
  selectStep2Packages,
  (packages) => packages.length
);

export const selectStep2ProductCount = createSelector(
  selectStep2RemainingProducts,
  (products) => products.length
);

// Step3 Migration Selectors (Step2 selectors'ların altına ekle)
export const selectStep3State = createSelector(
  selectStepperState,
  (state) => state.step3State
);

export const selectStep3OptimizationResult = createSelector(
  selectStep3State,
  (step3State) => step3State.optimizationResult
);

export const selectStep3ReportFiles = createSelector(
  selectStep3State,
  (step3State) => step3State.reportFiles
);

export const selectStep3LoadingStats = createSelector(
  selectStep3State,
  (step3State) => step3State.loadingStats
);

export const selectStep3AlgorithmStats = createSelector(
  selectStep3State,
  (step3State) => step3State.algorithmStats
);

export const selectStep3HasResults = createSelector(
  selectStep3State,
  (step3State) => step3State.hasResults
);

export const selectStep3ShowVisualization = createSelector(
  selectStep3State,
  (step3State) => step3State.showVisualization
);

export const selectStep3HasUnsavedChanges = createSelector(
  selectStep3State,
  (step3State) => step3State.hasUnsavedChanges
);

export const selectStep3IsDirty = createSelector(
  selectStep3State,
  (step3State) => step3State.isDirty
);

export const selectStep3DataChangeHistory = createSelector(
  selectStep3State,
  (step3State) => step3State.dataChangeHistory
);

// Step3 Enhanced Selectors (mevcut Step3 selector'larından sonra ekle)
export const selectStep3CurrentViewType = createSelector(
  selectStep3State,
  (step3State) => step3State.currentViewType
);

export const selectStep3HasThreeJSError = createSelector(
  selectStep3State,
  (step3State) => step3State.hasThreeJSError
);

export const selectStep3ProcessedPackages = createSelector(
  selectStep3State,
  (step3State) => step3State.processedPackages
);

export const selectStep3Summary = createSelector(
  selectStep3HasResults,
  selectStep3ShowVisualization,
  selectStep3HasUnsavedChanges,
  selectStep3IsDirty,
  selectStep3ProcessedPackages,
  (hasResults, showVisualization, hasUnsavedChanges, isDirty, processedPackages) => ({
    hasResults,
    showVisualization,
    hasUnsavedChanges,
    isDirty,
    totalPackages: processedPackages.length,
    canSave: hasUnsavedChanges && hasResults
  })
);

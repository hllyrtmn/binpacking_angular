import { createReducer, on } from '@ngrx/store';
import { StepperState, initialStepperState } from './stepper.state';
import * as StepperActions from './stepper.actions';
import { update } from 'lodash';

export const stepperReducer = createReducer(
  initialStepperState,
  on(StepperActions.setOrderDetails, (state, { orderDetails }) => ({
    ...state,
    step1State: {
      ...state.step1State,
      orderDetails: [...orderDetails],
      originalOrderDetails: [...orderDetails],
      isDirty: false
    }
  })),


  on(StepperActions.calculatePackageDetailSuccess,(state, {packageDetails,remainingOrderDetails}) => (
    {...state,
      step2State: {
        ...state.step2State,
        packageDetils: [...packageDetails],
        remainingProducts: [...remainingOrderDetails]
      }
    }
  )),

  on(StepperActions.remainingProductMoveProduct, (state, { previousIndex, currentIndex }) => {
    const updatedRemainingProducts = [...state.step2State.remainingProducts]
    const [removed] = updatedRemainingProducts.splice(previousIndex, 1);
    updatedRemainingProducts.splice(currentIndex, 0, removed);
    return {
      ...state,
      step2State: {
        ...state.step2State,
        remainingProducts: updatedRemainingProducts
      }
    }
  }),
  on(StepperActions.setStepperData, (state, { data }) => ({
    ...state,
    ...data
  })),

  on(StepperActions.createOrderDetailsSuccess, (state, { orderDetails }) => ({
    ...state,
    step1State: {
      ...state.step1State,
      orderDetails: [...orderDetails],
      originalOrderDetails: [...orderDetails],
      added: [],
      isDirty: state.step1State.modified.length > 0 || state.step1State.deleted.length > 0,
    }
  })),

  on(StepperActions.setOrder, (state, { order }) => ({
    ...state,
    order: order
  })),

  on(StepperActions.updateOrCreateOrderSuccess, (state, { order }) => ({
    ...state,
    order: order
  })),

  on(StepperActions.setPackageDetails, (state, {  packageDetails }) => ({
    ...state,
    step2State: {
      ...state.step2State,
      packageDetils: [...packageDetails],
      originalPackageDetails: [...packageDetails],
      isDirty: false
    }
  })),

  on(StepperActions.navigateToStep, (state, { stepIndex }) => ({
    ...state,
    currentStep: stepIndex,
    error: null
  })),

  on(StepperActions.setStepCompleted, (state, { stepIndex }) => ({
    ...state,
    completedStep: stepIndex
  })),

  on(StepperActions.setStepValidation, (state, { stepIndex, isValid }) => ({
    ...state,
    stepValidations: {
      ...state.stepValidations,
      [stepIndex]: isValid
    }
  })),

  on(StepperActions.enableEditMode, (state, { orderId }) => ({
    ...state,
    isEditMode: true
  })),

  on(StepperActions.disableEditMode, (state) => ({
    ...state,
    isEditMode: false,
    editOrderId: null
  })),

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

  on(StepperActions.setStepperLoading, (state, { loading }) => ({
    ...state,
    loading
  })),

  on(StepperActions.setStepperError, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

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

  on(StepperActions.initializeStep1State, (state, { order, orderDetails, hasFile, fileName }) => ({
    ...state,
    step1State: {
      orderDetails: [...orderDetails],
      originalOrderDetails: [...orderDetails],
      added: [],
      modified: [],
      deleted: [],
      hasFile,
      fileName,
      isDirty: false
    }
  })),

  on(StepperActions.resetStep1Changes, (state) => ({
    ...state,
    step1State: {
      ...state.step1State,
      added: [],
      modified: [],
      deleted: [],
      isDirty: false
    }
  })),

  on(StepperActions.syncStep1WithBackend, (state, { orderDetails }) => ({
    ...state,
    step1State: {
      ...state.step1State,
      orderDetails: [...orderDetails],
      originalOrderDetails: [...orderDetails], // Yeni original data
      added: [], // Temizle
      modified: [], // Temizle
      deleted: [], // Temizle
      isDirty: false // Clean state
    }
  })),

  on(StepperActions.initializeStep1StateFromUpload, (state, { order, orderDetails, hasFile, fileName }) => ({
    ...state,
    order,
    step1State: {
      orderDetails: [...orderDetails],
      originalOrderDetails: [], // File upload'da original yok
      added: [...orderDetails], // File'dan gelen tüm data added
      modified: [],
      deleted: [],
      hasFile,
      fileName,
      isDirty: true // File upload'ta dirty true
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

    const isOriginal = state.step1State.originalOrderDetails.some(item => item.id === orderDetail.id);
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
    const isOriginal = state.step1State.originalOrderDetails.some(item => item.id === orderDetailId);
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
  }),

  on(StepperActions.initializeStep2State, (state, { packages, remainingProducts }) => ({
    ...state,
    step2State: {
      packageDetils: [...packages],
      remainingProducts: [...remainingProducts],
      originalPackageDetails: [...packages],
      originalRemainingProducts: [...remainingProducts],
      addedPackageDetails: [],
      modifiedPackageDetails: [],
      deletedPackageDetails: [],
      isDirty: false
    }
  })),

  on(StepperActions.updateStep2Packages, (state, { packages }) => ({
    ...state,
    step2State: {
      ...state.step2State,
      packageDetils: [...packages],
      isDirty: true
    }
  })),

  on(StepperActions.addPackage, (state, { package: newPackage }) => ({
    ...state,
    step2State: {
      ...state.step2State,
      packageDetils: [...state.step2State.packageDetils, newPackage],
      addedPackageDetails: [...state.step2State.addedPackageDetails, newPackage],
      isDirty: true
    }
  })),

  on(StepperActions.updatePackage, (state, { package: updatedPackage }) => {
    const packages = state.step2State.packageDetils.map(pkg =>
      pkg.id === updatedPackage.id ? updatedPackage : pkg
    );

    const isOriginal = state.step2State.originalPackageDetails.some(item => item.id === updatedPackage.id);
    const isAlreadyModified = state.step2State.modifiedPackageDetails.some(item => item.id === updatedPackage.id);

    let modified = [...state.step2State.modifiedPackageDetails];
    if (isOriginal && !isAlreadyModified) {
      modified.push(updatedPackage);
    } else if (isAlreadyModified) {
      modified = modified.map(item => item.id === updatedPackage.id ? updatedPackage : item);
    }

    return {
      ...state,
      step2State: {
        ...state.step2State,
        packageDetils: packages,
        modifiedPackageDetails: modified,
        isDirty: true
      }
    };
  }),

  on(StepperActions.deletePackage, (state, { packageId }) => {
    const itemToDelete = state.step2State.packageDetils.find(item => item.id === packageId);
    const packages = state.step2State.packageDetils.filter(item => item.id !== packageId);

    const isOriginal = state.step2State.originalPackageDetails.some(item => item.id === packageId);
    const deleted = isOriginal && itemToDelete ? [...state.step2State.deletedPackageDetails, itemToDelete] : state.step2State.deletedPackageDetails;
    const added = state.step2State.addedPackageDetails.filter(item => item.id !== packageId);
    const modified = state.step2State.modifiedPackageDetails.filter(item => item.id !== packageId);

    return {
      ...state,
      step2State: {
        ...state.step2State,
        packageDetils: packages,
        addedPackageDetails: added,
        modifiedPackageDetails: modified,
        deletedPackageDetails: deleted,
        isDirty: true
      }
    };
  }),

  on(StepperActions.updateAvailableProducts, (state, { availableProducts }) => ({
    ...state,
    step2State: {
      ...state.step2State,
      availableProducts: [...availableProducts],
      isDirty: true
    }
  })),

  on(StepperActions.initializeStep3State, (state, { optimizationResult, reportFiles, loadingStats, algorithmStats }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      optimizationResult: [...optimizationResult],
      reportFiles: [...reportFiles],
      loadingStats: loadingStats || state.step3State.loadingStats,
      algorithmStats: algorithmStats || state.step3State.algorithmStats,
      hasResults: optimizationResult.length > 0 || reportFiles.length > 0,
      showVisualization: optimizationResult.length > 0,
      isDirty: false
    }
  })),

  on(StepperActions.updateStep3OptimizationResult, (state, { optimizationResult }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      optimizationResult: [...optimizationResult],
      hasResults: optimizationResult.length > 0,
      showVisualization: optimizationResult.length > 0,
      hasUnsavedChanges: true,
      isDirty: true
    }
  })),

  on(StepperActions.updateStep3ReportFiles, (state, { reportFiles }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      reportFiles: [...reportFiles],
      isDirty: true
    }
  })),

  on(StepperActions.updateStep3LoadingStats, (state, { loadingStats }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      loadingStats: loadingStats,
      isDirty: true
    }
  })),

  on(StepperActions.updateStep3AlgorithmStats, (state, { algorithmStats }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      algorithmStats: algorithmStats,
      isDirty: true
    }
  })),

  on(StepperActions.setStep3HasResults, (state, { hasResults }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      hasResults: hasResults,
      showVisualization: hasResults,
      isDirty: true
    }
  })),

  on(StepperActions.updateStep3DataChangeHistory, (state, { changes }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      dataChangeHistory: [...changes],
      isDirty: true
    }
  })),

  on(StepperActions.setStep3ThreeJSError, (state, { hasError, errorMessage }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      hasThreeJSError: hasError,
      showVisualization: !hasError,
      isDirty: true
    },
    globalError: hasError ? {
      message: errorMessage || 'ThreeJS visualization error',
      stepIndex: 2,
      timestamp: new Date()
    } : state.globalError
  })),

  on(StepperActions.setStep3ViewType, (state, { viewType }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      currentViewType: viewType,
      isDirty: true
    }
  })),

  on(StepperActions.setStep3UnsavedChanges, (state, { hasUnsavedChanges }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      hasUnsavedChanges: hasUnsavedChanges,
      isDirty: hasUnsavedChanges
    }
  })),

  on(StepperActions.updateStep3ProcessedPackages, (state, { processedPackages }) => ({
    ...state,
    step3State: {
      ...state.step3State,
      processedPackages: [...processedPackages],
      isDirty: true
    }
  }))
);

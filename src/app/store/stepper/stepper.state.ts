// src/app/store/stepper/stepper.state.ts

export interface StepperState {
  // Mevcut properties...
  currentStep: number;
  completedSteps: number[];
  availableSteps: number[];

  isEditMode: boolean;
  editOrderId: string | null;

  stepValidations: {
    [stepNumber: number]: boolean;
  };

  stepData: {
    step1?: any;
    step2?: any;
    step3?: any;
  };

  loading: boolean;
  error: string | null;

  // YENİ: Auto-Save State
  autoSave: {
    [stepNumber: number]: {
      status: 'idle' | 'saving' | 'saved' | 'error';
      lastSaved: Date | null;
      error: string | null;
      pendingChanges: boolean;
    };
  };

  globalError: {
    message: string;
    code?: string;
    stepIndex?: number;
    timestamp?: Date;
  } | null;

  retryAttempts: {
    [stepIndex: number]: number;
  };

  stepLoading: {
    [stepIndex: number]: {
      isLoading: boolean;
      operation?: string;
      progress?: number;
      message?: string;
    };
  };

  step1State: {
    order: any | null;
    orderDetails: any[];
    original: any[];
    added: any[];
    modified: any[];
    deleted: any[];
    hasFile: boolean;
    fileName?: string;
    isDirty: boolean;
  };

   step2State: {
    packages: any[];
    availableProducts: any[];
    originalPackages: any[];
    originalProducts: any[];
    addedPackages: any[];
    modifiedPackages: any[];
    deletedPackages: any[];
    isDirty: boolean;
  };

  step3State: {
    optimizationResult: any[];
    reportFiles: any[];
    loadingStats: any | null;
    algorithmStats: any | null;
    hasResults: boolean;
    showVisualization: boolean;
    currentViewType: string;
    hasThreeJSError: boolean;
    processedPackages: any[];
    dataChangeHistory: any[];
    hasUnsavedChanges: boolean;
    isDirty: boolean;
  };
}

export const initialStepperState: StepperState = {
  // Mevcut initial values...
  currentStep: 0,
  completedSteps: [],
  availableSteps: [0],

  isEditMode: false,
  editOrderId: null,

  stepValidations: {
    0: false,
    1: false,
    2: false
  },

  stepData: {},

  loading: false,
  error: null,

  // YENİ: Auto-Save Initial State
  autoSave: {
    0: { status: 'idle', lastSaved: null, error: null, pendingChanges: false },
    1: { status: 'idle', lastSaved: null, error: null, pendingChanges: false },
    2: { status: 'idle', lastSaved: null, error: null, pendingChanges: false }
  },

  globalError: null,
  retryAttempts: {
    0: 0,
    1: 0,
    2: 0
  },

  stepLoading: {
    0: { isLoading: false },
    1: { isLoading: false },
    2: { isLoading: false }
  },

  step1State: {
    order: null,
    orderDetails: [],
    original: [],
    added: [],
    modified: [],
    deleted: [],
    hasFile: false,
    isDirty: false
  },

  step2State: {
    packages: [],
    availableProducts: [],
    originalPackages: [],
    originalProducts: [],
    addedPackages: [],
    modifiedPackages: [],
    deletedPackages: [],
    isDirty: false
  },

  step3State: {
    optimizationResult: [],
    reportFiles: [],
    loadingStats: null,
    algorithmStats: null,
    hasResults: false,
    showVisualization: false,
    currentViewType: 'isometric',
    hasThreeJSError: false,
    processedPackages: [],
    dataChangeHistory: [],
    hasUnsavedChanges: false,
    isDirty: false
  }
};

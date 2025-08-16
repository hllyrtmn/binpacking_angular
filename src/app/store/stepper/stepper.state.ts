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
  }
};

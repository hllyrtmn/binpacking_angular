import { ActionReducerMap } from '@ngrx/store';
import { StepperState } from './stepper/stepper.state';
import { stepperReducer } from './stepper/stepper.reducer';

// App State Interface
export interface AppState {
  stepper: StepperState;
}

// Root Reducers
export const reducers: ActionReducerMap<AppState> = {
  stepper: stepperReducer
};

// Export all selectors for easy import
export * from './stepper/stepper.selectors';
export * from './stepper/stepper.actions';
export type { StepperState } from './stepper/stepper.state';

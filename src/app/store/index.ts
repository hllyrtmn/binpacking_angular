import { ActionReducerMap } from '@ngrx/store';
import { StepperState } from './stepper/stepper.state';
import { stepperReducer } from './stepper/stepper.reducer';
import { userReducer } from './user/user.reducer';

// App State Interface
export interface AppState {
  stepper: StepperState;
}

// Root Reducers
export const reducers: ActionReducerMap<AppState> = {
  stepper: stepperReducer,
  user: userReducer
} as ActionReducerMap<AppState>;

// Export all selectors for easy import
export * from './stepper/stepper.selectors';
export * from './stepper/stepper.actions';
export * from './user/user.selectors';
export * from './user/user.actions';
export type { StepperState } from './stepper/stepper.state';
export type { UserState } from './user/user.state';

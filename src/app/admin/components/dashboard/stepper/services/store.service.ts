import { Injectable,inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../../store';
import * as StepperActions from '../../../../../store/stepper/stepper.actions';
import * as StepperSelectors from '../../../../../store/stepper/stepper.selectors';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private readonly store = inject(Store<AppState>);
  

  setStepLoading(stepIndex: number, loading: boolean, operation?: string){
    this.store.dispatch(StepperActions.setStepLoading({
      stepIndex: stepIndex,
      loading: loading,
      operation: operation
    }));
  }
}

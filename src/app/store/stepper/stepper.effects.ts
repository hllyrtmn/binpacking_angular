// src/app/store/stepper/stepper.effects.ts

import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, tap, debounceTime, switchMap, catchError, withLatestFrom } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import * as StepperActions from './stepper.actions';
import { AppState } from '../index';
import { ToastService } from '../../services/toast.service';
import { LocalStorageService } from '../../admin/components/dashboard/stepper/services/local-storage.service';

@Injectable()
export class StepperEffects {
  private actions$ = inject(Actions);
  private store = inject(Store<AppState>);
  private localStorageService = inject(LocalStorageService);
  private toastService = inject(ToastService);

  // Mevcut logging effect...
  logStepperActions$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          StepperActions.navigateToStep,
          StepperActions.enableEditMode,
          StepperActions.setStepCompleted
        ),
        tap((action) => {
          console.log('🎯 NgRx Stepper Action:', action.type, action);
        })
      ),
    { dispatch: false }
  );

  // YENİ: Auto-save trigger effect (debounced)
  triggerAutoSave$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.triggerAutoSave),
      debounceTime(1500), // 1.5 saniye debounce
      map(({ stepNumber, data, changeType }) => {
        console.log('💾 Auto-save triggered for step:', stepNumber, 'type:', changeType);
        return StepperActions.performAutoSave({ stepNumber, data });
      })
    )
  );

  // YENİ: Perform auto-save effect
  performAutoSave$ = createEffect(() =>
  this.actions$.pipe(
    ofType(StepperActions.performAutoSave),
    switchMap(({ stepNumber, data }) => {
      console.log('💾 Performing auto-save for step:', stepNumber);
      console.log('💾 Data:', data);

      return timer(100).pipe(
        switchMap(() => {
          try {
            console.log('💾 Trying to save step data...');

            // Step'e göre save işlemi
            this.saveStepData(stepNumber, data);

            console.log('✅ Save step data success');

            return of(StepperActions.autoSaveSuccess({
              stepNumber,
              timestamp: new Date()
            }));
          } catch (error) {
            console.error('❌ Auto-save error in try-catch:', error);
            return of(StepperActions.autoSaveFailure({
              stepNumber,
              error: error instanceof Error ? error.message : 'Auto-save failed'
            }));
          }
        }),
        catchError((error) => {
          console.error('❌ Auto-save effect error in catchError:', error);
          return of(StepperActions.autoSaveFailure({
            stepNumber,
            error: error.message || 'Auto-save failed'
          }));
        })
      );
    })
  )
);

  // YENİ: Force save effect (immediate, no debounce)
  forceSave$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.forceSave),
      switchMap(({ stepNumber, data }) => {
        console.log('⚡ Force save for step:', stepNumber);

        try {
          this.saveStepData(stepNumber, data);

          return of(StepperActions.autoSaveSuccess({
            stepNumber,
            timestamp: new Date()
          }));
        } catch (error) {
          return of(StepperActions.autoSaveFailure({
            stepNumber,
            error: error instanceof Error ? error.message : 'Force save failed'
          }));
        }
      })
    )
  );

  // YENİ: Auto-save success notification
  autoSaveSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(StepperActions.autoSaveSuccess),
        tap(({ stepNumber, timestamp }) => {
          console.log(`✅ Step ${stepNumber + 1} auto-saved at:`, timestamp.toLocaleTimeString());
          // Optional: Show toast notification
          // this.toastService.info(`Step ${stepNumber + 1} kaydedildi`);
        })
      ),
    { dispatch: false }
  );

  // YENİ: Auto-save error notification
  autoSaveError$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(StepperActions.autoSaveFailure),
        tap(({ stepNumber, error }) => {
          console.error(`❌ Step ${stepNumber + 1} auto-save failed:`, error);
          this.toastService.warning(`Step ${stepNumber + 1} kaydedilemedi: ${error}`);
        })
      ),
    { dispatch: false }
  );

  // Private helper method
  private saveStepData(stepNumber: number, data: any): void {
  console.log('💾 saveStepData called with:', { stepNumber, data });

  try {
    switch (stepNumber) {
      case 0: // Step 1
        console.log('💾 Saving Step 1...');
        if (data.order && data.orderDetails) {
          this.localStorageService.saveStep1Data(
            data.order,
            data.orderDetails,
            data.hasFile || false,
            data.fileName
          );
          console.log('✅ Step 1 saved');
        } else {
          console.warn('⚠️ Step 1 data incomplete');
        }
        break;

      case 1: // Step 2
        console.log('💾 Saving Step 2...');
        if (data.packages) {
          this.localStorageService.saveStep2Data(data.packages, data.availableProducts || []);
          console.log('✅ Step 2 saved');
        } else {
          console.warn('⚠️ Step 2 data incomplete');
        }
        break;

      case 2: // Step 3
        console.log('💾 Saving Step 3...');
        if (data.optimizationResult || data.reportFiles) {
          this.localStorageService.saveStep3Data(
            data.optimizationResult,
            data.reportFiles || []
          );
          console.log('✅ Step 3 saved');
        } else {
          console.warn('⚠️ Step 3 data incomplete');
        }
        break;

      default:
        throw new Error(`Invalid step number: ${stepNumber}`);
    }
  } catch (error) {
    console.error('❌ saveStepData error:', error);
    throw error; // Re-throw to be caught by effect
  }
}
}

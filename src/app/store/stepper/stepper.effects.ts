// src/app/store/stepper/stepper.effects.ts

import { UIStateManager } from '../../admin/components/dashboard/stepper/components/invoice-upload/managers/ui-state.manager';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, tap, debounceTime, switchMap, catchError, withLatestFrom, mergeMap } from 'rxjs/operators';
import { forkJoin, of, timer } from 'rxjs';
import * as StepperActions from './stepper.actions';
import { AppState } from '../index';
import { ToastService } from '../../services/toast.service';
import { LocalStorageService } from '../../admin/components/dashboard/stepper/services/local-storage.service';
import { RepositoryService } from '../../admin/components/dashboard/stepper/services/repository.service';
import { Action } from '@ngrx/store';

@Injectable()
export class StepperEffects {
  private actions$ = inject(Actions);
  private store = inject(Store<AppState>);
  private localStorageService = inject(LocalStorageService);
  private toastService = inject(ToastService);
  private repositoryService = inject(RepositoryService);
  private uiStateManager = inject(UIStateManager);



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

        return StepperActions.performAutoSave({ stepNumber, data });
      })
    )
  );

  // YENİ: Perform auto-save effect
  performAutoSave$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.performAutoSave),
      switchMap(({ stepNumber, data }) => {



        return timer(100).pipe(
          switchMap(() => {
            try {


              // Step'e göre save işlemi
              this.saveStepData(stepNumber, data);



              return of(StepperActions.autoSaveSuccess({
                stepNumber,
                timestamp: new Date()
              }));
            } catch (error) {

              return of(StepperActions.autoSaveFailure({
                stepNumber,
                error: error instanceof Error ? error.message : 'Auto-save failed'
              }));
            }
          }),
          catchError((error) => {

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

          this.toastService.warning(`Step ${stepNumber + 1} kaydedilemedi: ${error}`);
        })
      ),
    { dispatch: false }
  );

  // Private helper method
  private saveStepData(stepNumber: number, data: any): void {

    try {
      switch (stepNumber) {
        case 0: // Step 1

          if (data.order && data.orderDetails) {
            this.localStorageService.saveStep1Data(
              data.order,
              data.orderDetails,
              data.hasFile || false,
              data.fileName
            );

          } else {

          }
          break;

        case 1: // Step 2

          if (data.packages) {
            this.localStorageService.saveStep2Data(data.packages, data.availableProducts || []);

          } else {

          }
          break;

        case 2: // Step 3

          if (data.optimizationResult || data.reportFiles) {
            this.localStorageService.saveStep3Data(
              data.optimizationResult,
              data.reportFiles || []
            );

          } else {

          }
          break;

        default:
          throw new Error(`Invalid step number: ${stepNumber}`);
      }
    } catch (error) {

      throw error; // Re-throw to be caught by effect
    }
  }
  // Global Error Effects
  globalErrorLogging$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(StepperActions.setGlobalError),
        tap(({ error }) => {


          // Error toast göster
          this.toastService.error(
            error.message,
            error.stepIndex !== undefined ? `Step ${error.stepIndex + 1} Hatası` : 'Sistem Hatası'
          );
        })
      ),
    { dispatch: false }
  );

  retryOperation$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(StepperActions.retryOperation),
        tap(({ stepIndex, operation }) => {

          this.toastService.info(`Step ${stepIndex + 1} yeniden deneniyor...`);
        })
      ),
    { dispatch: false }
  );

  // Retry Mechanism Effect
  handleRetryWithLoading$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.retryOperation),
      switchMap(({ stepIndex, operation }) => {


        return of(null).pipe(
          // İlk önce loading başlat
          tap(() => {
            this.store.dispatch(StepperActions.setStepLoading({
              stepIndex,
              loading: true,
              operation: `${operation} (Retry)`
            }));
          }),
          // 2 saniye bekle (retry delay)
          switchMap(() => timer(2000)),
          // Loading'i durdur
          tap(() => {
            this.store.dispatch(StepperActions.setStepLoading({
              stepIndex,
              loading: false
            }));
          }),
          // Success mesajı
          tap(() => {
            this.toastService.success(`Step ${stepIndex + 1} başarıyla yeniden denendi`);
          })
        );
      })
    ),
    { dispatch: false }
  );

  enableEditMode$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.enableEditMode),
      mergeMap(action => {
        this.uiStateManager.setLoading(true);
        return forkJoin({
          orderDetails: this.repositoryService.orderDetails(action.orderId),
          step2Result: this.repositoryService.getPackageDetails(action.orderId)
        }).pipe(
          // Tüm API sonuçlarını tek bir objede alıyoruz
          mergeMap(({ orderDetails, step2Result }) => {
            // TOOD: 
            // validationlari true olmali
            // completed lari control edilip ona gore islenmeli
            let actions: Action[] = [];

            const order = orderDetails[0].order;
            const packages = step2Result.packages;
            const remainingProducts = step2Result.remainingProducts;

            this.localStorageService.saveStep1Data(order, orderDetails, false);
            this.localStorageService.saveStep2Data(packages, remainingProducts);

            if (packages.length == 0) {
              actions.push(StepperActions.setStepCompleted({ stepIndex: 1 }));
            } else {
              actions.push(StepperActions.setStepCompleted({ stepIndex: 2 }));
            }

            return of(
              StepperActions.setOrder({ order: orderDetails[0].order }),
              StepperActions.setOrderDetails({ orderDetails }),
              StepperActions.setPackages({ packages: step2Result.packages }),
              StepperActions.setRemainingProducts({ remainingProducts: step2Result.remainingProducts }),
              ...actions
            )
          }
          ),
        )
      }),
      tap({
        finalize: () => {
          this.uiStateManager.setLoading(false);
        }
      })
    )
  );


  // getLocalStorageData
  getLocalStorageData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.getLocalStorageData),
      tap(() => {
        const data = this.localStorageService.getStepperData();
      })
    ),
    { dispatch: false }
  );

  invoiceUploadSubmit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.invoiceUploadSubmit),
      tap(() => {console.log("invoiceUploadSubmit$ tetiklendi")})
    ),
    { dispatch: false }
  );
}
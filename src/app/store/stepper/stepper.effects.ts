// src/app/store/stepper/stepper.effects.ts

import { UIStateManager } from '../../admin/components/dashboard/stepper/components/invoice-upload/managers/ui-state.manager';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, tap, debounceTime, switchMap, catchError, withLatestFrom, mergeMap, concatMap, take } from 'rxjs/operators';
import { concat, EMPTY, forkJoin, from, of, timer } from 'rxjs';
import * as StepperActions from './stepper.actions';
import { AppState, selectOrder, selectOrderId, selectStep1Changes, selectStep1OrderDetails } from '../index';
import { ToastService } from '../../services/toast.service';
import { LocalStorageService } from '../../admin/components/dashboard/stepper/services/local-storage.service';
import { RepositoryService } from '../../admin/components/dashboard/stepper/services/repository.service';
import { Action } from '@ngrx/store';
import { FileUploadManager } from '../../admin/components/dashboard/stepper/components/invoice-upload/managers/file-upload.manager';
import { INVOICE_UPLOAD_CONSTANTS } from '../../admin/components/dashboard/stepper/components/invoice-upload/constants/invoice-upload.constants';
import { OrderService } from '../../admin/components/services/order.service';
import { dispatch } from 'd3';
import { create, filter } from 'lodash';

@Injectable()
export class StepperEffects {
  private actions$ = inject(Actions);
  private store = inject(Store<AppState>);
  private localStorageService = inject(LocalStorageService);
  private toastService = inject(ToastService);
  private repositoryService = inject(RepositoryService);
  private uiStateManager = inject(UIStateManager);
  private fileUploadManager = inject(FileUploadManager);
  private orderService = inject(OrderService)





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


  // Private helper method
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

  /// burada update or create actionindan gelen context degerini update or create order success actionina gecmeye calisiyorum hata var coz
  updateOrCreateOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.updateOrCreateOrder),
      withLatestFrom(this.store.select(selectOrder)),
      switchMap(([action, order]) => {
        return this.orderService.updateOrCreate(order).pipe(
          map(result => StepperActions.updateOrCreateOrderSuccess({ order: result.order, context: action.context })),
          catchError((error) => of(StepperActions.setStepperError({ error: error.message })))
        )
      }
      )
    )
  )

  createOrderDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.createOrderDetails),
      withLatestFrom(this.store.select(selectStep1Changes)),
      switchMap(([action, changes]) =>
        this.repositoryService.bulkUpdateOrderDetails(changes).pipe(
          map((orderDetails) =>
            StepperActions.createOrderDetailsSuccess({ orderDetails: orderDetails, context: action.context})
          ),
          catchError((error) => of(StepperActions.setStepperError({ error: error.message })))
        )
      )
    )
  )

  invoiceUploadSubmitFlow$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.invoiceUploadSubmitFlow),
      switchMap((action) =>
        of(StepperActions.updateOrCreateOrder({ context: "invoiceUploadSubmitFlow" }))
      )
    )
  )



  updateOrCreateOrderInvoiceUploadSubmitFlow$ = createEffect(() => {
  return this.actions$.pipe(
    ofType(StepperActions.updateOrCreateOrderSuccess),
    switchMap((action) => {
      // Context kontrolü
      if (action.context === "invoiceUploadSubmitFlow") {
        return of(StepperActions.createOrderDetails({ 
          context: "invoiceUploadSubmitFlow" 
        }));
      }
      return EMPTY; // Context uygun değilse hiçbir şey yapma
    }),
    catchError((error) => {
      console.error('Effect error:', error);
      return of(StepperActions.setStepperError({ 
        error: error.message || 'Unknown error' 
      }));
    })
  );
});

  uploadInvoiceFile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.uploadInvoiceFile),
      withLatestFrom(this.store.select(selectOrderId)),
      switchMap(([action, orderId]) =>
        this.fileUploadManager.uploadFileToOrder(orderId)
      ), catchError((error) => {
        this.toastService.error(error.message)
        return EMPTY;
      })
    ), { dispatch: false }
  )

  invoiceUploadFileUpload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StepperActions.uploadInvoiceFile),
      switchMap(() =>
        this.fileUploadManager.uploadFile()
      ),
      mergeMap(response => {
        return of(
          StepperActions.initializeStep1StateFromUpload({
            order: response.order,
            orderDetails: response.orderDetail,
            hasFile: true,
            fileName: 'File Upload Result'
          }
          ),
          StepperActions.setStepLoading({
            stepIndex: 0,
            loading: false,
            operation: "file upload completed"
          }
          )
        )
      }
      ),
      catchError(error => {
        this.toastService.error(INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.FILE_PROCESSING, error);
        return of(StepperActions.setStepperError({ error: error.message }))
      })
    )
  )


}
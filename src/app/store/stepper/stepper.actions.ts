import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { createAction, props } from '@ngrx/store';
import { UiProduct } from '../../admin/components/dashboard/stepper/components/ui-models/ui-product.model';

export const calculatePackageDetail = createAction(
  '[Stepper] Calculate Package Detail'
);

export const moveUiProductInSamePackage = createAction(
  '[Stepper] Move Ui Product In Same Package',
  props<{containerId:string,currentIndex:number,previousIndex:number}>()
);


export const moveUiProductInSamePackageSuccess = createAction(
  '[Stepper] Move Ui Product In Same Package Success'
);

export const calculatePackageDetailSuccess = createAction(
  '[Stepper] Calculate Package Detail Success',
  props<{packages: any[], remainingOrderDetails: any[]}>()
);

export const remainingProductMoveProduct = createAction(
  '[Stepper] Remaining Product Move Product',
  props<{ previousIndex: number, currentIndex: number }>()
);

export const stepperStepUpdated = createAction(
  '[Stepper] Stepper Step Updated'
);

export const setStepperData = createAction(
  '[Stepper] Set Stepper Data',
  props<{ data: any }>()
);

export const setInvoiceUploadData = createAction(
  '[Invoice Upload] Set Invoice Upload Data',
  // burada invoice upload ile ilgili tum fealdlar olmali
  props<{ order: any, orderDetails: any[] }>()
);


// create updateOrcreateOrder
export const updateOrCreateOrder = createAction(
  '[Invoice Upload] update or create order',
  props<{ context: string }>()
);

export const updateOrCreateOrderSuccess = createAction(
  '[Invoice Upload] update or create order success',
  props<{ order: any, context: string }>()
);

export const createOrderDetails = createAction(
  '[Invoice Upload] Create Order Details',
  props<{ context: string }>()
);

export const createOrderDetailsSuccess = createAction(
  '[Invoice Upload] Create Order Details Success',
  props<{ orderDetails: any[], context: string }>()
);

export const uploadFileToOrder = createAction(
  '[Invoice Upload] Upload file to Order',
)

// create uploadInvoiceFile
export const uploadInvoiceProcessFile = createAction(
  '[Invoice Upload] Upload Invoice Process File',
);

export const uploadFileToOrderSuccess = createAction(
  '[Invoice Upload] Upload file to Order Success',
)

// create uploadInvoiceFile
export const uploadInvoiceProcessFileSuccess = createAction(
  '[Invoice Upload] Upload Invoice Process File Success',
);


export const invoiceUploadSubmitSuccess = createAction(
  '[Invoice Upload] Submit Success',
  props<{ orderDetails: any[] }>()

);


export const invoiceUploadSubmitFlow = createAction(
  '[Invoice Upload] Submit Flow',
);


export const invoiceUploadSubmitFlowSuccess = createAction(
  '[Invoice Upload] Submit Flow Success',
);




// create getLocalStorageData
export const restoreLocalStorageData = createAction(
  '[Stepper] Restore Local Storage Data'
);


export const setOrder = createAction(
  '[Stepper] Set Order',
  props<{ order: any }>()
);


export const setOrderDetails = createAction(
  '[Stepper] Set Order Details',
  props<{ orderDetails: any[] }>()
);

// create setPackageDetails
export const setUiPackages = createAction(
  '[Stepper] Set Ui Packages',
  props<{ packages: any[] }>()
);

export const setUiPackagesSuccess = createAction(
  '[Stepper] Set Ui Packages Success'
);

export const setRemainingProducts = createAction(
  '[Stepper] Set Remaining Products',
  props<{ remainingProducts: any[] }>()
);


// Navigation Actions
export const navigateToStep = createAction(
  '[Stepper] Navigate To Step',
  props<{ stepIndex: number }>()
);

export const setStepCompleted = createAction(
  '[Stepper] Set Step Completed',
  props<{ stepIndex: number }>()
);

export const setStepValidation = createAction(
  '[Stepper] Set Step Validation',
  props<{ stepIndex: number; isValid: boolean }>()
);

// Edit Mode Actions
export const enableEditMode = createAction(
  '[Stepper] Enable Edit Mode',
  props<{ orderId: string }>()
);

export const disableEditMode = createAction(
  '[Stepper] Disable Edit Mode'
);

// Step Data Actions (geçici veri saklama için)
export const setStepData = createAction(
  '[Stepper] Set Step Data',
  props<{ stepNumber: number; data: any }>()
);

export const clearStepData = createAction(
  '[Stepper] Clear Step Data',
  props<{ stepNumber?: number }>() // stepNumber yoksa tümünü temizle/
);

// Reset Actions
export const resetStepper = createAction(
  '[Stepper] Reset Stepper'
);

// Loading & Error Actions
export const setStepperLoading = createAction(
  '[Stepper] Set Loading',
  props<{ loading: boolean }>()
);

export const setStepperError = createAction(
  '[Stepper] Set Error',
  props<{ error: string | null }>()
);

// Initialization Action
export const initializeStepper = createAction(
  '[Stepper] Initialize Stepper',
  props<{ editMode?: boolean; editOrderId?: string }>()
);

// Auto-Save Actions (dosyanın sonuna ekleyin)

// Auto-save trigger actions
export const triggerAutoSave = createAction(
  '[Auto-Save] Trigger Auto Save',
  props<{ stepNumber: number; data: any; changeType: 'emergency' | 'data-change' | 'drag-drop' | 'form' | 'user-action' | 'api-response' | 'form-change' }>()
);

export const performAutoSave = createAction(
  '[Auto-Save] Perform Auto Save',
  props<{ stepNumber: number; data: any }>()
);

export const autoSaveSuccess = createAction(
  '[Auto-Save] Auto Save Success',
  props<{ stepNumber: number; timestamp: Date }>()
);

export const autoSaveFailure = createAction(
  '[Auto-Save] Auto Save Failure',
  props<{ stepNumber: number; error: string }>()
);

// Auto-save status actions
export const setAutoSaveStatus = createAction(
  '[Auto-Save] Set Auto Save Status',
  props<{ stepNumber: number; status: 'idle' | 'saving' | 'saved' | 'error' }>()
);

export const clearAutoSaveStatus = createAction(
  '[Auto-Save] Clear Auto Save Status',
  props<{ stepNumber: number }>()
);

// Force save action (manuel kaydetme için)
export const forceSave = createAction(
  '[Auto-Save] Force Save',
  props<{ stepNumber: number; data: any }>()
);

export const setGlobalError = createAction(
  '[Error] Set Global Error',
  props<{ error: { message: string; code?: string; stepIndex?: number } }>()
);

export const clearGlobalError = createAction(
  '[Error] Clear Global Error'
);

export const retryOperation = createAction(
  '[Error] Retry Operation',
  props<{ stepIndex: number; operation: string }>()
);

// Step-specific Loading Actions
export const setStepLoading = createAction(
  '[Loading] Set Step Loading',
  props<{ stepIndex: number; loading: boolean; operation?: string }>()
);

export const setStepProgress = createAction(
  '[Loading] Set Step Progress',
  props<{ stepIndex: number; progress: number; message?: string }>()
);

export const clearStepProgress = createAction(
  '[Loading] Clear Step Progress',
  props<{ stepIndex: number }>()
);

// StateManager Migration Actions
export const initializeStep1State = createAction(
  '[Migration] Initialize Step1 State',
  props<{ order: any; orderDetails: any[]; hasFile: boolean; fileName?: string }>()
);

export const resetStep1Changes = createAction(
  '[Migration] Reset Step1 Changes'
);

// Backend sync action
export const syncStep1WithBackend = createAction(
  '[Migration] Sync Step1 With Backend',
  props<{ orderDetails: any[] }>()
);

export const initializeStep1StateFromUpload = createAction(
  '[Migration] Initialize Step1 State From Upload',
  props<{ order: any; orderDetails: any[]; hasFile: boolean; fileName?: string }>()
);

export const updateStep1OrderDetails = createAction(
  '[Migration] Update Step1 OrderDetails',
  props<{ orderDetails: any[] }>()
);

export const initializeAddOrderDetails = createAction(
  '[Migration] Add Order Details',
  props<{ added: any[] }>()
)

export const addOrderDetail = createAction(
  '[Migration] Add Order Detail',
  props<{ orderDetail: any }>()
);

export const clearAdded = createAction('[Migration] Clear Added');

export const updateOrderDetail = createAction(
  '[Migration] Update Order Detail',
  props<{ orderDetail: any }>()
);

export const deleteOrderDetail = createAction(
  '[Migration] Delete Order Detail',
  props<{ orderDetailId: string }>()
);

// Step2 (Pallet Control) Migration Actions
export const initializeStep2State = createAction(
  '[Migration] Initialize Step2 State',
  props<{ packages: any[]; remainingProducts: any[] }>()
);

export const updateStep2Packages = createAction(
  '[Migration] Update Step2 Packages',
  props<{ packages: any[] }>()
);

export const addPackage = createAction(
  '[Migration] Add Package',
  props<{ package: any }>()
);

export const updatePackage = createAction(
  '[Migration] Update Package',
  props<{ package: any }>()
);

export const deletePackage = createAction(
  '[Migration] Delete Package',
  props<{ packageId: string }>()
);

export const updateAvailableProducts = createAction(
  '[Migration] Update Available Products',
  props<{ availableProducts: any[] }>()
);

// Step3 (Result Step) Migration Actions
export const initializeStep3State = createAction(
  '[Migration] Initialize Step3 State',
  props<{ optimizationResult: any[]; reportFiles: any[]; loadingStats?: any; algorithmStats?: any }>()
);

export const updateStep3OptimizationResult = createAction(
  '[Migration] Update Step3 Optimization Result',
  props<{ optimizationResult: any[] }>()
);

export const updateStep3ReportFiles = createAction(
  '[Migration] Update Step3 Report Files',
  props<{ reportFiles: any[] }>()
);

export const updateStep3LoadingStats = createAction(
  '[Migration] Update Step3 Loading Stats',
  props<{ loadingStats: any }>()
);

export const updateStep3AlgorithmStats = createAction(
  '[Migration] Update Step3 Algorithm Stats',
  props<{ algorithmStats: any }>()
);

export const setStep3HasResults = createAction(
  '[Migration] Set Step3 Has Results',
  props<{ hasResults: boolean }>()
);

// Step3 Enhanced Actions (dosyanın sonuna ekle)
export const updateStep3DataChangeHistory = createAction(
  '[Step3] Update Data Change History',
  props<{ changes: any[] }>()
);

export const setStep3ThreeJSError = createAction(
  '[Step3] Set ThreeJS Error',
  props<{ hasError: boolean; errorMessage?: string }>()
);

export const setStep3ViewType = createAction(
  '[Step3] Set View Type',
  props<{ viewType: string }>()
);

export const setStep3UnsavedChanges = createAction(
  '[Step3] Set Unsaved Changes',
  props<{ hasUnsavedChanges: boolean }>()
);

export const updateStep3ProcessedPackages = createAction(
  '[Step3] Update Processed Packages',
  props<{ processedPackages: any[] }>()
);

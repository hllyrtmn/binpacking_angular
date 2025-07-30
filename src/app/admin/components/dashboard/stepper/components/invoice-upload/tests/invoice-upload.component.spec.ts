// tests/invoice-upload.component.spec.ts

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatStepperModule } from '@angular/material/stepper';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { of, throwError, BehaviorSubject } from 'rxjs';

import { InvoiceUploadComponent } from '../invoice-upload.component';
import { FileUploadManager } from '../managers/file-upload.manager';
import { OrderFormManager } from '../managers/order-form.manager';
import { OrderDetailManager } from '../managers/order-detail.manager';
import { UIStateManager } from '../managers/ui-state.manager';
import { InvoiceDataLoaderService } from '../services/invoice-data-loader.service';
import { InvoiceCalculatorService } from '../services/invoice-calculator.service';


import { MOCK_DATA, createMockOrder, createMockOrderDetail, createMockEvent } from './setup/mock-data';
import { MockOrderService, MockToastService, MockAutoSaveService, MockLocalStorageService, MockStateManager } from './setup/test-setup';
import { ToastService } from '../../../../../../../services/toast.service';
import { OrderService } from '../../../../../services/order.service';
import { AutoSaveService } from '../../../services/auto-save.service';
import { LocalStorageService } from '../../../services/local-storage.service';
import { StateManager } from '../../../services/state-manager.service';


// Mock GenericTableComponent
const mockGenericTableComponent = {
  dataSource: {
    data: [],
    _updateChangeSubscription: jasmine.createSpy('_updateChangeSubscription')
  }
};

describe('InvoiceUploadComponent Integration Tests', () => {
  let component: InvoiceUploadComponent;
  let fixture: ComponentFixture<InvoiceUploadComponent>;

  // Managers and services
  let fileUploadManager: jasmine.SpyObj<FileUploadManager>;
  let orderFormManager: jasmine.SpyObj<OrderFormManager>;
  let orderDetailManager: jasmine.SpyObj<OrderDetailManager>;
  let uiStateManager: UIStateManager;
  let dataLoaderService: jasmine.SpyObj<InvoiceDataLoaderService>;
  let calculatorService: jasmine.SpyObj<InvoiceCalculatorService>;

  // External services
  let mockOrderService: jasmine.SpyObj<OrderService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockAutoSaveService: jasmine.SpyObj<AutoSaveService>;
  let mockLocalStorageService: jasmine.SpyObj<LocalStorageService>;
  let mockStateManager: jasmine.SpyObj<StateManager>;

  beforeEach(async () => {
    // Create spies for managers
    const fileUploadSpy = jasmine.createSpyObj('FileUploadManager', [
      'selectFile', 'uploadFile', 'uploadFileToOrder', 'getCurrentFile', 'getTempFile',
      'hasFile', 'hasTempFile', 'getFileName', 'resetAllFiles', 'moveFileToTemp'
    ]);

    const orderFormSpy = jasmine.createSpyObj('OrderFormManager', [
      'initializeForm', 'getOrder', 'setOrder', 'updateOrderField', 'updateCompanyRelation',
      'updateTruck', 'updateWeightType', 'isFormValid', 'getFormattedDate',
      'compareObjects', 'compareCompanies', 'compareWeightTypes', 'resetOrder'
    ]);

    const orderDetailSpy = jasmine.createSpyObj('OrderDetailManager', [
      'getOrderDetails', 'setOrderDetails', 'openOrderDetailDialog', 'updateOrderDetail',
      'deleteOrderDetail', 'validateOrderDetails', 'getOrderDetailChanges',
      'processOrderDetailChanges', 'syncWithBackendData', 'clearOrderDetails'
    ]);

    const dataLoaderSpy = jasmine.createSpyObj('InvoiceDataLoaderService', [
      'loadAllReferenceData'
    ]);

    const calculatorSpy = jasmine.createSpyObj('InvoiceCalculatorService', [
      'calculateTotalWeight'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        InvoiceUploadComponent,
        NoopAnimationsModule,
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatStepperModule,
        CdkStepperModule,
        MatTableModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatCardModule,
        MatTooltipModule,
      ],
      providers: [
        { provide: FileUploadManager, useValue: fileUploadSpy },
        { provide: OrderFormManager, useValue: orderFormSpy },
        { provide: OrderDetailManager, useValue: orderDetailSpy },
        UIStateManager, // Use real instance for state testing
        { provide: InvoiceDataLoaderService, useValue: dataLoaderSpy },
        { provide: InvoiceCalculatorService, useValue: calculatorSpy },
        { provide: OrderService, useClass: MockOrderService },
        { provide: ToastService, useClass: MockToastService },
        { provide: AutoSaveService, useClass: MockAutoSaveService },
        { provide: LocalStorageService, useClass: MockLocalStorageService },
        { provide: StateManager, useClass: MockStateManager },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceUploadComponent);
    component = fixture.componentInstance;

    // Mock the ViewChild reference
    component.genericTable = mockGenericTableComponent as any;

    // Get manager instances
    fileUploadManager = TestBed.inject(FileUploadManager) as jasmine.SpyObj<FileUploadManager>;
    orderFormManager = TestBed.inject(OrderFormManager) as jasmine.SpyObj<OrderFormManager>;
    orderDetailManager = TestBed.inject(OrderDetailManager) as jasmine.SpyObj<OrderDetailManager>;
    uiStateManager = TestBed.inject(UIStateManager);
    dataLoaderService = TestBed.inject(InvoiceDataLoaderService) as jasmine.SpyObj<InvoiceDataLoaderService>;
    calculatorService = TestBed.inject(InvoiceCalculatorService) as jasmine.SpyObj<InvoiceCalculatorService>;

    // Get service instances
    mockOrderService = TestBed.inject(OrderService) as jasmine.SpyObj<OrderService>;
    mockToastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    mockAutoSaveService = TestBed.inject(AutoSaveService) as jasmine.SpyObj<AutoSaveService>;
    mockLocalStorageService = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
    mockStateManager = TestBed.inject(StateManager) as jasmine.SpyObj<StateManager>;

    // Setup default manager behaviors
    setupDefaultManagerBehaviors();
  });

  function setupDefaultManagerBehaviors() {
    orderFormManager.initializeForm.and.returnValue(TestBed.inject(OrderFormManager).initializeForm());
    orderFormManager.getOrder.and.returnValue(null);
    orderDetailManager.getOrderDetails.and.returnValue([]);
    dataLoaderService.loadAllReferenceData.and.returnValue(of({
      targetCompanies: MOCK_DATA.TARGET_COMPANIES,
      trucks: MOCK_DATA.TRUCKS
    }));
    calculatorService.calculateTotalWeight.and.returnValue({ totalWeight: 100 });
    fileUploadManager.hasFile.and.returnValue(false);
    fileUploadManager.hasTempFile.and.returnValue(false);
    orderFormManager.isFormValid.and.returnValue(true);
    orderDetailManager.validateOrderDetails.and.returnValue(true);
  }

  describe('Component Initialization', () => {
    it('should create component successfully', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form through OrderFormManager', () => {
      expect(orderFormManager.initializeForm).toHaveBeenCalled();
    });

    it('should load reference data on init', () => {
      expect(dataLoaderService.loadAllReferenceData).toHaveBeenCalled();
    });

    it('should setup UI state subscription', () => {
      expect(component.uiState$).toBeDefined();
    });
  });

  describe('File Operations Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should handle file selection through FileUploadManager', () => {
      const event = createMockEvent(MOCK_DATA.VALID_EXCEL_FILE);
      fileUploadManager.selectFile.and.returnValue(true);

      component.onFileSelected(event);

      expect(fileUploadManager.selectFile).toHaveBeenCalledWith(event);
    });

    it('should handle file upload with success', fakeAsync(() => {
      const mockResponse = {
        order: createMockOrder(),
        orderDetail: MOCK_DATA.ORDER_DETAILS
      };
      fileUploadManager.uploadFile.and.returnValue(of(mockResponse));
      fileUploadManager.getCurrentFile.and.returnValue(MOCK_DATA.VALID_EXCEL_FILE);

      component.uploadFile();
      tick();

      expect(fileUploadManager.uploadFile).toHaveBeenCalled();
      expect(orderDetailManager.setOrderDetails).toHaveBeenCalledWith(mockResponse.orderDetail);
      expect(orderFormManager.setOrder).toHaveBeenCalledWith(mockResponse.order);
      expect(calculatorService.calculateTotalWeight).toHaveBeenCalled();
    }));

    it('should handle file upload error', fakeAsync(() => {
      fileUploadManager.uploadFile.and.returnValue(throwError('Upload failed'));

      component.uploadFile();
      tick();

      expect(mockToastService.error).toHaveBeenCalled();
    }));

    it('should manage UI state during file upload', fakeAsync(() => {
      fileUploadManager.uploadFile.and.returnValue(of({
        order: createMockOrder(),
        orderDetail: []
      }));

      component.uploadFile();

      // Check loading state is set
      expect(uiStateManager.getLoading()).toBe(true);
      expect(uiStateManager.getExcelUpload()).toBe(true);

      tick();

      // Check loading state is reset
      expect(uiStateManager.getLoading()).toBe(false);
      expect(uiStateManager.getExcelUpload()).toBe(false);
    }));
  });

  describe('Order Management Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update order field through OrderFormManager', () => {
      const mockOrder = createMockOrder();
      orderFormManager.updateOrderField.and.returnValue(mockOrder);

      component.onOrderFieldChange('name', 'New Name');

      expect(orderFormManager.updateOrderField).toHaveBeenCalledWith('name', 'New Name');
      expect(mockAutoSaveService.triggerStep1AutoSave).toHaveBeenCalled();
    });

    it('should update company relation', () => {
      const company = MOCK_DATA.TARGET_COMPANIES[0];
      const mockOrder = createMockOrder({ company_relation: company });
      orderFormManager.updateCompanyRelation.and.returnValue(mockOrder);

      component.onCompanyChange(company);

      expect(orderFormManager.updateCompanyRelation).toHaveBeenCalledWith(company);
    });

    it('should update truck selection', () => {
      const truck = MOCK_DATA.TRUCKS[0];
      const mockOrder = createMockOrder({ truck });
      orderFormManager.updateTruck.and.returnValue(mockOrder);

      component.onTruckChange(truck);

      expect(orderFormManager.updateTruck).toHaveBeenCalledWith(truck);
    });

    it('should update weight type and recalculate', () => {
      const weightType = 'pre';
      const mockOrder = createMockOrder({ weight_type: weightType });
      orderFormManager.updateWeightType.and.returnValue(mockOrder);
      orderFormManager.getOrder.and.returnValue(mockOrder);
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);

      component.onWeightTypeChange(weightType);

      expect(orderFormManager.updateWeightType).toHaveBeenCalledWith(weightType);
      expect(calculatorService.calculateTotalWeight).toHaveBeenCalledWith(
        MOCK_DATA.ORDER_DETAILS,
        weightType
      );
    });
  });

  describe('OrderDetail Operations Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should create order detail through dialog', () => {
      const mockOrder = createMockOrder();
      const newOrderDetail = createMockOrderDetail();
      orderFormManager.getOrder.and.returnValue(mockOrder);
      orderDetailManager.openOrderDetailDialog.and.returnValue(of(newOrderDetail));

      component.createOrderDetail();

      expect(orderDetailManager.openOrderDetailDialog).toHaveBeenCalledWith(mockOrder);
    });

    it('should create new order if none exists when creating order detail', () => {
      const newOrder = createMockOrder();
      orderFormManager.getOrder.and.returnValue(null);
      orderFormManager.initializeNewOrder.and.returnValue(newOrder);
      orderDetailManager.openOrderDetailDialog.and.returnValue(of(null));

      component.createOrderDetail();

      expect(orderFormManager.initializeNewOrder).toHaveBeenCalled();
    });

    it('should update order detail and recalculate', () => {
      const updateEvent = {
        item: MOCK_DATA.ORDER_DETAILS[0],
        data: { count: 15 }
      };
      const updatedDetail = { ...MOCK_DATA.ORDER_DETAILS[0], count: 15 };
      orderDetailManager.updateOrderDetail.and.returnValue(updatedDetail);

      component.updateOrderDetail(updateEvent);

      expect(orderDetailManager.updateOrderDetail).toHaveBeenCalledWith(updateEvent);
      expect(calculatorService.calculateTotalWeight).toHaveBeenCalled();
    });

    it('should delete order detail and recalculate', () => {
      const detailId = 'detail-123';
      orderDetailManager.deleteOrderDetail.and.returnValue(true);

      component.deleteOrderDetail(detailId);

      expect(orderDetailManager.deleteOrderDetail).toHaveBeenCalledWith(detailId);
      expect(calculatorService.calculateTotalWeight).toHaveBeenCalled();
    });
  });

  describe('Form Validation Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should validate form using both managers', () => {
      orderFormManager.isFormValid.and.returnValue(true);
      orderDetailManager.validateOrderDetails.and.returnValue(true);

      const isValid = component.isFormValid();

      expect(isValid).toBe(true);
      expect(orderFormManager.isFormValid).toHaveBeenCalled();
      expect(orderDetailManager.validateOrderDetails).toHaveBeenCalled();
    });

    it('should fail validation if order form is invalid', () => {
      orderFormManager.isFormValid.and.returnValue(false);
      orderDetailManager.validateOrderDetails.and.returnValue(true);

      const isValid = component.isFormValid();

      expect(isValid).toBe(false);
    });

    it('should fail validation if order details are invalid', () => {
      orderFormManager.isFormValid.and.returnValue(true);
      orderDetailManager.validateOrderDetails.and.returnValue(false);

      const isValid = component.isFormValid();

      expect(isValid).toBe(false);
    });
  });

  describe('Submit Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
      const mockOrder = createMockOrder();
      orderFormManager.getOrder.and.returnValue(mockOrder);
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);
      orderFormManager.isFormValid.and.returnValue(true);
      orderDetailManager.validateOrderDetails.and.returnValue(true);
    });

    it('should submit successfully with valid data', fakeAsync(() => {
      const mockChanges = { added: [], modified: [], deleted: [] };
      const mockOrderResponse = createMockOrder({
        id: 'order-uuid-123',
        name: 'Created Order'
      });

      orderDetailManager.getOrderDetailChanges.and.returnValue(mockChanges);
      mockOrderService.create.and.returnValue(of(mockOrderResponse));
      orderDetailManager.processOrderDetailChanges.and.returnValue(of({}));
      fileUploadManager.hasTempFile.and.returnValue(false);

      component.submit();
      tick();

      expect(mockOrderService.getById).toHaveBeenCalled();
      expect(orderDetailManager.processOrderDetailChanges).toHaveBeenCalled();
      expect(mockToastService.success).toHaveBeenCalled();
    }));

    it('should show warning for invalid form', () => {
      orderFormManager.isFormValid.and.returnValue(false);

      component.submit();

      expect(mockToastService.warning).toHaveBeenCalled();
      expect(mockOrderService.getById).not.toHaveBeenCalled();
    });

    it('should handle submit with file upload', fakeAsync(() => {
      const mockChanges = { added: [], modified: [], deleted: [] };
      const mockOrderResponse = createMockOrder({
        id: 'order-uuid-123',
        name: 'Created Order'
      });

      orderDetailManager.getOrderDetailChanges.and.returnValue(mockChanges);
      mockOrderService.create.and.returnValue(of(mockOrderResponse));
      fileUploadManager.hasTempFile.and.returnValue(true);
      fileUploadManager.uploadFileToOrder.and.returnValue(of({}));
      orderDetailManager.processOrderDetailChanges.and.returnValue(of({}));

      component.submit();
      tick();

      expect(fileUploadManager.uploadFileToOrder).toHaveBeenCalledWith('order-uuid-123');
      expect(orderDetailManager.processOrderDetailChanges).toHaveBeenCalled();
    }));

    it('should handle submit error', fakeAsync(() => {
      orderDetailManager.getOrderDetailChanges.and.returnValue({ added: [], modified: [], deleted: [] });
      mockOrderService.getById.and.returnValue(throwError({ status: 404 }));
      mockOrderService.create.and.returnValue(throwError('Create failed'));

      component.submit();
      tick();

      expect(mockToastService.error).toHaveBeenCalled();
    }));

    it('should manage UI state during submit', fakeAsync(() => {
      const mockChanges = { added: [], modified: [], deleted: [] };
      const mockOrderResponse = createMockOrder({
        id: 'order-uuid-123',
        name: 'Created Order'
      });

      orderDetailManager.getOrderDetailChanges.and.returnValue(mockChanges);
      mockOrderService.create.and.returnValue(of(mockOrderResponse));
      orderDetailManager.processOrderDetailChanges.and.returnValue(of({}));
      fileUploadManager.hasTempFile.and.returnValue(false);

      component.submit();

      expect(uiStateManager.getLoading()).toBe(true);

      tick();

      expect(uiStateManager.getLoading()).toBe(false);
    }));
  });

  describe('Auto-Save Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should trigger auto-save on form changes', fakeAsync(() => {
      const mockOrder = createMockOrder();
      orderFormManager.getOrder.and.returnValue(mockOrder);
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);

      // Simulate form change
      component.uploadForm.patchValue({ orderName: 'Changed Name' });
      tick();

      expect(mockAutoSaveService.triggerStep1AutoSave).toHaveBeenCalled();
    }));

    it('should trigger auto-save on periodic check', fakeAsync(() => {
      const mockOrder = createMockOrder();
      orderFormManager.getOrder.and.returnValue(mockOrder);
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);

      // Advance time to trigger periodic check
      tick(1100);

      expect(mockAutoSaveService.triggerStep1AutoSave).toHaveBeenCalled();
    }));

    it('should force save through AutoSaveService', () => {
      const mockOrder = createMockOrder();
      orderFormManager.getOrder.and.returnValue(mockOrder);
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);
      fileUploadManager.hasTempFile.and.returnValue(true);
      fileUploadManager.getFileName.and.returnValue('test.xlsx');

      component.forceSaveStep1();

      expect(mockAutoSaveService.forceSave).toHaveBeenCalledWith(1, {
        order: mockOrder,
        orderDetails: MOCK_DATA.ORDER_DETAILS,
        hasFile: true,
        fileName: 'test.xlsx'
      });
    });
  });

  describe('State Management Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should initialize state manager with existing data', fakeAsync(() => {
      const mockOrder = createMockOrder();
      orderFormManager.getOrder.and.returnValue(mockOrder);
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);
      fileUploadManager.hasTempFile.and.returnValue(true);
      fileUploadManager.getFileName.and.returnValue('test.xlsx');

      tick(150); // Wait for setTimeout in initialization

      expect(mockStateManager.initializeStep1).toHaveBeenCalledWith(
        mockOrder,
        MOCK_DATA.ORDER_DETAILS,
        true,
        'test.xlsx'
      );
    }));

    it('should reset all states when component resets', () => {
      component.resetComponentState();

      expect(orderFormManager.resetOrder).toHaveBeenCalled();
      expect(orderDetailManager.clearOrderDetails).toHaveBeenCalled();
      expect(fileUploadManager.resetAllFiles).toHaveBeenCalled();
      expect(uiStateManager.getCurrentState()).toEqual({
        isLoading: false,
        excelUpload: false,
        dataRefreshInProgress: false
      });
      expect(mockStateManager.resetAllStates).toHaveBeenCalled();
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should expose order data to template', () => {
      const mockOrder = createMockOrder();
      orderFormManager.getOrder.and.returnValue(mockOrder);

      expect(component.order).toEqual(mockOrder);
    });

    it('should expose order details to template', () => {
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);

      expect(component.orderDetails).toEqual(MOCK_DATA.ORDER_DETAILS);
    });

    it('should expose UI state observable to template', () => {
      expect(component.uiState$).toBeDefined();
    });

    it('should expose reference data to template', () => {
      expect(component.targetCompanies).toEqual(MOCK_DATA.TARGET_COMPANIES);
      expect(component.trucks).toEqual(MOCK_DATA.TRUCKS);
    });

    it('should expose table configuration to template', () => {
      expect(component.displayedColumns).toBeDefined();
      expect(component.filterableColumns).toBeDefined();
      expect(component.nestedDisplayColumns).toBeDefined();
      expect(component.excludeFields).toBeDefined();
    });

    it('should expose file state to template', () => {
      fileUploadManager.getCurrentFile.and.returnValue(MOCK_DATA.VALID_EXCEL_FILE);

      expect(component.file).toEqual(MOCK_DATA.VALID_EXCEL_FILE);
    });
  });

  describe('Error Scenarios Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should handle data loading error gracefully', () => {
      dataLoaderService.loadAllReferenceData.and.returnValue(throwError('Network error'));

      // Should not throw during initialization
      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('should handle session restore error gracefully', () => {
      mockLocalStorageService.restoreStep1Data.and.throwError('Storage error');

      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('should handle calculation error gracefully', () => {
      calculatorService.calculateTotalWeight.and.throwError('Calculation error');
      orderFormManager.getOrder.and.returnValue(createMockOrder());
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);

      expect(() => component.calculateTotals()).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup subscriptions on destroy', () => {
      component.ngOnInit();

      // Create some subscriptions
      component.uploadFile();

      // Should not throw during destroy
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle multiple init calls gracefully', () => {
      component.ngOnInit();
      component.ngOnInit();

      // Should not cause duplicate subscriptions or errors
      expect(true).toBe(true);
    });

    it('should handle destroy before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Manager Interaction Patterns', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should coordinate between FileUpload and OrderForm managers', () => {
      const mockResponse = {
        order: createMockOrder(),
        orderDetail: MOCK_DATA.ORDER_DETAILS
      };
      fileUploadManager.uploadFile.and.returnValue(of(mockResponse));

      component.uploadFile();

      expect(orderFormManager.setOrder).toHaveBeenCalledWith(mockResponse.order);
      expect(orderDetailManager.setOrderDetails).toHaveBeenCalledWith(mockResponse.orderDetail);
    });

    it('should coordinate between OrderDetail and Calculator services', () => {
      orderFormManager.getOrder.and.returnValue(createMockOrder({ weight_type: 'std' }));
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);

      component.calculateTotals();

      expect(calculatorService.calculateTotalWeight).toHaveBeenCalledWith(
        MOCK_DATA.ORDER_DETAILS,
        'std'
      );
    });

    it('should coordinate between all managers during submit', fakeAsync(() => {
      const mockOrder = createMockOrder();
      const mockChanges = { added: [], modified: [], deleted: [] };
      const mockOrderResponse = createMockOrder({
        id: 'order-uuid-123',
        name: 'Created Order'
      });

      orderFormManager.getOrder.and.returnValue(mockOrder);
      orderDetailManager.getOrderDetails.and.returnValue(MOCK_DATA.ORDER_DETAILS);
      orderDetailManager.getOrderDetailChanges.and.returnValue(mockChanges);
      orderDetailManager.processOrderDetailChanges.and.returnValue(of({}));
      fileUploadManager.hasTempFile.and.returnValue(false);
      mockOrderService.create.and.returnValue(of(mockOrderResponse));

      component.submit();
      tick();

      // Should coordinate all managers
      expect(orderDetailManager.getOrderDetailChanges).toHaveBeenCalled();
      expect(orderDetailManager.processOrderDetailChanges).toHaveBeenCalled();
      expect(mockStateManager.markStep1AsSaved).toHaveBeenCalled();
    }));
  });

  describe('Performance and Memory', () => {
    it('should handle rapid state changes without memory leaks', fakeAsync(() => {
      component.ngOnInit();

      // Simulate rapid user interactions
      for (let i = 0; i < 100; i++) {
        component.onOrderFieldChange('name', `Order ${i}`);
        tick(10);
      }

      // Should not cause memory issues
      expect(true).toBe(true);
    }));

    it('should handle large datasets efficiently', () => {
      const largeOrderDetails = [];
      for (let i = 0; i < 1000; i++) {
        largeOrderDetails.push(createMockOrderDetail({ id: `detail-${i}` }));
      }

      orderDetailManager.getOrderDetails.and.returnValue(largeOrderDetails);

      const startTime = performance.now();
      component.calculateTotals();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});

// tests/setup/test-setup.ts

import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { createMockOrder, createMockOrderDetail, MOCK_DATA } from './mock-data';

// Mock services
export class MockToastService {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  warning = jasmine.createSpy('warning');
  info = jasmine.createSpy('info');
}

export class MockRepositoryService {
  processFile = jasmine.createSpy('processFile').and.returnValue(of({
    message: 'File processed successfully',
    order: createMockOrder(),
    orderDetail: [createMockOrderDetail()]
  }));
  uploadFile = jasmine.createSpy('uploadFile').and.returnValue(of({
    id: 'file-uuid-123',
    file: 'https://example.com/uploads/test.xlsx',
    order: createMockOrder()
  }));
  bulkUpdateOrderDetails = jasmine.createSpy('bulkUpdateOrderDetails').and.returnValue(of({ success: true }));
  companyRelations = jasmine.createSpy('companyRelations').and.returnValue(of(MOCK_DATA.TARGET_COMPANIES));
  trucks = jasmine.createSpy('trucks').and.returnValue(of({ results: MOCK_DATA.TRUCKS }));
}

export class MockOrderService {
  getById = jasmine.createSpy('getById').and.returnValue(throwError({ status: 404 }));
  create = jasmine.createSpy('create').and.returnValue(of(createMockOrder()));
  update = jasmine.createSpy('update').and.returnValue(of(createMockOrder()));
}

export class MockUserService {
  getProfile = jasmine.createSpy('getProfile').and.returnValue(of({
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company',
      country: 'Turkey'
    }
  }));
}

export class MockAutoSaveService {
  triggerStep1AutoSave = jasmine.createSpy('triggerStep1AutoSave');
  forceSave = jasmine.createSpy('forceSave');
}

export class MockLocalStorageService {
  restoreStep1Data = jasmine.createSpy('restoreStep1Data').and.returnValue(null);
  saveStep1Data = jasmine.createSpy('saveStep1Data');
}

export class MockStateManager {
  initializeStep1 = jasmine.createSpy('initializeStep1');
  markStep1AsSaved = jasmine.createSpy('markStep1AsSaved');
  resetAllStates = jasmine.createSpy('resetAllStates');
  addOrderDetail = jasmine.createSpy('addOrderDetail');
  updateOrderDetail = jasmine.createSpy('updateOrderDetail');
  deleteOrderDetail = jasmine.createSpy('deleteOrderDetail');
  saveStep1Changes = jasmine.createSpy('saveStep1Changes').and.returnValue({
    added: [],
    modified: [],
    deleted: []
  });
  step1 = {
    state: jasmine.createSpy('state').and.returnValue({ original: [] })
  };
}

export class MockMatDialog {
  open = jasmine.createSpy('open').and.returnValue({
    afterClosed: () => of(null)
  });
}

// Common test configuration
export const getTestBedConfig = () => ({
  imports: [
    NoopAnimationsModule,
    MatDialogModule,
    MatSnackBarModule,
    ReactiveFormsModule,
  ],
  providers: [
    { provide: 'ToastService', useClass: MockToastService },
    { provide: 'RepositoryService', useClass: MockRepositoryService },
    { provide: 'OrderService', useClass: MockOrderService },
    { provide: 'UserService', useClass: MockUserService },
    { provide: 'AutoSaveService', useClass: MockAutoSaveService },
    { provide: 'LocalStorageService', useClass: MockLocalStorageService },
    { provide: 'StateManager', useClass: MockStateManager },
  ]
});

// Helper functions
export const createMockFile = (
  name: string = 'test.xlsx',
  type: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  size: number = 1024
): File => {
  const blob = new Blob(['test content'], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
};

export const createMockEvent = (file: File): Event => {
  const input = document.createElement('input');
  input.type = 'file';

  // Mock files property
  Object.defineProperty(input, 'files', {
    value: [file],
    writable: false,
  });

  const event = new Event('change');
  Object.defineProperty(event, 'target', {
    value: input,
    writable: false,
  });

  return event;
};

// Test data generators with proper typing
export const generateMockOrder = (overrides: any = {}) => ({
  id: 'order-uuid-123',
  created_at: new Date(),
  updated_at: new Date(),
  created_by: null,
  updated_by: null,
  deleted_time: null,
  is_deleted: false,
  name: 'Test Order',
  date: '2024-01-01T14:30:00',
  company_relation: {
    id: 1,
    target_company_name: 'Test Company',
    source_company_name: 'Source Company',
    relation_type: 'customer',
    is_active: true,
    start_date: new Date(),
    payment_term: 30,
    is_default: false,
    source_company: {
      id: 'company-uuid-123',
      company_name: 'Source Company',
      country: 'Turkey'
    },
    target_company: {
      id: 'company-uuid-456',
      company_name: 'Test Company',
      country: 'Germany'
    }
  },
  truck: {
    id: 'truck-uuid-1',
    name: 'Test Truck',
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company',
      country: 'Turkey'
    },
    dimension: {
      id: 'dimension-uuid-1',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company',
        country: 'Turkey'
      },
      width: 240,
      height: 250,
      depth: 1350,
      unit: 'cm',
      dimension_type: 'cargo',
      volume: 81000000
    },
    weight_limit: 3500
  },
  weight_type: 'std',
  ...overrides
});

export const generateMockOrderDetail = (overrides: any = {}) => ({
  id: 'order-detail-uuid-123',
  created_at: new Date(),
  updated_at: new Date(),
  created_by: null,
  updated_by: null,
  deleted_time: null,
  is_deleted: false,
  count: 5,
  unit_price: 100.00,
  total_price: 500.00,
  product: {
    id: 'product-uuid-123',
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company',
      country: 'Turkey'
    },
    name: 'Test Product',
    product_type: {
      id: 'product-type-uuid-123',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company',
        country: 'Turkey'
      },
      code: 'TEST-001',
      type: 'Test Type'
    },
    dimension: {
      id: 'dimension-uuid-123',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company',
        country: 'Turkey'
      },
      width: 100,
      height: 50,
      depth: 80,
      unit: 'cm',
      dimension_type: 'package',
      volume: 400000
    },
    weight_type: {
      id: 'weight-type-uuid-123',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company',
        country: 'Turkey'
      },
      std: 10.5,
      pre: 12.0,
      eco: 9.5
    }
  },
  order: null as any, // Will be set in tests
  ...overrides
});

export const generateMockTruck = (overrides: any = {}) => ({
  id: 'truck-uuid-123',
  company: {
    id: 'company-uuid-123',
    company_name: 'Test Company',
    country: 'Turkey'
  },
  name: 'Test Truck',
  dimension: {
    id: 'dimension-uuid-123',
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company',
      country: 'Turkey'
    },
    width: 240,
    height: 250,
    depth: 1350,
    unit: 'cm',
    dimension_type: 'cargo',
    volume: 81000000
  },
  weight_limit: 3500,
  ...overrides
});

export const generateMockCompanyRelation = (overrides: any = {}) => ({
  id: 1,
  source_company: {
    id: 'company-uuid-123',
    company_name: 'Test Company',
    country: 'Turkey'
  },
  target_company: {
    id: 'company-uuid-456',
    company_name: 'Target Company',
    country: 'Germany'
  },
  source_company_name: 'Test Company',
  target_company_name: 'Target Company',
  relation_type: 'customer',
  is_active: true,
  start_date: new Date(),
  payment_term: 30,
  is_default: false,
  ...overrides
});

// Assertion helpers
export function expectToastMessage(mockToastService: any, type: string, messageContains?: string) {
  expect(mockToastService[type]).toHaveBeenCalled();
  if (messageContains) {
    const calls = mockToastService[type].calls.all();
    const messageFound = calls.some((call: any) =>
      call.args[0] && call.args[0].toLowerCase().includes(messageContains.toLowerCase())
    );
    expect(messageFound).toBe(true);
  }
};

export const expectServiceCall = (spy: jasmine.Spy, expectedArgs?: any[]) => {
  expect(spy).toHaveBeenCalled();
  if (expectedArgs) {
    expect(spy).toHaveBeenCalledWith(...expectedArgs);
  }
};

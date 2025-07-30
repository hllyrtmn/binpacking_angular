// tests/managers/order-form.manager.spec.ts

import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { OrderFormManager } from '../../managers/order-form.manager';
import { FileUploadManager } from '../../managers/file-upload.manager';
import { MOCK_DATA, createMockOrder } from '../setup/mock-data';
import { Order } from '../../../../../../../../models/order.interface';

describe('OrderFormManager', () => {
  let manager: OrderFormManager;
  let mockFileUploadManager: jasmine.SpyObj<FileUploadManager>;

  beforeEach(() => {
    const fileUploadSpy = jasmine.createSpyObj('FileUploadManager', ['fileValidator']);

    TestBed.configureTestingModule({
      providers: [
        OrderFormManager,
        FormBuilder,
        { provide: FileUploadManager, useValue: fileUploadSpy }
      ]
    });

    manager = TestBed.inject(OrderFormManager);
    mockFileUploadManager = TestBed.inject(FileUploadManager) as jasmine.SpyObj<FileUploadManager>;
    mockFileUploadManager.fileValidator.and.returnValue(null);
  });

  afterEach(() => {
    manager.resetOrder();
  });

  describe('Form Initialization', () => {
    it('should initialize form with correct structure', () => {
      const form = manager.initializeForm();

      expect(form).toBeDefined();
      expect(form.get('fileInput')).toBeDefined();
      expect(form.get('orderName')).toBeDefined();
      expect(form.get('orderDate')).toBeDefined();
      expect(form.get('companyRelation')).toBeDefined();
      expect(form.get('truck')).toBeDefined();
      expect(form.get('weightType')).toBeDefined();
    });

    it('should set required validators on form fields', () => {
      const form = manager.initializeForm();

      // Test required validators
      form.get('orderName')?.setValue('');
      expect(form.get('orderName')?.hasError('required')).toBe(true);

      form.get('orderDate')?.setValue('');
      expect(form.get('orderDate')?.hasError('required')).toBe(true);

      form.get('companyRelation')?.setValue('');
      expect(form.get('companyRelation')?.hasError('required')).toBe(true);
    });

    it('should use file validator for file input', () => {
      manager.initializeForm();

      expect(mockFileUploadManager.fileValidator).toBeDefined();
    });
  });

  describe('Order Management', () => {
    it('should initialize new order with default values', () => {
      const order = manager.initializeNewOrder();

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.name).toBe('');
      expect(order.date).toBeNull();
      expect(order.company_relation).toBeNull();
      expect(order.truck).toBeNull();
      expect(order.weight_type).toBe('');
    });

    it('should set and get order correctly', () => {
      const mockOrder = createMockOrder();

      manager.setOrder(mockOrder);
      const retrievedOrder = manager.getOrder();

      expect(retrievedOrder).toEqual(mockOrder);
    });

    it('should return null when no order is set', () => {
      const order = manager.getOrder();

      expect(order).toBeNull();
    });
  });

  describe('Form Validation and Updates', () => {
    let mockOrder: Order;

    beforeEach(() => {
      mockOrder = createMockOrder();
      manager.initializeForm();
    });

    it('should update form validation with order data', () => {
      manager.updateFormValidation(mockOrder);
      const form = manager.getForm();

      expect(form.get('orderName')?.value).toBe(mockOrder.name);
      expect(form.get('orderDate')?.value).toEqual(mockOrder.date);
      expect(form.get('companyRelation')?.value).toEqual(mockOrder.company_relation);
      expect(form.get('truck')?.value).toEqual(mockOrder.truck);
      expect(form.get('weightType')?.value).toBe(mockOrder.weight_type);
    });

    it('should validate form correctly with complete data', () => {
      manager.setOrder(mockOrder);

      expect(manager.isFormValid()).toBe(true);
    });

    it('should invalidate form with missing required fields', () => {
      const incompleteOrder = createMockOrder({
        date: undefined,
        company_relation: undefined
      });
      manager.setOrder(incompleteOrder);

      expect(manager.isFormValid()).toBe(false);
    });

    it('should reset form correctly', () => {
      manager.updateFormValidation(mockOrder);
      manager.resetForm();
      const form = manager.getForm();

      expect(form.get('orderName')?.value).toBeFalsy();
      expect(form.get('orderDate')?.value).toBeFalsy();
    });
  });

  describe('Order Field Updates', () => {
    beforeEach(() => {
      manager.initializeForm();
    });

    it('should update order field and create new order if none exists', () => {
      const updatedOrder = manager.updateOrderField('name', 'New Order Name');

      expect(updatedOrder).toBeDefined();
      expect(updatedOrder.name).toBe('New Order Name');
      expect(manager.getOrder()).toEqual(updatedOrder);
    });

    it('should update existing order field', () => {
      const mockOrder = createMockOrder();
      manager.setOrder(mockOrder);

      const updatedOrder = manager.updateOrderField('name', 'Updated Name');

      expect(updatedOrder.name).toBe('Updated Name');
      expect(updatedOrder.id).toBe(mockOrder.id);
    });

    it('should update company relation', () => {
      const company = MOCK_DATA.TARGET_COMPANIES[0];
      const updatedOrder = manager.updateCompanyRelation(company);

      expect(updatedOrder.company_relation).toEqual(company);
    });

    it('should update truck', () => {
      const truck = MOCK_DATA.TRUCKS[0];
      const updatedOrder = manager.updateTruck(truck);

      expect(updatedOrder.truck).toEqual(truck);
    });

    it('should update weight type', () => {
      const weightType = 'pre';
      const updatedOrder = manager.updateWeightType(weightType);

      expect(updatedOrder.weight_type).toBe(weightType);
    });
  });

  describe('Date Formatting', () => {
    it('should format valid date string correctly', () => {
      const dateString = '2024-01-15T14:30:00';
      const formatted = manager.getFormattedDate(dateString);

      expect(formatted).toBe('15.01.2024');
    });

    it('should format ISO date string correctly', () => {
      const isoString = '2024-01-15T14:30:00Z';
      const formatted = manager.getFormattedDate(isoString);

      expect(formatted).toBe('15.01.2024');
    });

    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15T14:30:00');
      const formatted = manager.getFormattedDate(date);

      expect(formatted).toBe('15.01.2024');
    });

    it('should handle null date', () => {
      const formatted = manager.getFormattedDate(null);

      expect(formatted).toBe('N/A');
    });

    it('should handle undefined date', () => {
      const formatted = manager.getFormattedDate(undefined);

      expect(formatted).toBe('N/A');
    });

    it('should handle invalid date string', () => {
      const formatted = manager.getFormattedDate('invalid-date');

      expect(formatted).toBe('N/A');
    });
  });

  describe('Comparison Methods', () => {
    it('should compare objects by id correctly', () => {
      const obj1 = { id: 'uuid-123', name: 'Test' };
      const obj2 = { id: 'uuid-123', name: 'Different' };
      const obj3 = { id: 'uuid-456', name: 'Test' };

      expect(manager.compareObjects(obj1, obj2)).toBe(true);
      expect(manager.compareObjects(obj1, obj3)).toBe(false);
      expect(manager.compareObjects(null, obj1)).toBe(false);
      expect(manager.compareObjects(obj1, null)).toBe(false);
    });

    it('should compare companies by id or target_company_name', () => {
      const company1 = { id: 1, target_company_name: 'ABC Corp' };
      const company2 = { id: 1, target_company_name: 'Different Corp' };
      const company3 = { id: 2, target_company_name: 'ABC Corp' };
      const company4 = { id: 3, target_company_name: 'XYZ Corp' };

      expect(manager.compareCompanies(company1, company2)).toBe(true); // Same id
      expect(manager.compareCompanies(company1, company3)).toBe(true); // Same name
      expect(manager.compareCompanies(company1, company4)).toBe(false);
      expect(manager.compareCompanies(null, company1)).toBe(false);
    });

    it('should compare weight types correctly', () => {
      expect(manager.compareWeightTypes('std', 'std')).toBe(true);
      expect(manager.compareWeightTypes('std', 'pre')).toBe(false);
      expect(manager.compareWeightTypes('', '')).toBe(true);
    });
  });

  describe('Form Data Management', () => {
    beforeEach(() => {
      manager.initializeForm();
    });

    it('should get form data correctly', () => {
      const form = manager.getForm();
      form.patchValue(MOCK_DATA.FORM_VALUES.VALID);

      const formData = manager.getFormData();

      expect(formData.orderName).toBe(MOCK_DATA.FORM_VALUES.VALID.orderName);
      expect(formData.orderDate).toBe(MOCK_DATA.FORM_VALUES.VALID.orderDate);
    });

    it('should handle form data request when form not initialized', () => {
      // Reset form to undefined state
      (manager as any).uploadForm = undefined;

      expect(() => manager.getFormData()).toThrowError();
    });
  });

  describe('Reset Operations', () => {
    it('should reset order and form correctly', () => {
      const mockOrder = createMockOrder();
      manager.setOrder(mockOrder);
      manager.initializeForm();

      manager.resetOrder();

      expect(manager.getOrder()).toBeNull();
    });

    it('should handle reset when no form is initialized', () => {
      expect(() => manager.resetOrder()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle form operations without initialization', () => {
      expect(() => manager.resetForm()).not.toThrow();
    });

    it('should handle order field update with complex objects', () => {
      const complexObject = {
        nested: { value: 'test' },
        array: [1, 2, 3]
      };

      const updatedOrder = manager.updateOrderField('customField', complexObject);

      expect((updatedOrder as any).customField).toEqual(complexObject);
    });

    it('should create new order each time when none exists', () => {
      const order1 = manager.updateOrderField('name', 'Order 1');
      manager.resetOrder();
      const order2 = manager.updateOrderField('name', 'Order 2');

      expect(order1.id).not.toBe(order2.id);
      expect(order1.name).toBe('Order 1');
      expect(order2.name).toBe('Order 2');
    });
  });
});

// tests/managers/order-detail.manager.spec.ts

import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { OrderDetailManager } from '../../managers/order-detail.manager';
import { RepositoryService } from '../../../../services/repository.service';
import { OrderDetailUpdateEvent, OrderDetailChanges } from '../../models/invoice-upload-interfaces';
import { MOCK_DATA, createMockOrder, createMockOrderDetail, ERROR_SCENARIOS } from '../setup/mock-data';
import { MockRepositoryService, MockToastService, MockStateManager, MockMatDialog, expectToastMessage } from '../setup/test-setup';
import { ToastService } from '../../../../../../../../services/toast.service';
import { StateManager } from '../../../../services/state-manager.service';

describe('OrderDetailManager', () => {
  let manager: OrderDetailManager;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockRepositoryService: jasmine.SpyObj<RepositoryService>;
  let mockStateManager: jasmine.SpyObj<StateManager>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrderDetailManager,
        { provide: MatDialog, useClass: MockMatDialog },
        { provide: ToastService, useClass: MockToastService },
        { provide: RepositoryService, useClass: MockRepositoryService },
        { provide: StateManager, useClass: MockStateManager }
      ]
    });

    manager = TestBed.inject(OrderDetailManager);
    mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    mockToastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    mockRepositoryService = TestBed.inject(RepositoryService) as jasmine.SpyObj<RepositoryService>;
    mockStateManager = TestBed.inject(StateManager) as jasmine.SpyObj<StateManager>;
  });

  afterEach(() => {
    manager.clearOrderDetails();
  });

  describe('OrderDetail Management', () => {
    it('should set and get order details correctly', () => {
      const orderDetails = MOCK_DATA.ORDER_DETAILS;

      manager.setOrderDetails(orderDetails);
      const result = manager.getOrderDetails();

      expect(result).toEqual(orderDetails);
      expect(result).not.toBe(orderDetails); // Should be a copy
    });

    it('should add order detail and update state manager', () => {
      const orderDetail = createMockOrderDetail();

      manager.addOrderDetail(orderDetail);
      const orderDetails = manager.getOrderDetails();

      expect(orderDetails[0]).toEqual(orderDetail);
      expect(mockStateManager.addOrderDetail).toHaveBeenCalledWith(orderDetail);
    });

    it('should update existing order detail', () => {
      const orderDetail = createMockOrderDetail();
      manager.setOrderDetails([orderDetail]);

      const updateEvent: OrderDetailUpdateEvent = {
        item: orderDetail,
        data: { count: 15 }
      };

      const result = manager.updateOrderDetail(updateEvent);

      expect(result).toBeDefined();
      expect(result!.count).toBe(15);
      if (result) {
        expect(mockStateManager.updateOrderDetail).toHaveBeenCalledWith(result);
      }
    });

    it('should return null when updating non-existent order detail', () => {
      const orderDetail = createMockOrderDetail();
      const nonExistentDetail = createMockOrderDetail({ id: 'non-existent' });
      manager.setOrderDetails([orderDetail]);

      const updateEvent: OrderDetailUpdateEvent = {
        item: nonExistentDetail,
        data: { count: 15 }
      };

      const result = manager.updateOrderDetail(updateEvent);

      expect(result).toBeNull();
    });

    it('should return null when updating with empty order details', () => {
      const orderDetail = createMockOrderDetail();
      const updateEvent: OrderDetailUpdateEvent = {
        item: orderDetail,
        data: { count: 15 }
      };

      const result = manager.updateOrderDetail(updateEvent);

      expect(result).toBeNull();
    });
  });

  describe('OrderDetail Deletion', () => {
    it('should delete order detail successfully', () => {
      const orderDetail = createMockOrderDetail();
      manager.setOrderDetails([orderDetail]);

      const result = manager.deleteOrderDetail(orderDetail.id);

      expect(result).toBe(true);
      expect(manager.getOrderDetails()).toEqual([]);
      expect(mockStateManager.deleteOrderDetail).toHaveBeenCalledWith(orderDetail.id);
    });

    it('should return false when deleting non-existent order detail', () => {
      const orderDetail = createMockOrderDetail();
      manager.setOrderDetails([orderDetail]);

      const result = manager.deleteOrderDetail('non-existent-id');

      expect(result).toBe(false);
      expect(manager.getOrderDetails()).toEqual([orderDetail]);
    });

    it('should handle deletion from empty list', () => {
      const result = manager.deleteOrderDetail('any-id');

      expect(result).toBe(false);
    });
  });

  describe('Dialog Management', () => {
    it('should open order detail dialog and handle successful result', (done) => {
      const mockOrder = createMockOrder();
      const mockResult = { orderDetail: createMockOrderDetail() };

      mockDialog.open.and.returnValue({
        afterClosed: () => of(mockResult)
      } as any);

      manager.openOrderDetailDialog(mockOrder).subscribe({
        next: (result) => {
          expect(result).toEqual(mockResult.orderDetail);
          expect(mockDialog.open).toHaveBeenCalledWith(
            jasmine.any(Function),
            {
              width: '600px',
              data: mockOrder,
              disableClose: true
            }
          );
          expectToastMessage(mockToastService, 'success');
          done();
        }
      });
    });

    it('should handle dialog cancellation', (done) => {
      const mockOrder = createMockOrder();

      mockDialog.open.and.returnValue({
        afterClosed: () => of(null)
      } as any);

      manager.openOrderDetailDialog(mockOrder).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        }
      });
    });

    it('should handle dialog error', (done) => {
      const mockOrder = createMockOrder();

      mockDialog.open.and.returnValue({
        afterClosed: () => throwError(ERROR_SCENARIOS.NETWORK_ERROR)
      } as any);

      manager.openOrderDetailDialog(mockOrder).subscribe({
        error: (error) => {
          expect(error).toBe(ERROR_SCENARIOS.NETWORK_ERROR);
          done();
        }
      });
    });
  });

  describe('Backend Operations', () => {
    it('should process order detail changes successfully', (done) => {
      const changes: OrderDetailChanges = {
        added: [createMockOrderDetail()],
        modified: [createMockOrderDetail({ id: 'modified' })],
        deleted: ['deleted-id']
      };
      const orderId = 'order-123';
      const mockResponse = { success: true };

      mockRepositoryService.bulkUpdateOrderDetails.and.returnValue(of(mockResponse));

      manager.processOrderDetailChanges(changes, orderId).subscribe({
        next: (result) => {
          expect(result).toEqual(mockResponse);
          expect(mockRepositoryService.bulkUpdateOrderDetails).toHaveBeenCalledWith(
            jasmine.objectContaining({
              added: jasmine.any(Array),
              modified: jasmine.any(Array),
              deleted: jasmine.any(Array)
            }),
            orderId
          );
          done();
        }
      });
    });

    it('should return null when no changes to process', (done) => {
      const changes: OrderDetailChanges = {
        added: [],
        modified: [],
        deleted: []
      };
      const orderId = 'order-123';

      manager.processOrderDetailChanges(changes, orderId).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          expect(mockRepositoryService.bulkUpdateOrderDetails).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should sync with backend data correctly', () => {
      const backendData = [createMockOrderDetail({ id: 'backend-1' })];

      manager.syncWithBackendData(backendData);

      expect(manager.getOrderDetails()).toEqual(backendData);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      manager.setOrderDetails(MOCK_DATA.ORDER_DETAILS);
    });

    it('should get order detail by id', () => {
      const orderDetail = manager.getOrderDetailById(MOCK_DATA.ORDER_DETAILS[0].id);

      expect(orderDetail).toEqual(MOCK_DATA.ORDER_DETAILS[0]);
    });

    it('should return undefined for non-existent id', () => {
      const orderDetail = manager.getOrderDetailById('non-existent');

      expect(orderDetail).toBeUndefined();
    });

    it('should get correct order detail count', () => {
      expect(manager.getOrderDetailCount()).toBe(MOCK_DATA.ORDER_DETAILS.length);
    });

    it('should validate order details correctly', () => {
      expect(manager.validateOrderDetails()).toBe(true);

      manager.clearOrderDetails();
      expect(manager.validateOrderDetails()).toBe(false);
    });

    it('should get order detail changes from state manager', () => {
      const expectedChanges = {
        added: [createMockOrderDetail()],
        modified: [],
        deleted: []
      };
      mockStateManager.saveStep1Changes.and.returnValue(expectedChanges);

      const changes = manager.getOrderDetailChanges();

      expect(changes).toEqual(expectedChanges);
      expect(mockStateManager.saveStep1Changes).toHaveBeenCalled();
    });
  });

  describe('Bulk Operations', () => {
    it('should add multiple order details', () => {
      const existingDetails = [createMockOrderDetail({ id: 'existing' })];
      const newDetails = [
        createMockOrderDetail({ id: 'new-1' }),
        createMockOrderDetail({ id: 'new-2' })
      ];

      manager.setOrderDetails(existingDetails);
      manager.addMultipleOrderDetails(newDetails);

      const result = manager.getOrderDetails();
      expect(result.length).toBe(3);
      expect(result.slice(0, 2)).toEqual(newDetails);
      expect(result[2]).toEqual(existingDetails[0]);
    });

    it('should replace all order details', () => {
      manager.setOrderDetails(MOCK_DATA.ORDER_DETAILS);
      const newDetails = [createMockOrderDetail({ id: 'replacement' })];

      manager.replaceAllOrderDetails(newDetails);

      expect(manager.getOrderDetails()).toEqual(newDetails);
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      manager.setOrderDetails(MOCK_DATA.ORDER_DETAILS);
    });

    it('should search order details by product name', () => {
      const searchTerm = 'Product 1';
      const results = manager.searchOrderDetails(searchTerm);

      expect(results.length).toBe(1);
      expect(results[0].product?.name).toContain('Product 1');
    });

    it('should search order details by product type', () => {
      const searchTerm = 'Standard';
      const results = manager.searchOrderDetails(searchTerm);

      expect(results.length).toBe(1);
      expect(results[0].product?.product_type?.type).toBe('Standard');
    });

    it('should search order details by product code', () => {
      const searchTerm = 'STD-001';
      const results = manager.searchOrderDetails(searchTerm);

      expect(results.length).toBe(1);
      expect(results[0].product?.product_type?.code).toBe('STD-001');
    });

    it('should return all details for empty search term', () => {
      const results = manager.searchOrderDetails('');

      expect(results).toEqual(MOCK_DATA.ORDER_DETAILS);
    });

    it('should return all details for whitespace search term', () => {
      const results = manager.searchOrderDetails('   ');

      expect(results).toEqual(MOCK_DATA.ORDER_DETAILS);
    });

    it('should return empty array for non-matching search', () => {
      const results = manager.searchOrderDetails('non-existent-product');

      expect(results.length).toBe(0);
    });

    it('should handle case-insensitive search', () => {
      const results = manager.searchOrderDetails('PRODUCT 1');

      expect(results.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      manager.setOrderDetails(MOCK_DATA.ORDER_DETAILS);
    });

    it('should calculate total item count correctly', () => {
      const totalCount = manager.getTotalItemCount();
      const expectedTotal = MOCK_DATA.ORDER_DETAILS.reduce((sum, detail) => sum + detail.count, 0);

      expect(totalCount).toBe(expectedTotal);
    });

    it('should handle zero counts', () => {
      const detailsWithZero = [
        createMockOrderDetail({ count: 0 }),
        createMockOrderDetail({ count: 5 })
      ];
      manager.setOrderDetails(detailsWithZero);

      const totalCount = manager.getTotalItemCount();

      expect(totalCount).toBe(5);
    });

    it('should handle missing count values', () => {
      const detailsWithMissingCount = [
        createMockOrderDetail({ count: undefined as any }),
        createMockOrderDetail({ count: 3 })
      ];
      manager.setOrderDetails(detailsWithMissingCount);

      const totalCount = manager.getTotalItemCount();

      expect(totalCount).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations on empty order details list', () => {
      expect(manager.getOrderDetailCount()).toBe(0);
      expect(manager.getTotalItemCount()).toBe(0);
      expect(manager.searchOrderDetails('test')).toEqual([]);
      expect(manager.validateOrderDetails()).toBe(false);
    });

    it('should handle order details with null product', () => {
      const detailWithNullProduct = createMockOrderDetail({ product: null as any });
      manager.setOrderDetails([detailWithNullProduct]);

      const results = manager.searchOrderDetails('test');

      expect(results.length).toBe(0);
    });

    it('should clear order details correctly', () => {
      manager.setOrderDetails(MOCK_DATA.ORDER_DETAILS);
      expect(manager.getOrderDetailCount()).toBeGreaterThan(0);

      manager.clearOrderDetails();

      expect(manager.getOrderDetailCount()).toBe(0);
      expect(manager.getOrderDetails()).toEqual([]);
    });
  });
});

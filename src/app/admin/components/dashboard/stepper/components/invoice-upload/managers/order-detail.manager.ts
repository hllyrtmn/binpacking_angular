import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { OrderDetailUpdateEvent, OrderDetailChanges } from '../models/invoice-upload-interfaces';
import { RepositoryService } from '../../../services/repository.service';
import { StateManager } from '../../../services/state-manager.service';
import { OrderDetailAddDialogComponent } from '../order-detail-add-dialog/order-detail-add-dialog.component';
import { INVOICE_UPLOAD_CONSTANTS } from '../constants/invoice-upload.constants';
import { ToastService } from '../../../../../../../services/toast.service';
import { OrderDetail } from '../../../../../../../models/order-detail.interface';
import { Order } from '../../../../../../../models/order.interface';

@Injectable({
  providedIn: 'root'
})
export class OrderDetailManager {
  private readonly dialog = inject(MatDialog);
  private readonly toastService = inject(ToastService);
  private readonly repositoryService = inject(RepositoryService);
  private readonly stateManager = inject(StateManager);

  private orderDetails: OrderDetail[] = [];

  setOrderDetails(orderDetails: OrderDetail[]): void {
    debugger
    this.orderDetails = [...orderDetails];
  }

  getOrderDetails(): OrderDetail[] {
    return [...this.orderDetails];
  }

  addOrderDetail(orderDetail: OrderDetail): void {
    this.orderDetails.unshift(orderDetail);
    this.stateManager.addOrderDetail(orderDetail);
  }

  updateOrderDetail(event: OrderDetailUpdateEvent): OrderDetail | null {
    const { item, data } = event;
    if (!this.orderDetails?.length) return null;

    const index = this.orderDetails.findIndex((detail) => detail.id === item.id);
    if (index !== -1) {
      const updatedDetail = { ...this.orderDetails[index], ...data };
      this.orderDetails[index] = updatedDetail;
      this.stateManager.updateOrderDetail(updatedDetail);
      return updatedDetail;
    }
    return null;
  }

  deleteOrderDetail(id: string): boolean {
    const index = this.orderDetails.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      this.orderDetails = this.orderDetails.filter((item: any) => item.id !== id);
      this.stateManager.deleteOrderDetail(id);
      return true;
    }
    return false;
  }

  openOrderDetailDialog(order: Order): Observable<OrderDetail | null> {
    const dialogRef = this.dialog.open(OrderDetailAddDialogComponent, {
      width: '600px',
      data: order,
      disableClose: true,
    });

    return new Observable(observer => {
      dialogRef.afterClosed().subscribe({
        next: (result) => {
          if (result && result.orderDetail) {
            const newOrderDetail = result.orderDetail;
            this.addOrderDetail(newOrderDetail);
            this.toastService.success(INVOICE_UPLOAD_CONSTANTS.MESSAGES.SUCCESS.ORDER_DETAIL_ADDED);
            observer.next(newOrderDetail);
          } else {
            observer.next(null);
          }
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  processOrderDetailChanges(changes: OrderDetailChanges, orderId: string): Observable<any> {
    const totalOperations =
      changes.added.length + changes.modified.length + changes.deleted.length;

    if (totalOperations === 0) {
      return of(null);
    }

    // Convert deleted IDs to OrderDetail objects for compatibility
    const deletedOrderDetails: OrderDetail[] = changes.deleted.map(id => {
      const detail = this.getOrderDetailById(id);
      return detail ? detail : { id } as OrderDetail;
    });
    return this.repositoryService.bulkUpdateOrderDetails(
      { ...changes, deleted: deletedOrderDetails },
      orderId
    );
  }

  syncWithBackendData(backendOrderDetails: OrderDetail[]): void {
    this.orderDetails = [...backendOrderDetails];
  }

  clearOrderDetails(): void {
    this.orderDetails = [];
  }

  getOrderDetailById(id: string): OrderDetail | undefined {
    return this.orderDetails.find(detail => detail.id === id);
  }

  getOrderDetailCount(): number {
    return this.orderDetails.length;
  }

  validateOrderDetails(): boolean {
    return this.orderDetails.length > 0;
  }

  getOrderDetailChanges(): OrderDetailChanges {
    const changes = this.stateManager.saveStep1Changes();
    const totalChanges = changes.added.length + changes.deleted.length + changes.modified.length

    if(totalChanges === 0 && this.orderDetails.length > 0){
      return{
        added: [...this.orderDetails],
        modified: changes.modified,
        deleted: changes.deleted.map((detail: any) => typeof detail === 'string' ? detail : detail.id),
      }
    }
    return {
      added: changes.added,
      modified: changes.modified,
      deleted: changes.deleted.map((detail: any) => typeof detail === 'string' ? detail : detail.id),
    };
  }

  // Bulk operations
  addMultipleOrderDetails(orderDetails: OrderDetail[]): void {
    this.orderDetails = [...orderDetails, ...this.orderDetails];
  }

  replaceAllOrderDetails(orderDetails: OrderDetail[]): void {
    this.orderDetails = [...orderDetails];
  }

  // Search and filter
  searchOrderDetails(searchTerm: string): OrderDetail[] {
    if (!searchTerm.trim()) {
      return this.getOrderDetails();
    }

    const term = searchTerm.toLowerCase();
    return this.orderDetails.filter(detail =>
      detail.product?.name?.toLowerCase().includes(term) ||
      detail.product?.product_type?.type?.toLowerCase().includes(term) ||
      detail.product?.product_type?.code?.toLowerCase().includes(term)
    );
  }

  // Statistics
  getTotalItemCount(): number {
    return this.orderDetails.reduce((total, detail) => total + (detail.count || 0), 0);
  }
}

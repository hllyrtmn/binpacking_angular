import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { OrderDetailChanges } from '../models/invoice-upload-interfaces';
import { RepositoryService } from '../../../services/repository.service';
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

  private orderDetails: OrderDetail[] = [];

  setOrderDetails(orderDetails: OrderDetail[]): void {
    this.orderDetails = [...orderDetails];
  }

  addOrderDetail(orderDetail: OrderDetail): void {
    this.orderDetails.unshift(orderDetail);
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

  getOrderDetailById(id: string): OrderDetail | undefined {
    return this.orderDetails.find(detail => detail.id === id);
  }


}

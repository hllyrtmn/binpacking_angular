import { Injectable } from '@angular/core';
import { OrderDetail } from '../../../models/order-detail.interface';
import { GenericCrudService } from '../../../services/generic-crud.service';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderDetailService extends GenericCrudService<OrderDetail> {
  constructor(http: HttpClient) {
    super(http, 'orders/order-details');
  }
  /**
   * Belirli bir order'a ait tüm OrderDetail'leri getir
   */
  getByOrderId(orderId: string): Observable<OrderDetail[]> {
    return this.getAll({ order_id: orderId }).pipe(
      map((response: any) => response.results || [])
    );
  }

  /**
   * OrderDetail'i order_id ile birlikte oluştur
   */
  createWithOrderId(orderDetail: Partial<OrderDetail>, orderId: string): Observable<OrderDetail> {
    const data = {
      ...orderDetail,
      order_id: orderId
    };
    return this.create(data);
  }

  /**
   * Bulk OrderDetail silme (eğer gerekirse)
   */
  bulkDelete(orderDetailIds: string[]): Observable<any> {
    // Her birini ayrı ayrı sil
    const deleteOperations = orderDetailIds.map(id => this.delete(id));

    // Tüm silme operasyonlarını paralel çalıştır
    return forkJoin(deleteOperations);
  }

  /**
   * Order'a ait tüm OrderDetail'leri sil
   */
  deleteByOrderId(orderId: string): Observable<any> {
    return this.getByOrderId(orderId).pipe(
      switchMap((orderDetails: OrderDetail[]) => {
        const deleteOperations = orderDetails.map(detail => this.delete(detail.id));
        return forkJoin(deleteOperations);
      })
    );
  }
}

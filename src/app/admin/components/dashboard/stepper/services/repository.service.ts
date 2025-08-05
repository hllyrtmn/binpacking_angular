import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { FileResponse } from '../interfaces/file-response.interface';
import { mapOrderDetailsToUiProductsSafe, mapToOrderDetailDtoList } from '../../../../../models/mappers/order-detail.mapper';
import { mapPackageDetailToPackage } from '../../../../../models/mappers/package-detail.mapper';
import { UiPallet } from '../components/ui-models/ui-pallet.model';
import { PackageDetail } from '../../../../../models/package-detail.interface';
import { OrderDetail } from '../../../../../models/order-detail.interface';
import { Order } from '../../../../../models/order.interface';
import { Truck } from '../../../../../models/truck.interface';
import { CompanyRelation } from '../../../../../models/company-relation.interface';

@Injectable({
  providedIn: 'root',
})
export class RepositoryService {
  private orderId = signal('');

  constructor(private api: ApiService, private http: HttpClient) {}

  orderDetails(id: string): Observable<any> {
    // api/orders/order-details/{id}/
    // get order detail by order id.
    return this.http
      .get<any>(`${this.api.getApiUrl()}/orders/order-details/?order_id=${id}`)
      .pipe(map((response) => mapToOrderDetailDtoList(response.results)));
  }

  pallets(): Observable<any> {
    return this.http
      .get<any>(`${this.api.getApiUrl()}/logistics/pallets/`, {
        params: new HttpParams().set('limit', 30).set('offset', 0),
      })
      .pipe(
        map((response) =>
          response.results.map((item: any) => new UiPallet(item))
        )
      );
  }

  trucks(): Observable<any> {
    return this.http.get<Truck>(`${this.api.getApiUrl()}/logistics/trucks/`, {
      params: new HttpParams().set('limit', 30).set('offset', 0),
    });
  }

  companyRelations(company_id: string): Observable<any> {
    return this.http.get<CompanyRelation>(
      `${this.api.getApiUrl()}/logistics/companies/${company_id}/relations/`
    );
  }

  deleteOrderDetail(id: string): Observable<any> {
    // api/orders/order-details/{id}/
    // delete order detail
    return this.http.delete<any>(
      `${this.api.getApiUrl()}/orders/order-details/${id}/`
    );
  }

  setOrderId(orderId: string) {
    console.log(orderId)
    console.log(this.orderId())
    this.orderId.set(orderId);
  }

  uploadFile(file: File, orderId: string): Observable<FileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_id', orderId); // Burada order_id olarak gönderiyoruz

    return this.http.post<FileResponse>(
      `${this.api.getApiUrl()}/orders/files/`,
      formData
    );
  }

  processFile(
    file: File
  ): Observable<{ message: string; order: Order; orderDetail: OrderDetail[] }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{
      message: string;
      order: Order;
      orderDetail: OrderDetail[];
    }>(`${this.api.getApiUrl()}/orders/process-file/`, formData);
  }

  calculatePackageDetail(order_id: string = this.orderId()): Observable<{packages: any[], remainingProducts: any[]}> {
    // api/orders/packages/{id}/
    // get package detail by package id.

    return this.http
      .get<any>(`${this.api.getApiUrl()}/logistics/calculate-box/${order_id}/`)
      .pipe(map((response) =>({
        packages: mapPackageDetailToPackage(response.data),
        remainingProducts: mapOrderDetailsToUiProductsSafe(response.remaining_order_details)
      }) ));
  }

  bulkCreatePackageDetail(
    packageDetailList: PackageDetail[],
    order_id: string = this.orderId()
  ) {
    const payload = {
      packageDetails: packageDetailList,
    };
    return this.http.post<any>(
      `${this.api.getApiUrl()}/logistics/create-package-detail/${order_id}/`,
      payload
    );
  }

  /**
   * Bulk Update OrderDetails**
   * Tek bir API çağrısı ile tüm OrderDetail değişikliklerini yap
   */
  bulkUpdateOrderDetails(
    changes: {
      added: OrderDetail[];
      modified: OrderDetail[];
      deleted: OrderDetail[];
    },
    order_id: string = this.orderId()
  ): Observable<any> {
    // Deleted array'indeki object'lerin ID'lerini al
    const deletedIds = changes.deleted
      .filter((detail) => detail && detail.id)
      .map((detail) => detail.id);

    const payload = {
      added: changes.added.map((detail) => ({
        product_id: detail.product.id,
        count: detail.count,
        unit_price: detail.unit_price,
      })),
      modified: changes.modified.map((detail) => ({
        id: detail.id,
        product_id: detail.product.id,
        count: detail.count,
        unit_price: detail.unit_price,
      })),
      deleted: deletedIds,
    };

    return this.http.post<any>(
      `${this.api.getApiUrl()}/orders/${order_id}/bulk-update-order-details/`,
      payload
    );
  }

  createReport(order_id: string = this.orderId()): Observable<any> {
    return this.http.get<any>(
      `${this.api.getApiUrl()}/logistics/create-report/${order_id}/`
    );
  }

  calculatePacking(order_id: string = this.orderId()) {
    return this.http.get<any>(
      `${this.api.getApiUrl()}/logistics/calculate-packing/${order_id}/`
    );
  }
}

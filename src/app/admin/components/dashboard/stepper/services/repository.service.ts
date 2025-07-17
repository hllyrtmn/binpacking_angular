import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { FileResponse } from '../interfaces/file-response.interface';
import { mapToOrderDetailDtoList } from '../../../../../models/mappers/order-detail.mapper';
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

  constructor(private api: ApiService, private http: HttpClient) { }

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
        map((response) => response.results.map((item: any) => new UiPallet(item)))
      );
  }

  trucks(): Observable<any>{
    return this.http.get<Truck>(`${this.api.getApiUrl()}/logistics/trucks/`,{
      params: new HttpParams().set('limit',30).set('offset',0)
    });
  }

  companyRelations(company_id:string):Observable<any>{
    return this.http.get<CompanyRelation>(`${this.api.getApiUrl()}/logistics/companies/${company_id}/relations/`)
  }

  deleteOrderDetail(id: string): Observable<any> {
    // api/orders/order-details/{id}/
    // delete order detail
    return this.http.delete<any>(
      `${this.api.getApiUrl()}/orders/order-details/${id}/`
    );
  }

  setOrderId(orderId: string) {
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

  processFile(file: File): Observable<{ message: string, order: Order, orderDetail:OrderDetail[] }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ message: string, order: Order, orderDetail:OrderDetail[] }>(
      `${this.api.getApiUrl()}/orders/process-file/`,formData
    );
  }

  calculatePackageDetail(
    order_id: string = this.orderId()
  ): Observable<any> {
    // api/orders/packages/{id}/
    // get package detail by package id.

    return this.http
      .get<any>(`${this.api.getApiUrl()}/logistics/calculate-box/${order_id}/`)
      .pipe(map((response) => mapPackageDetailToPackage(response.data)));
  }

  bulkCreatePackageDetail(packageDetailList: PackageDetail[], order_id: string = this.orderId()) {
    const payload = {
      packageDetails: packageDetailList
    }
    return this.http.post<any>(`${this.api.getApiUrl()}/logistics/create-package-detail/${order_id}/`, payload)
  }

  bulkOrderDetail(orderDetails: any[]): Observable<any> {
    // Doğrudan liste gönderiyoruz, payload içinde sarmalamıyoruz
    return this.http.post<any>(`${this.api.getApiUrl()}/orders/create-order-details/`, orderDetails);
  }

  createReport(order_id:string = this.orderId()):Observable<any>{
    return this.http.get<any>(`${this.api.getApiUrl()}/logistics/create-report/${order_id}/`)
  }

  calculatePacking(order_id: string = this.orderId()) {
    return this.http.get<any>(`${this.api.getApiUrl()}/logistics/calculate-packing/${order_id}/`)
  }
}

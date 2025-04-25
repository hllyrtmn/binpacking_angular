import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { FileResponse } from '../interfaces/file-response.interface';
import { mapToOrderDetailDtoList } from '../../../../../models/mappers/order-detail.mapper';
import { mapPackageDetailToPackage } from '../../../../../models/mappers/package-detail.mapper';
import { UiPallet } from '../components/ui-models/ui-pallet.model';
import { PackageDetail } from '../../../../../models/package-detail.interface';

@Injectable({
  providedIn: 'root',
})
export class RepositoryService {

  $orderId = new BehaviorSubject('');

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

  uploadFile(file: File): Observable<FileResponse> {
    // api/orders/files
    // { id: string, file: string, order:string}
    // only upload file and return this.
    // doesn't any proccess
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileResponse>(
      `${this.api.getApiUrl()}/orders/files/`,
      formData
    );
  }

  processFile(file_id: string): Observable<{ status: string }> {
    // api/orders/procces-file/{id}
    // this only return status
    return this.http.post<{ status: string }>(
      `${this.api.getApiUrl()}/orders/process-file/${file_id}/`,
      {}
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

  bulkCreatePackageDetail(order_id: string = this.orderId(), packageDetailList: PackageDetail[]) {
    const payload = {
      packageDetails: packageDetailList
    }
    return this.http.post<any>(`${this.api.getApiUrl()}/create-package-detail/${order_id}/`, payload)
  }
}

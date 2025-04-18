import { inject, Injectable, linkedSignal, signal } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { finalize, map, Observable, tap } from 'rxjs';
import { FileResponse } from '../interfaces/file-response.interface';
import { mapToOrderDetailDtoList } from '../../../../../models/mappers/order-detail.mapper';
import { Pallet } from '../../../../../models/pallet.interface';

@Injectable({
  providedIn: 'root',
})
export class RepositoryService {

  constructor(private api: ApiService, private http: HttpClient) {
  }

  orderDetails(id: string): Observable<any> {
    // api/orders/order-details/{id}/
    // get order detail by order id.
    return this.http.get<any>(
      `${this.api.getApiUrl()}/orders/order-details/?order_id=${id}`
    ).pipe(map(response => (mapToOrderDetailDtoList(response.results))));
  }

  pallets(): Observable<any> {
    return this.http.get<any>(`${this.api.getApiUrl()}/logistics/pallets/`,{params: new HttpParams().set('limit',30).set('offset',0)}).pipe(map(response => {return response.results as Pallet[]}));
  }

  deleteOrderDetail(id: string): Observable<any> {
    // api/orders/order-details/{id}/
    // delete order detail
    return this.http.delete<any>(
      `${this.api.getApiUrl()}/orders/order-details/${id}/`
    );
  }

  uploadFile(file: File): Observable<FileResponse> {
    // api/orders/files
    // { id: string, file: string, order:string}
    // only upload file and return this.
    // doesn't any proccess
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<FileResponse>(`${this.api.getApiUrl()}/orders/files/`, formData);
  }

  processFile(file_id: string): Observable<{ status: string }> {
    // api/orders/procces-file/{id}
    // this only return status
    return this.http
      .post<{ status: string }>(
        `${this.api.getApiUrl()}/orders/process-file/${file_id}/`,
        {}
      );
  }

  calculatePackageDetail(order_id:string | '942a07ac-6c20-4dc9-b9bb-e7d2c733b4e1'): Observable<any> {
    // api/orders/packages/{id}/
    // get package detail by package id.

    return this.http.get<any>(
      `${this.api.getApiUrl()}/logistics/calculate-box/${order_id}/`
    );
  }
}

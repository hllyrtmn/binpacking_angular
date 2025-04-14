import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';
import { HttpClient, httpResource, HttpResourceOptions } from '@angular/common/http';
import { finalize, Observable, tap } from 'rxjs';
import { FileResponse } from '../interfaces/file-response.interface';
import { BaseRepositoryService } from '../../../../../services/base-repository.service';


@Injectable({
  providedIn: 'root'
})
export class RepositoryService extends BaseRepositoryService {

  // TODO:
  // ileride generic repository service yazilip belirli yerler extend edilebilir
  // ornek olarak loading ve errror signallari


  // bir kuralim olsa repository pattern icin  bu ne olurdu
  //

  private _order_id = signal('');

  private _orderDetailResource = httpResource(() => `${this.api.getApiUrl()}/orders/order-details?order_id=${this._order_id()}`)

  public orderDetailResource = this._orderDetailResource.asReadonly()

  constructor() {
    super(inject(ApiService), inject(HttpClient));
    this.resourceLoadingList.push(this.orderDetailResource.isLoading)
  }

  uploadFile(file: File): Observable<FileResponse> {
    // api/orders/files
    // { id: string, file: string, order:string}
    // only upload file and return this.
    // doesn't any proccess
    return this.http.post<FileResponse>(`${this.api.getApiUrl()}/orders/files`, { file: file }).pipe(
      tap(() => { this._loading.set(true) }),
      finalize(() => { this._loading.set(false) })
    );
  }

  processFile(file_id: string): Observable<{ status: string }> {
    // api/orders/procces-file/{id}
    // this only return status
    return this.http.get<{ status: string }>(`${this.api.getApiUrl()}/orders/procces-file/${file_id}`)
  }

  setOrderId(order_id: string) {
    this._order_id.set(order_id)
  }

  addErrors(error: any) {
    this._errors.update((value) => ([...value, error]))
  }

}

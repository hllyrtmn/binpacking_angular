import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';
import { HttpClient, httpResource, HttpResourceOptions } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
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
  }

  uploadFile(file: File) {
    // api/orders/files
    // { id: string, file: string, order:string}
    // only upload file and return this.
    // doesn't any proccess
    return this.http.post<any>(`${this.api.getApiUrl()}/orders/files`, { file: file }).pipe(
      tap((response: FileResponse) => { this._loading.set(true) }),
      finalize(() => { this._loading.set(false) })
    );
  }

  fileProccess(file_id: string): { order: string } {
    // api/orders/procces-file/{id}
    // this only return status

    return { order: 'order' }
  }

  getOrder(id: string) { }

  getOrderDetails(order_id: string) {
    this._order_id.set(order_id)
  }
}

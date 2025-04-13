import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';
import { httpResource } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class RepositoryService {

  constructor(private api: ApiService) { }

  uploadFile(file: File) {
    // api/orders/files
    // { id: string, file: string, order:string}
    // only upload file and return this.
    // doesn't any proccess

    const resource = httpResource(
      () => ({
        url: `${this.api.getApiUrl()}/orders/files`,
        body: { file: file }
      })
    )

    return resource.value();
  }

  fileProccess(file_id: string): { order: string } {
    // api/orders/procces-file/{id}
    // this only return status

    return { order: 'order' }
  }

  getOrder(id: string) {

  }

  getOrderDetails(order_id: string) {

  }



}

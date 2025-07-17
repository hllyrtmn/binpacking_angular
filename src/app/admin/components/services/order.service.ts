import { inject, Injectable } from '@angular/core';
import { GenericCrudService } from '../../../services/generic-crud.service';
import { HttpClient } from '@angular/common/http';
import { Order } from '../../../models/order.interface';
import { map, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService extends GenericCrudService<Order> {
  constructor(http: HttpClient) {
    super(http, 'orders/order');
  }
  createOrder(){
    return this.http.post<any>(this.apiUrl,{})
  }


}

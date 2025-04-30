import { Injectable } from '@angular/core';
import { OrderDetail } from '../../../models/order-detail.interface';
import { GenericCrudService } from '../../../services/generic-crud.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class OrderDetailService extends GenericCrudService<OrderDetail> {
  constructor(http: HttpClient) {
    super(http, 'orders/order-details');
  }
}

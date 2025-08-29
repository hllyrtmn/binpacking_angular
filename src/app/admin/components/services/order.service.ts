import { Injectable } from '@angular/core';
import { GenericCrudService } from '../../../services/generic-crud.service';
import { HttpClient } from '@angular/common/http';
import { Order } from '../../../models/order.interface';
import { ApiService } from '../../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService extends GenericCrudService<Order> {
  constructor(http: HttpClient,api: ApiService) {
    super(http, 'orders/orders');
  }
  createOrder(){
  console.log(this.apiUrl)
    return this.http.post<any>(this.apiUrl,{})
  }

  updateOrCreate(order: any){
  console.log(this.apiUrl)
    
  const formattedOrder = {
    id: order!.id,
    company_relation_id: order!.company_relation?.id,
    truck_id: order!.truck?.id,
    date: order!.date,
    weight_type: order!.weight_type,
    name: order!.name,
  };
    return this.http.post<{order:Order,created:boolean}>(`${this.apiUrl}update-or-create/`,formattedOrder)
  }


}

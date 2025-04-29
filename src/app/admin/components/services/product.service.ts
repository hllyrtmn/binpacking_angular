import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GenericCrudService } from '../../../services/generic-crud.service';
import { Product } from '../../../models/product.interface';
import { ProductType } from '../../../models/product-type.interface';
import { Dimension } from '../../../models/dimension.interface';
import { WeightType } from '../../../models/weight-type.interface';
import { ApiService } from '../../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService extends GenericCrudService<Product> {
  constructor(http: HttpClient) {
    super(http, 'products/products');
  }

  // // Model özelinde ek metotlar burada tanımlanabilir
  // getProductsByType(typeId: string): Observable<Product[]> {
  //   return this.http.get<Product[]>(`${this.apiUrl}/by-type/${typeId}`);
  // }

  // // İlişkili veri getirme örnekleri
  // getProductTypes(): Observable<ProductType[]> {
  //   return this.http.get<ProductType[]>(`${this.apiUrl}/product-types`);
  // }

  // getDimensions(): Observable<Dimension[]> {
  //   return this.http.get<Dimension[]>(`${this.apiUrl}/dimensions`);
  // }

  // getWeightTypes(): Observable<WeightType[]> {
  //   return this.http.get<WeightType[]>(`${this.apiUrl}/weight-types`);
  // }
}

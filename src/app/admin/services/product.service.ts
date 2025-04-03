import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {


  constructor(private http: HttpClient, private apiService: ApiService) {
  }

  getProducts() {
    return this.http.get(`${this.apiService.getApiUrl()}api/products/products/`)
      .subscribe({
        next: console.log,
        error: console.error,
        complete: console.info
      });
  }
}


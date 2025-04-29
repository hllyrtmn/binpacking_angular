import { inject, Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseModel } from '../models/base-model.interface';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root'
})
export class GenericCrudService<T> {
  protected apiUrl: string;
  api = inject(ApiService)
  constructor(
    protected http: HttpClient,
    @Inject('ENDPOINT') protected endpoint: string
  ) {
    // Ensure the endpoint ends with a trailing slash to properly form the URL
    const formattedEndpoint = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
    this.apiUrl = `${this.api.getApiUrl()}/${formattedEndpoint}`;
  }

  getAll(params?: any): Observable<Page<T>> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    return this.http.get<Page<T>>(this.apiUrl, { params: httpParams });
  }

  getById(id: number | string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${id}/`);
  }

  create(item: Partial<T>): Observable<T> {
    return this.http.post<T>(this.apiUrl, item);
  }

  update(id: number | string, item: Partial<T>): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${id}/`, item);
  }

  partialUpdate(id: number | string, item: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}${id}/`, item);
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`);
  }
}

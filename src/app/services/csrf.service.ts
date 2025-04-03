import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map, pipe } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class CsrfService {
  http: HttpClient = inject(HttpClient);
  apiService: ApiService = inject(ApiService);
  constructor() { }

  getCsrfToken() {
    return this.http.get<any>(`${this.apiService.getApiUrl()}api/csrf-token/`, { withCredentials: true })
      .pipe(map((response: HttpResponse<any>) => {
        const csrfToken = response.headers.get('csrftoken');
        return csrfToken || '';
      }));
  }
}

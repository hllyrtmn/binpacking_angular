import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';
import { User } from '../models/user.model';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  //https://dev.to/cotter/localstorage-vs-cookies-all-you-need-to-know-about-storing-jwt-tokens-securely-in-the-front-end-15id
  // TODO: gecici olarak localstorage kullan
  // daha sonra csrf token ile cookie kullan

  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  currentUser: User | null = null;
  private apiService = inject(ApiService);

  constructor(private http: HttpClient, private router: Router) { }

  // Sign-up
  signUp(user: User): Observable<any> {
    const api = `${this.apiService.getApiUrl()}/register-user`;
    return this.http.post(api, user, { headers: this.headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Sign-in
  signIn(user: User): void {
    this.http.post<{ access: string, refresh: string }>(`${this.apiService.getApiUrl()}/token/`, user).subscribe({
      next: (res) => {
        localStorage.setItem('access_token', res.access);
        localStorage.setItem('refresh_token', res.refresh);
        const redirectUrlAfterLogin = localStorage.getItem('redirectUrlAfterLogin');
        if (redirectUrlAfterLogin) {
          localStorage.removeItem('redirectUrlAfterLogin');
          this.router.navigate([redirectUrlAfterLogin]);
        } else {
          this.router.navigate(['/admin']);
        }
      },
      error: this.handleError,
    });
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  refreshAccessToken$(): Observable<{ access: string, refresh: string }> {
    const refresh_token = localStorage.getItem('refresh_token');
    return this.http.post<{ access: string, refresh: string }>(`${this.apiService.getApiUrl()}/token/refresh/`, { refresh: refresh_token });
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  doLogout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.router.navigate(['/auth/login']);
  }

  // User profile
  getUserProfile(id: string | number): Observable<any> {
    const api = `${this.apiService.getApiUrl()}/user-profile/${id}`;
    return this.http.get(api, { headers: this.headers }).pipe(
      map((res) => res || {}),
      catchError(this.handleError)
    );
  }

  // Error handling
  private handleError(error: HttpErrorResponse): Observable<never> {
    let msg = error.error instanceof ErrorEvent
      ? error.error.message
      : `Error Code: ${error.status}\nMessage: ${error.message}`;

    return throwError(() => msg);
  }
}
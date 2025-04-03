import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  //https://dev.to/cotter/localstorage-vs-cookies-all-you-need-to-know-about-storing-jwt-tokens-securely-in-the-front-end-15id
  // TODO: gecici olarak localstorage kullan
  // daha sonra csrf token ile cookie kullan

  private endpoint: string = 'http://localhost:8000/api';
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  private _isLoggedIn: boolean = !!this.getToken();
  currentUser: User | null = null;

  constructor(private http: HttpClient, private router: Router) { }

  // Sign-up
  signUp(user: User): Observable<any> {
    const api = `${this.endpoint}/register-user`;
    return this.http.post(api, user, { headers: this.headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Sign-in
  signIn(user: User): void {
    this.http.post<{ access: string }>(`${this.endpoint}/token/`, user).subscribe({
      next: (res) => {
        console.log('res', res);
        localStorage.setItem('access_token', res.access);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => this.handleError(error),
    });
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  doLogout(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['log-in']);
  }

  // User profile
  getUserProfile(id: string | number): Observable<any> {
    const api = `${this.endpoint}/user-profile/${id}`;
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
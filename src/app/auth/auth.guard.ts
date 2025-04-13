import { ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Injectable } from '@angular/core';
import { of, tap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): MaybeAsync<GuardResult> {
    const token = this.authService.getAccessToken();
    if (token) {
      const decodedToken = this.decodeToken(token);
      if (this.isTokenExpired(decodedToken.exp)) {
        this.authService.refreshAccessToken$().pipe(
          tap({
            next: (res) => {
              localStorage.setItem('access_token', res.access);
              localStorage.setItem('refresh_token', res.refresh);
              return of(true);
            },
            error: (err) => {
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('access_token');
              this.router.navigate(['/auth/login']);
              localStorage.setItem('redirectUrlAfterLogin', state.url);
              return of(false);
            }
          }));
      } else {
        return of(true);
      }
    } else {
      localStorage.setItem('redirectUrlAfterLogin', state.url);
      this.router.navigate(['/auth/login']);
      return of(false);
    }
    return of(false);
  }

  private isTokenExpired(exp: number): boolean {
    return (exp * 1000) < Date.now();
  }

  private decodeToken(token: string): any {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  }
}
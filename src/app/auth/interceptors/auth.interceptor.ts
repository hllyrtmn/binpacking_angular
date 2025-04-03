import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const AuthInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const authToken = authService.getToken();
  const clonedRequest = req.clone({
    withCredentials: true,
    setHeaders: {
      Authorization: 'Bearer ' + authToken,
    },
  });
  return next(clonedRequest);
}
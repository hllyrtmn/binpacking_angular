import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { ErrorHandlingService } from '../../services/error-handling.service';
import { catchError, throwError } from 'rxjs';

export const AuthInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const errorService = inject(ErrorHandlingService);

  const authToken = authService.getToken();
  const clonedRequest = req.clone({
    withCredentials: true,
    setHeaders: {
      Authorization: 'Bearer ' + authToken,
    },
  });
  return next(clonedRequest).pipe(
    catchError((error) => {
      errorService.handle(error);
      return throwError(() => error);
    })
  );
}
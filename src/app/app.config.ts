import { ApplicationConfig, provideZoneChangeDetection, inject, provideAppInitializer, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ErrorHandler } from '@angular/core';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { CsrfTokenInterceptor } from './auth/interceptors/csrftoken.interceptor';
import { ConfigService } from './services/config.service';
import { AuthInterceptor } from './auth/interceptors/auth.interceptor';
import { GlobalErrorHandler } from './services/global-error-handler';
import { loadingInterceptor } from './components/loading/loading.interceptor';
import { ToastrModule } from 'ngx-toastr';
import { PermissionService } from './services/permission.service';

export function appConfigInit() {
  const configService = inject(ConfigService);
  return configService.load();
}

export function appPermissionInit() {
  const permissionService = inject(PermissionService);
  return permissionService.loadPermissions();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(appConfigInit),
    provideAppInitializer(appPermissionInit),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([
        AuthInterceptor,
        CsrfTokenInterceptor,
        loadingInterceptor
      ]
      )
    ),
    provideAnimations(),
    importProvidersFrom(
      ToastrModule.forRoot({
        timeOut: 3000,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        closeButton: true
      })
    ),
    {
      provide: ErrorHandler, useClass: GlobalErrorHandler
    }
  ]
};

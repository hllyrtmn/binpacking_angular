import { ApplicationConfig, provideZoneChangeDetection, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ErrorHandler } from '@angular/core';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { CsrfTokenInterceptor } from './auth/interceptors/csrftoken.interceptor';
import { ConfigService } from './services/config.service';
import { AuthInterceptor } from './auth/interceptors/auth.interceptor';
import { GlobalErrorHandler } from './services/global-error-handler';


export function appConfigInit() {
  const configService = inject(ConfigService);
  return configService.load();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(appConfigInit),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([
        AuthInterceptor,
        CsrfTokenInterceptor
      ]
      )
    ),
    {
      provide: ErrorHandler, useClass: GlobalErrorHandler
    }
  ]
};

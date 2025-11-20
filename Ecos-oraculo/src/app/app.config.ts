import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { CookieService } from 'ngx-cookie-service';

export const appConfig: ApplicationConfig = {
  providers: [
    CookieService,
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
  ],
};

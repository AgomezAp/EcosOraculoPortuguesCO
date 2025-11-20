import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';
bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...appConfig.providers,
    provideHttpClient(),
    provideAnimations(),
    BrowserAnimationsModule,
    CookieService,
  ],
}).catch((err) => console.error(err));

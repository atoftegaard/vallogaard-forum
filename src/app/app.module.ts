import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFunctions, getFunctions, connectFunctionsEmulator } from '@angular/fire/functions';
import { provideStorage, getStorage, connectStorageEmulator } from '@angular/fire/storage';
import { environment } from '../environments/environment';
import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './home/home.module';
import { FooterComponent, HeaderComponent, SharedModule } from './shared';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { NgcCookieConsentModule, NgcCookieConsentConfig } from 'ngx-cookieconsent';
import { EditorModule } from 'primeng/editor';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { registerLocaleData } from '@angular/common';
import localeDa from '@angular/common/locales/da';
import { ReferaterListComponent } from './referater-list/referater-list.component';
import { ReferatPreviewComponent } from './referat-preview/referat-preview.component';
import { ReferatUploadComponent } from './referat-upload/referat-upload.component';
import { BrugereListComponent } from './brugere-list/brugere-list.component';
import { MedlemmerListComponent } from './medlemmer-list/medlemmer-list.component';
import { DokumenterListComponent } from './dokumenter-list/dokumenter-list.component';
import { DokumentPreviewComponent } from './dokument-preview/dokument-preview.component';
import { NgxFilesizeModule } from 'ngx-filesize';
import { DokumenterUploadComponent } from './dokumenter-upload/dokumenter-upload.component';
import { GeneralforsamlingPreviewComponent } from './generalforsamling-preview/generalforsamling-preview.component';

registerLocaleData(localeDa);

const cookieConfig: NgcCookieConsentConfig = {
  cookie: {
    domain: environment.host
  },
  palette: {
    popup: {
      background: '#000'
    },
    button: {
      background: '#f1d600'
    }
  },
  theme: 'edgeless',
  type: 'opt-out'
};

@NgModule({
  declarations: [AppComponent,
     FooterComponent,
      HeaderComponent,
       ReferaterListComponent,
        ReferatPreviewComponent,
         ReferatUploadComponent,
          BrugereListComponent,
          MedlemmerListComponent,
          DokumenterListComponent,
          DokumentPreviewComponent,
          DokumenterUploadComponent,
          GeneralforsamlingPreviewComponent],
  imports: [
    BrowserModule,
    EditorModule,
    CoreModule,
    SharedModule,
    HomeModule,
    AuthModule,
    NgxFilesizeModule,
    AppRoutingModule,
    NgcCookieConsentModule.forRoot(cookieConfig)
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'da' },
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: 'none'
        }
      }
    }),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideFunctions(() => {
      const functions = getFunctions();
      if (environment.useEmulators) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    }),
    provideStorage(() => {
      const storage = getStorage();
      if (environment.useEmulators) {
        connectStorageEmulator(storage, 'localhost', 9199);
      }
      return storage;
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}

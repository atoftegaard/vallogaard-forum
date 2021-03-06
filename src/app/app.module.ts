import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AppComponent } from './app.component';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './home/home.module';
import { FooterComponent, HeaderComponent, SharedModule } from './shared';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { NgcCookieConsentModule, NgcCookieConsentConfig } from 'ngx-cookieconsent';
import { AngularFireFunctionsModule } from '@angular/fire/functions';
import { EditorModule } from 'primeng/editor';
import { registerLocaleData } from '@angular/common';
import localeDa from '@angular/common/locales/da';
import { ReferaterListComponent } from './referater-list/referater-list.component';
import { ReferatPreviewComponent } from './referat-preview/referat-preview.component';
import { ReferatUploadComponent } from './referat-upload/referat-upload.component';
import { BrugereListComponent } from './brugere-list/brugere-list.component';
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
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AngularFireFunctionsModule,
    NgcCookieConsentModule.forRoot(cookieConfig)
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'da' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}

import { Injectable, } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { TypedRouteSnapshot } from 'ngx-typed-router';
import { Resolve } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { SettingsRoutePath } from './settings-route-path';
import { Profile } from '../core/models/profile.model';

@Injectable()
export class SettingsResolver implements Resolve<Profile> {
  constructor(
    private firestore: Firestore,
    private authService: AuthService
    ) {}

  resolve(snapshot: TypedRouteSnapshot<Profile, SettingsRoutePath>): Observable<Profile> {
    return (docData(doc(this.firestore, 'profiles', this.authService.uid)) as Observable<Profile>).pipe(first());
  }
}

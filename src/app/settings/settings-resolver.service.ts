import { Injectable, } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map, first } from 'rxjs/operators';
import { TypedRouteSnapshot } from 'ngx-typed-router';
import { Resolve } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { SettingsRoutePath } from './settings-route-path';
import { Profile } from '../core/models/profile.model';

@Injectable()
export class SettingsResolver implements Resolve<Profile> {
  constructor(
    private db: AngularFirestore,
    private authService: AuthService
    ) {}

  resolve(snapshot: TypedRouteSnapshot<Profile, SettingsRoutePath>): Observable<Profile> {
    const collection = this.db.collection<Profile>('profiles', ref => ref.where('uid', '==', this.authService.uid));
    return collection.valueChanges().pipe(first(), map(x => x[0]));
  }
}
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Profile } from '../models';
import { map, first, shareReplay } from 'rxjs/operators';

@Injectable()
export class ProfilesService {
  constructor (
    private firestore: Firestore,
  ) {}

  // Article lists re-fetch/re-render frequently (any write to any article re-emits the whole
  // Firestore collection), which recreates components that look up commenter profiles. Caching
  // per-uid means those remounts get the already-resolved value instantly instead of flashing
  // stale data while a fresh fetch is in flight.
  private cache = new Map<string, Observable<Profile>>();

  get(username: string): Observable<Profile> {
    // Some legacy articles/comments predate consistently populated author.uid fields - Firestore's
    // doc() throws synchronously on a falsy path segment, so this must be checked before calling it.
    if (!username) {
      return of(undefined);
    }
    if (!this.cache.has(username)) {
      this.cache.set(username, (docData(doc(this.firestore, 'profiles', username)) as Observable<Profile>).pipe(
        first(),
        shareReplay(1)
      ));
    }
    return this.cache.get(username);
  }

  getEmail(username: string): Observable<string> {
    return this.get(username).pipe(map(profile => {
      if (profile && profile.shareEmail) {
        return profile.email;
      } else {
        return null;
      }
    }));
  }
}

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore } from '@angular/fire/firestore';
import { Profile } from '../models';
import { map, first, take } from 'rxjs/operators';

@Injectable()
export class ProfilesService {
  constructor (
    private db: AngularFirestore,
  ) {}

  get(username: string): Observable<Profile> {
    const collection = this.db.collection<Profile>('profiles', ref => ref.where('uid', '==', username));
    return collection.valueChanges().pipe(first(), map(x => x[0]));
  }

  getEmail(username: string): Observable<string> {
    const collection = this.db.collection<Profile>('profiles', ref => ref.where('uid', '==', username)
      .where('shareEmail', '==', true));
    return collection.valueChanges().pipe(take(1), map(x => {
      if (x[0]) {
        return x[0].email;
      } else {
        return null;
      }
    }));
  }
}

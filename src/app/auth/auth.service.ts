import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { User } from 'firebase';
import { Profile } from '../core/models/profile.model';
import { AngularFirestore } from '@angular/fire/firestore';
import { first, map } from 'rxjs/operators';

@Injectable({
  providedIn:  'root'
})
export  class  AuthService {
  user: User;
  profile: Profile;
  isAdminPromise: Promise<boolean>;

  constructor(
    public afAuth: AngularFireAuth,
    public router: Router,
    private db: AngularFirestore
  ) {
    this.isAdminPromise = new Promise<boolean>((resolve) => {
      this.afAuth.authState.subscribe(user => {
        if (user) {
          this.user = user;
          this.updateProfile(resolve);
          localStorage.setItem('user', JSON.stringify(this.user));
        } else {
          localStorage.setItem('user', null);
        }
      });
    });
  }

  updateProfile(resolve: any) {
    const collection = this.db.collection<Profile>('profiles', ref => ref.where('uid', '==', this.user.uid));
    collection.valueChanges().pipe(first(), map(x => x[0])).subscribe(u => {
      this.profile = u;
      if (resolve) {
        resolve(u.role === 'admin');
      }
    });
  }

  async login(email: string, password: string) {
    try {
      await this.afAuth.auth.signInWithEmailAndPassword(email, password);
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 50);
      return true;
    } catch (e) {
      return false;
    }
  }

  async logout() {
    await this.afAuth.auth.signOut();
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  get isLoggedIn(): boolean {
    const user = JSON.parse(localStorage.getItem('user'));
    return user !==  null;
  }

  get isAdmin(): Promise<boolean> {
    return this.isAdminPromise;
  }

  get uid(): string {
    const user = JSON.parse(localStorage.getItem('user'));
    return user.uid;
  }
}

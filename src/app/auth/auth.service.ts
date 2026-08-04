import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, User,
  setPersistence, browserLocalPersistence, browserSessionPersistence
} from '@angular/fire/auth';
import { Profile } from '../core/models/profile.model';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

@Injectable({
  providedIn:  'root'
})
export  class  AuthService {
  user: User;
  profile: Profile;
  isAdminPromise: Promise<boolean>;

  constructor(
    public auth: Auth,
    public router: Router,
    private firestore: Firestore
  ) {
    this.isAdminPromise = new Promise<boolean>((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
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
    (docData(doc(this.firestore, 'profiles', this.user.uid)) as Observable<Profile>).pipe(first()).subscribe(u => {
      this.profile = u;
      if (resolve) {
        resolve(u.role === 'admin');
      }
    });
  }

  // browserLocalPersistence survives closing the browser entirely; browserSessionPersistence
  // is cleared when the tab/browser closes. Must be set before signing in - it only affects
  // the session about to be created, not any already-active one.
  async login(email: string, password: string, rememberMe: boolean = true) {
    try {
      await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(this.auth, email, password);
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 50);
      return true;
    } catch (e) {
      return false;
    }
  }

  async reset(email: string) {
    sendPasswordResetEmail(this.auth, email);
  }

  async logout() {
    await signOut(this.auth);
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  async loggedIn() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(this.auth, user => {
          resolve(user);
        }, reject);
    });
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

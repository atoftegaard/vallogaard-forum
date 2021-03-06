import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { User } from 'firebase/app';
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
      this.afAuth.onAuthStateChanged((user) => {
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
      await this.afAuth.signInWithEmailAndPassword(email, password);
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 50);
      return true;
    } catch (e) {
      return false;
    }
  }

  async reset(email: string) {
    this.afAuth.sendPasswordResetEmail(email);
  }

  async logout() {
    await this.afAuth.signOut();
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  async loggedIn() {
    return new Promise((resolve, reject) => {
        const unsubscribe = this.afAuth.onAuthStateChanged(user => {
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

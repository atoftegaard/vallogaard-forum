import { Component, OnInit, Input } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Functions, httpsCallableFromURL } from '@angular/fire/functions';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';
import { Profile } from '../core';

@Component({
  standalone: false,
  selector: 'app-brugere-list',
  templateUrl: './brugere-list.component.html',
  styleUrls: ['./brugere-list.component.css']
})
export class BrugereListComponent implements OnInit {

  constructor(
    private firestore: Firestore,
    private functions: Functions,
    private auth: Auth,
    public router: Router,
    private authService: AuthService) { }

  brugere: Observable<Profile[]>;
  loading: boolean;
  allEmails: string;
  busyUid: string;

  // Keyed by uid, from the actual Authentication user records - the Firestore profile's
  // own "disabled" field is only a mirror that can drift (e.g. applyForUser never sets it),
  // so this is what the UI must trust for enabled/disabled status.
  authStatus: { [uid: string]: boolean } = null;

  @Input() limit: number;
  @Input()
  set config(config: {}) { }

  async ngOnInit() {
    this.loading = true;
    await this.authService.loggedIn();

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const q = query(collection(this.firestore, 'profiles'), orderBy('name', 'asc'));
    this.brugere = collectionData(q) as Observable<Profile[]>;
    this.brugere.subscribe(x => {
      this.allEmails = x.map(p => p.email).join(';');
      this.loading = false;
    });

    this.loadAuthStatus();
  }

  isDisabled(bruger: Profile): boolean {
    // Fall back to the Firestore mirror only until the real Auth status has loaded,
    // to avoid a flash of "Aktiv" for everyone before the callable resolves.
    if (this.authStatus && bruger.uid in this.authStatus) {
      return this.authStatus[bruger.uid];
    }
    return !!bruger.disabled;
  }

  private async loadAuthStatus() {
    try {
      const callable = httpsCallableFromURL<void, { [uid: string]: boolean }>(
        this.functions, 'https://us-central1-vallogaard-2019.cloudfunctions.net/listUserAuthStatus');
      const result = await callable();
      this.authStatus = result.data;
    } catch (error) {
      console.error('Error loading user auth status: ', error);
    }
  }

  async resetPassword(bruger: Profile) {
    this.busyUid = bruger.uid;
    try {
      await sendPasswordResetEmail(this.auth, bruger.email);
      alert(`Der er sendt en mail til ${bruger.email} med et link til at nulstille kodeordet.`);
    } catch (error) {
      console.error('Error sending password reset email: ', error);
      alert('Kunne ikke sende mail til nulstilling af kodeord.');
    } finally {
      this.busyUid = null;
    }
  }

  // These act on real Firebase Auth accounts via the Admin SDK, so they must hit the
  // actually-deployed function - the local Functions emulator has no real Google Cloud
  // credentials and can't touch production Auth, regardless of environment.useEmulators.
  async toggleDisabled(bruger: Profile) {
    this.busyUid = bruger.uid;
    try {
      const callable = httpsCallableFromURL(
        this.functions, 'https://us-central1-vallogaard-2019.cloudfunctions.net/setUserDisabled');
      await callable({ uid: bruger.uid, disabled: !this.isDisabled(bruger) });
      await this.loadAuthStatus();
    } catch (error) {
      console.error('Error updating user: ', error);
      alert('Kunne ikke opdatere brugeren.');
    } finally {
      this.busyUid = null;
    }
  }

  async deleteUser(bruger: Profile) {
    if (!confirm(`Er du sikker på at du vil slette brugeren "${bruger.name}"? Dette kan ikke fortrydes.`)) {
      return;
    }

    this.busyUid = bruger.uid;
    try {
      const callable = httpsCallableFromURL(
        this.functions, 'https://us-central1-vallogaard-2019.cloudfunctions.net/deleteUserAccount');
      await callable({ uid: bruger.uid });
      await this.loadAuthStatus();
    } catch (error) {
      console.error('Error deleting user: ', error);
      alert('Kunne ikke slette brugeren.');
    } finally {
      this.busyUid = null;
    }
  }

}

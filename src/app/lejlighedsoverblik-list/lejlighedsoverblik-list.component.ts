import { Component, NgZone, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Lejlighed } from '../core/models/lejlighed.model';
import { Profile } from '../core/models/profile.model';

// Lets "2 *", "3 / 25" and the number-less "Værelser" row sort correctly by apartment
// number, which plain string/Firestore ordering can't do (Firestore has no natural-sort).
function leadingNumber(nummer: string): number {
  const match = /\d+/.exec(nummer || '');
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

@Component({
  standalone: false,
  selector: 'app-lejlighedsoverblik-list',
  templateUrl: './lejlighedsoverblik-list.component.html',
  styleUrls: ['./lejlighedsoverblik-list.component.css']
})
export class LejlighedsoverblikListComponent implements OnInit {

  constructor(
    private firestore: Firestore,
    public router: Router,
    private authService: AuthService,
    private ngZone: NgZone) { }

  lejligheder: Lejlighed[] = [];
  loading = true;
  loadError = false;
  isAdmin = false;
  busyId: string = null;
  // Keyed by profile.address, grouping every profile registered at that address (there can be
  // more than one) - lets the admin-only Beboere/Email fields show the live, authoritative
  // name(s)/email(s) from matching forum profiles instead of the separately maintained
  // lejlighed.beboere/lejlighed.email.
  profilesByAddress = new Map<string, Profile[]>();

  get fordelingstalTotal(): number {
    return this.lejligheder.reduce((sum, l) => sum + (+l.fordelingstal || 0), 0);
  }

  // Angular template expressions can't contain arrow functions, so the .map(...).join(...)
  // that renders matched profiles' names has to live here instead of inline in the template.
  matchedNames(profiles: Profile[]): string {
    return profiles.map(p => p.name).join(', ');
  }

  async ngOnInit() {
    await this.authService.loggedIn();

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.isAdmin = await this.authService.isAdmin;

    // Listing the profiles collection requires the admin role in firestore.rules, so this
    // would fail permission checks for anyone else - harmless to skip, since the email field
    // this feeds is itself admin-only.
    if (this.isAdmin) {
      collectionData(collection(this.firestore, 'profiles')).subscribe((profiles: Profile[]) => {
        this.ngZone.run(() => {
          const map = new Map<string, Profile[]>();
          for (const profile of profiles) {
            if (!profile.address) {
              continue;
            }
            const existing = map.get(profile.address);
            if (existing) {
              existing.push(profile);
            } else {
              map.set(profile.address, [profile]);
            }
          }
          this.profilesByAddress = map;
        });
      });
    }

    collectionData(collection(this.firestore, 'lejligheder'), { idField: 'id' }).subscribe({
      next: (list: Lejlighed[]) => {
        // Firestore's realtime listener callback can fire outside Angular's zone, in which
        // case the state updates below never trigger a re-render on their own - forcing them
        // through ngZone.run() guarantees change detection runs regardless of which zone the
        // underlying SDK callback happened to execute in.
        this.ngZone.run(() => {
          this.lejligheder = list.slice().sort((a, b) => leadingNumber(a.nummer) - leadingNumber(b.nummer));
          this.loading = false;
        });
      },
      error: (error) => {
        console.error('Error loading lejligheder: ', error);
        this.ngZone.run(() => {
          this.loading = false;
          this.loadError = true;
        });
      }
    });
  }

  // Called on (blur) of either editable input - saves both fields' current in-memory state
  // rather than just the one blurred, so a stale partial update can't overwrite a field
  // the admin just changed in the other input on the same card a moment earlier.
  async save(lejlighed: Lejlighed) {
    this.busyId = lejlighed.id;
    try {
      await updateDoc(doc(this.firestore, 'lejligheder', lejlighed.id), {
        // Firestore rejects `undefined` outright - these fields don't exist yet on docs that
        // haven't been backfilled, so they can genuinely be undefined here.
        beboere: lejlighed.beboere || '',
        telefonnummer: lejlighed.telefonnummer || '',
        email: lejlighed.email || '',
        fordelingstal: +lejlighed.fordelingstal
      });
    } catch (error) {
      console.error('Error updating lejlighed: ', error);
      alert('Kunne ikke gemme ændringen.');
    } finally {
      this.busyId = null;
    }
  }
}

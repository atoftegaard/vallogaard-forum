import { Component, OnInit, Input } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Referat } from '../core/models/referat.model';

@Component({
  standalone: false,
  selector: 'app-referater-list',
  templateUrl: './referater-list.component.html',
  styleUrls: ['./referater-list.component.css']
})
export class ReferaterListComponent implements OnInit {

  constructor(
    private firestore: Firestore,
    public router: Router,
    private authService: AuthService) { }

  referater: Observable<Referat[]>;
  loading: boolean;
  isAdmin: boolean;

  @Input() limit: number;
  @Input()
  set config(config: {}) { }

  async ngOnInit() {
    this.loading = true;
    await this.authService.loggedIn();

    this.authService.isAdmin.then((isAdmin) => {
      this.isAdmin = isAdmin;
    });

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const q = query(collection(this.firestore, 'referater'), orderBy('from', 'desc'));
    // Linked via vallogaard.dk/dokument/referat/<id> (the dokument function looks the file up
    // through the referat document) rather than the stored firebasestorage.googleapis.com
    // URL. `ng serve` has no Hosting rewrite, so locally the live site's full address is used.
    const base = environment.production ? '' : 'https://vallogaard.dk';
    this.referater = (collectionData(q, { idField: 'id' }) as Observable<Referat[]>).pipe(
      map(referater => referater.map(r => ({ ...r, ref: base + '/dokument/referat/' + r.id })))
    );
    this.referater.subscribe(x => {
      this.loading = false;
    });
  }

}

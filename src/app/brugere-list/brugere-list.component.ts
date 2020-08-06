import { Component, OnInit, Input } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';
import { Profile } from '../core';
import { map, tap, mergeAll, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-brugere-list',
  templateUrl: './brugere-list.component.html',
  styleUrls: ['./brugere-list.component.css']
})
export class BrugereListComponent implements OnInit {

  constructor(
    private db: AngularFirestore,
    public router: Router,
    private authService: AuthService) { }

  brugere: Observable<Profile[]>;
  loading: boolean;
  allEmails: string;

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

    this.brugere = this.db.collection<Profile>('profiles', ref => ref.orderBy('name', 'asc')).valueChanges();
    this.brugere.subscribe(x => {
      this.allEmails = x.map(p => p.email).join(';');
      this.loading = false;
    });
  }

}

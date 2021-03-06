import { Component, OnInit, Input } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';
import { Referat } from '../core/models/referat.model';

@Component({
  selector: 'app-referater-list',
  templateUrl: './referater-list.component.html',
  styleUrls: ['./referater-list.component.css']
})
export class ReferaterListComponent implements OnInit {

  constructor(
    private db: AngularFirestore,
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

    this.referater = this.db.collection<Referat>('referater', ref => ref.orderBy('from', 'desc')).valueChanges();
    this.referater.subscribe(x => {
      this.loading = false;
    });
  }

}

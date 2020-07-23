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

  @Input() limit: number;
  @Input()
  set config(config: {}) { }

  ngOnInit(): void {
    this.loading = true;

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.referater = this.db.collection<Referat>('referater', ref => ref.orderBy('from', 'asc')).valueChanges();
    this.referater.subscribe(x => {
      this.loading = false;
    });
  }

}

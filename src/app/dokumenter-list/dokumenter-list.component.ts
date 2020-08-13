import { Component, OnInit, Input } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';
import { Dokument } from '../core/models/dokument.model';
import * as firebase from 'firebase/app';
import { of } from 'rxjs';

@Component({
  selector: 'app-dokumenter-list',
  templateUrl: './dokumenter-list.component.html',
  styleUrls: ['./dokumenter-list.component.css']
})
export class DokumenterListComponent implements OnInit {

  constructor(
    private db: AngularFirestore,
    public router: Router,
    private authService: AuthService
  ) { }

  dokumenter: Observable<Dokument[]>;
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

    const storageRef = firebase.storage().ref();
    const listRef = storageRef.child('dokumenter');
    const that = this;
    listRef.listAll().then(async function(res) {
      const docs = await that.itemsToDokumenter(res.items);
      that.dokumenter = await of(docs);
      that.loading = false;
    }).catch(function(error) {
      console.error(error);
    });
  }

  itemsToDokumenter(items: firebase.storage.Reference[]): Promise<Dokument[]> {
    return Promise.all(items.map(async (item) => {
      const m = await item.getMetadata();
      const u = await item.getDownloadURL();
      return {
        title: m.customMetadata?.title,
        filename: m.name,
        size: m.size,
        uploadedAt: new Date(m.timeCreated),
        ref: u
      } as Dokument;
    }));
  }

}

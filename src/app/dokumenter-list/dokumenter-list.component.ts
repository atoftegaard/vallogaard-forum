import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';
import { Dokument } from '../core/models/dokument.model';
import { Storage, StorageReference, ref, listAll, getMetadata, getDownloadURL } from '@angular/fire/storage';
import { of } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-dokumenter-list',
  templateUrl: './dokumenter-list.component.html',
  styleUrls: ['./dokumenter-list.component.css']
})
export class DokumenterListComponent implements OnInit {

  constructor(
    private storage: Storage,
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

    const listRef = ref(this.storage, 'dokumenter');
    const that = this;
    listAll(listRef).then(async function(res) {
      const docs = await that.itemsToDokumenter(res.items);
      that.dokumenter = await of(docs);
      that.loading = false;
    }).catch(function(error) {
      console.error(error);
    });
  }

  itemsToDokumenter(items: StorageReference[]): Promise<Dokument[]> {
    return Promise.all(items.map(async (item) => {
      const m = await getMetadata(item);
      const u = await getDownloadURL(item);
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

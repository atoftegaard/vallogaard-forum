import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Dokument, BESTYRELSEN_CATEGORY, BESTYRELSEN_STORAGE_PATH } from '../core/models/dokument.model';
import { Storage, StorageReference, ref, listAll, getMetadata, getDownloadURL, updateMetadata } from '@angular/fire/storage';
import { buildContentDisposition, extensionForContentType } from '../core/dokument-download-name';
import { environment } from '../../environments/environment';
import { onIdTokenChanged } from '@angular/fire/auth';
import { setSessionCookie, clearSessionCookie } from '../core/session-cookie';

export interface DokumentGroup {
  category: string;
  dokumenter: Dokument[];
}

const UNCATEGORIZED = 'Andet';

@Component({
  standalone: false,
  selector: 'app-dokumenter-list',
  templateUrl: './dokumenter-list.component.html',
  styleUrls: ['./dokumenter-list.component.css']
})
export class DokumenterListComponent implements OnInit, OnDestroy {

  constructor(
    private storage: Storage,
    public router: Router,
    private authService: AuthService
  ) { }

  private allDokumenter: Dokument[] = [];
  groups: DokumentGroup[] = [];
  categoryNames: string[] = [];
  loading: boolean;
  isAdmin: boolean;

  @Input() limit: number;
  @Input()
  set config(config: {}) { }

  async ngOnInit() {
    this.loading = true;
    await this.authService.loggedIn();

    const isAdmin = await this.authService.isAdmin;
    this.isAdmin = isAdmin;

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    await this.loadDokumenter();
  }

  private stopTokenCookie: (() => void) | null = null;

  // Board documents are served by a function that has to verify the caller is an admin, and a
  // plain link can't carry a login. onIdTokenChanged fires straight away and again each time
  // Firebase Auth refreshes the (1 hour) token, so the cookie stays valid while the page is open.
  //
  // On localhost a cookie can't reach vallogaard.dk, so there the links carry the token as a
  // ?token= parameter instead (see applyLocalBoardLinks).
  private keepBoardCookieFresh() {
    if (this.stopTokenCookie) {
      return;
    }
    this.stopTokenCookie = onIdTokenChanged(this.authService.auth, async (user) => {
      if (!user) {
        return;
      }
      this.latestToken = await user.getIdToken();
      if (environment.production) {
        setSessionCookie(this.latestToken);
      } else {
        this.applyLocalBoardLinks();
      }
    });
  }

  private latestToken = '';

  private applyLocalBoardLinks() {
    if (environment.production || !this.latestToken) {
      return;
    }
    for (const d of this.allDokumenter) {
      if (d.bestyrelsen) {
        d.ref = 'https://vallogaard.dk/dokument/bestyrelsen/' + d.filename + '?token=' + encodeURIComponent(this.latestToken);
      }
    }
  }

  ngOnDestroy() {
    this.stopTokenCookie?.();
    clearSessionCookie();
  }

  trackByCategory(index: number, group: DokumentGroup) {
    return group.category;
  }

  trackByPath(index: number, dokument: Dokument) {
    return dokument.path;
  }

  // Also called after an upload, so a new document shows up without reloading the page.
  // Groups are tracked by category name in the template, so accordions the user has opened
  // stay open across a reload instead of being rebuilt collapsed.
  async loadDokumenter() {
    const isAdmin = this.isAdmin;
    this.loading = true;
    try {
      const publicItems = (await listAll(ref(this.storage, 'dokumenter'))).items;
      const docs = await this.itemsToDokumenter(publicItems, 'public');

      if (isAdmin) {
        // Kept in its own try/catch deliberately - if this admin-only fetch fails (wrong
        // Storage rules, no bestyrelse folder yet, etc.) it must not also wipe out the public
        // documents that were already fetched successfully above.
        try {
          const bestyrelsesItems = (await listAll(ref(this.storage, BESTYRELSEN_STORAGE_PATH))).items;
          const bestyrelsesDocs = await this.itemsToDokumenter(bestyrelsesItems, 'board');
          bestyrelsesDocs.forEach(d => { d.bestyrelsen = true; d.category = BESTYRELSEN_CATEGORY; });
          docs.push(...bestyrelsesDocs);
        } catch (bestyrelseError) {
          console.error('Kunne ikke hente bestyrelsesdokumenter', bestyrelseError);
        }
      }

      this.allDokumenter = docs;
      this.regroup();
      if (isAdmin) {
        this.keepBoardCookieFresh();
        this.applyLocalBoardLinks();
        this.backfillDownloadNames(docs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.loading = false;
    }
  }

  // Documents uploaded before download names existed were saved as their GUID. Their original
  // extension is gone, so it's derived from the stored contentType (unknown types are left
  // alone rather than guessed). Runs for admins only, since it writes metadata.
  private backfillDownloadNames(docs: Dokument[]) {
    for (const d of docs) {
      if (!d.title || d.contentDisposition?.includes('filename')) {
        continue;
      }
      const extension = extensionForContentType(d.contentType);
      if (!extension) {
        continue;
      }
      const contentDisposition = buildContentDisposition(d.title, extension);
      updateMetadata(ref(this.storage, d.path), { contentDisposition })
        .then(() => d.contentDisposition = contentDisposition)
        .catch(error => console.error('Kunne ikke sætte download-navn på ' + d.path, error));
    }
  }

  // Documents are linked via vallogaard.dk/dokument/... (see the dokument Cloud Function +
  // Hosting rewrite) instead of the firebasestorage.googleapis.com token URL.
  //  - public:  /dokument/<id>. `ng serve` has no Hosting rewrite of its own, so locally the
  //             link uses the live site's full address (same rewrite, same function).
  //  - board:   /dokument/bestyrelsen/<id>, authorised by the __session cookie (see
  //             keepBoardCookieFresh). That cookie belongs to the vallogaard.dk domain, so it
  //             can't be sent from localhost - there the direct token link is kept.
  itemsToDokumenter(items: StorageReference[], area: 'public' | 'board'): Promise<Dokument[]> {
    return Promise.all(items.map(async (item) => {
      const m = await getMetadata(item);
      const u = area === 'public'
        ? (environment.production ? '' : 'https://vallogaard.dk') + '/dokument/' + m.name
        : environment.production
          ? '/dokument/bestyrelsen/' + m.name
          : await getDownloadURL(item);
      return {
        title: m.customMetadata?.title,
        category: m.customMetadata?.category,
        filename: m.name,
        path: item.fullPath,
        size: m.size,
        uploadedAt: new Date(m.timeCreated),
        ref: u,
        contentType: m.contentType,
        contentDisposition: m.contentDisposition
      } as Dokument;
    }));
  }

  // Called after a document's category is edited in place - the edited Dokument object is
  // already updated by the child, this just re-buckets the known documents rather than
  // re-fetching everything from Storage.
  onCategoryChanged() {
    this.regroup();
  }

  onDokumentDeleted(dokument: Dokument) {
    this.allDokumenter = this.allDokumenter.filter(d => d !== dokument);
    this.regroup();
  }

  private regroup() {
    this.groups = this.groupByCategory(this.allDokumenter);
    // Suggested when uploading/re-categorizing - Bestyrelsen is deliberately not among them.
    this.categoryNames = this.groups.map(g => g.category)
      .filter(c => c !== UNCATEGORIZED && c !== BESTYRELSEN_CATEGORY);
  }

  // Documents uploaded before categories existed (or left blank) fall into a catch-all
  // group instead of disappearing or breaking the grouping.
  private groupByCategory(docs: Dokument[]): DokumentGroup[] {
    const map = new Map<string, Dokument[]>();
    for (const d of docs) {
      const key = d.category?.trim() || UNCATEGORIZED;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(d);
    }
    return Array.from(map.entries())
      .map(([category, dokumenter]) => ({ category, dokumenter }))
      .sort((a, b) => {
        if (a.category === UNCATEGORIZED) { return 1; }
        if (b.category === UNCATEGORIZED) { return -1; }
        return a.category.localeCompare(b.category, 'da');
      });
  }

}

import { Component, Input, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Article } from '../../core/models/article.model';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-article-list',
  styleUrls: ['article-list.component.css'],
  templateUrl: './article-list.component.html'
})

export class ArticleListComponent implements OnInit {
  constructor(
    private firestore: Firestore,
    public router: Router,
    private authService: AuthService) { }

  articles: Observable<Article[]>;
  loading: boolean;

  @Input() limit: number;
  @Input()
  set config(config: {}) { }

  // Firestore's collectionData() emits a fresh array of newly-constructed objects on every
  // snapshot (e.g. cache-then-server on load, or any write to any article anywhere) - without
  // trackBy, *ngFor's default identity diffing tears down and recreates every article-preview
  // instance on each emission, resetting any state they've loaded (e.g. commenter avatars).
  trackBySlug(index: number, article: Article) {
    return article.slug;
  }

  async ngOnInit() {
    this.loading = true;
    await this.authService.loggedIn();

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const q = query(collection(this.firestore, 'articles'),
      orderBy('sticky', 'desc'), orderBy('createdAt', 'desc'));
    this.articles = collectionData(q) as Observable<Article[]>;
    this.articles.subscribe(x => {
      this.loading = false;
    });
  }
}

import { Component, Input, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Article } from '../../core/models/article.model';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-article-list',
  styleUrls: ['article-list.component.css'],
  templateUrl: './article-list.component.html'
})

export class ArticleListComponent implements OnInit {
  constructor(
    private db: AngularFirestore,
    public router: Router,
    private authService: AuthService) { }

  articles: Observable<Article[]>;
  loading: boolean;

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

    this.articles = this.db.collection<Article>('articles', ref => ref.orderBy('createdAt', 'desc')).valueChanges();
    this.articles.subscribe(x => {
      this.loading = false;
    });
  }
}

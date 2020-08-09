import { Component, Input, Inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Article } from '../../core';
import { SimpleProfile } from '../../core/models/simple-profile.model';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { AngularFirestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-article-meta',
  templateUrl: './article-meta.component.html',
  styleUrls: ['article-meta.component.css'],
  providers: [DatePipe]
})
export class ArticleMetaComponent {
  [x: string]: any;
  @Input() article: Article;
  @Input() showSticky: boolean;
  @Input() bg: string;

  constructor(@Inject(DOCUMENT) private document: Document,
    private db: AngularFirestore,
    private datePipe: DatePipe,
    private authService: AuthService) {}

  toLongDate(date: any) {
    if (date) {
      return this.datePipe.transform(date.toDate(), 'longDate');
    } else {
      return '';
    }
  }

  articleCount() {
    if (!this.article?.views) {
      return 0;
    }
    return Object.keys(this.article?.views).length;
  }

  uniques (comments: SimpleProfile[]) {
    return comments.filter(function(elem, index, self) {
      return comments.map(mapObj => mapObj['uid']).indexOf(elem['uid']) === index;
    });
  }

  copyUrl() {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = this.document.location.href;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }

  isWatching() {
    if (!this.article.watchers) {
      return false;
    } else {
      return this.article.watchers[this.authService.uid];
    }
  }

  watchingAllowed() {
    if (!this.authService.profile) {
      return false;
    } else {
      return this.authService.profile.notifyAboutNewComments;
    }
  }

  async watch(watch) {
    if (watch) {
      this.article.watchers[this.authService.uid] = {
        uid: this.authService.profile.uid,
        name: this.authService.profile.name,
        image: this.authService.profile.image
      } as SimpleProfile;
    } else {
      delete this.article.watchers[this.authService.uid];
    }
    await this.db.collection<Article>('articles').doc(this.article.slug)
      .update({
        watchers: this.article.watchers
      });
  }
}

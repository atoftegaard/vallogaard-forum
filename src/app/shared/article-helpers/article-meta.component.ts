import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Article } from '../../core';
import { SimpleProfile } from '../../core/models/simple-profile.model';

@Component({
  selector: 'app-article-meta',
  templateUrl: './article-meta.component.html',
  styleUrls: ['article-meta.component.css'],
  providers: [DatePipe]
})
export class ArticleMetaComponent {
  @Input() article: Article;
  @Input() showSticky: boolean;
  @Input() bg: string;

  constructor(private datePipe: DatePipe) {}

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
}

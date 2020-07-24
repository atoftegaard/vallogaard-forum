import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Article } from '../../core';

@Component({
  selector: 'app-article-meta',
  templateUrl: './article-meta.component.html',
  styleUrls: ['article-meta.component.css'],
  providers: [DatePipe]
})
export class ArticleMetaComponent {
  @Input() article: Article;

  constructor(private datePipe: DatePipe) {}

  toLongDate(date: any) {
    if (date) {
      return this.datePipe.transform(date.toDate(), 'longDate');
    } else {
      return '';
    }
  }
}

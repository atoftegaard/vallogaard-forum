import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Article } from '../../core';

@Component({
  selector: 'app-article-meta',
  templateUrl: './article-meta.component.html',
  providers:[DatePipe]
})
export class ArticleMetaComponent {
  @Input() article: Article;

  constructor(private datePipe: DatePipe) {}

  toLongDate(date: any) {
    return this.datePipe.transform(date.toDate(), 'longDate');
  }
}

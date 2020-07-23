import { NgModule } from '@angular/core';
import { ArticleComponent } from './article.component';
import { ArticleCommentComponent } from './article-comment.component';
import { MarkdownPipe } from './markdown.pipe';
import { SharedModule } from '../shared';
import { ArticleRoutingModule } from './article-routing.module';
import { EditorModule } from 'primeng/editor';

@NgModule({
  imports: [
    SharedModule,
    ArticleRoutingModule,
    EditorModule,
  ],
  declarations: [
    ArticleComponent,
    ArticleCommentComponent,
    MarkdownPipe
  ],
  exports: [
  ]
})
export class ArticleModule { }
import { NgModule } from '@angular/core';
import { ArticleComponent } from './article.component';
import { ArticleCommentComponent } from './article-comment.component';
import { MarkdownPipe } from './markdown.pipe';
import { SharedModule } from '../shared';
import { ArticleRoutingModule } from './article-routing.module';
import { EditorModule } from 'primeng/editor';
import { EditorHelper } from '../shared/editor-helper';

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
  providers: [
    EditorHelper
  ],
  exports: [
  ]
})
export class ArticleModule { }

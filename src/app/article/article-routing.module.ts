import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ArticleComponent } from './article.component';
import { ArticleResolver } from './article-resolver.service';
import { ResolveConfig } from 'ngx-typed-router';
import { ArticleRouteData } from './article-route-data';

const routes: Routes = [
  {
    path: ':slug',
    component: ArticleComponent,
    resolve: {
      article: ArticleResolver
    } as ResolveConfig<ArticleRouteData>
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],

  providers: [
    ArticleResolver
  ]
})

export class ArticleRoutingModule {}

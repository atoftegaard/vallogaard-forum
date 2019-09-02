import { Injectable, } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Article } from '../core';
import { map, first } from 'rxjs/operators';
import { ArticleRoutePath } from './article-route-path';
import { TypedRouteSnapshot } from 'ngx-typed-router';
import { Resolve } from '@angular/router';

@Injectable()
export class ArticleResolver implements Resolve<Article> {
  constructor(private db: AngularFirestore) {}

  resolve(snapshot: TypedRouteSnapshot<Article, ArticleRoutePath>): Observable<Article> {
    const collection = this.db.collection<Article>('articles', ref => ref.where('slug', '==', snapshot.params.slug));
    return collection.valueChanges().pipe(first(), map(x => x[0]));
  }
}
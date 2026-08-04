import { Injectable, } from '@angular/core';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Article } from '../core';
import { map, first } from 'rxjs/operators';
import { ArticleRoutePath } from './article-route-path';
import { TypedRouteSnapshot } from 'ngx-typed-router';
import { Resolve } from '@angular/router';

@Injectable()
export class ArticleResolver implements Resolve<Article> {
  constructor(private firestore: Firestore) {}

  resolve(snapshot: TypedRouteSnapshot<Article, ArticleRoutePath>): Observable<Article> {
    const q = query(collection(this.firestore, 'articles'), where('slug', '==', snapshot.params.slug));
    return (collectionData(q) as Observable<Article[]>).pipe(first(), map(x => x[0]));
  }
}

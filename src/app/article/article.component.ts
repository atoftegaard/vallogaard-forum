import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Article, Comment, Profile } from '../core';
import { TypedRoute } from 'ngx-typed-router';
import { ArticleRouteData } from './article-route-data';
import { ArticleRoutePath } from './article-route-path';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import * as firebase from 'firebase/app';
import * as uuid from 'uuid';
import { DatePipe } from '@angular/common';
import { Editor } from 'primeng/editor';

@Component({
  selector: 'app-article-page',
  templateUrl: './article.component.html',
  providers:[DatePipe],
  styleUrls: ['./article.component.css']
})

export class ArticleComponent implements OnInit {
  @ViewChild(Editor) editor: Editor;

  constructor(@Inject(ActivatedRoute) private route: TypedRoute<ArticleRouteData,
   ArticleRoutePath>,
    private db: AngularFirestore,
    private authService: AuthService
  ) { }
  
  commentContent: string;
  article: Article;
  comments: Observable<Comment[]>
  currentUser: Profile;
  canModify: boolean;
  commentFormErrors = {};
  isSubmitting = false;
  isDeleting = false;

  imageHandler() {
    let that = this;
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    const quill = this.editor.quill;
    input.onchange = async function() {
      if (input.files.length) {
        let file = input.files[0];
        let range = quill.getSelection(true);
        let fileName = uuid.v4()
        let storageRef = firebase.storage().ref();
        let imageRef = storageRef.child(fileName);

        quill.insertEmbed(range.index, 'image', 'assets/img/loading_large.gif');
        quill.setSelection(range.index + 1);

        imageRef.put(file).then(() => {
          const storageRef = firebase.storage().ref().child(fileName + '_500x500');
          that.keepTrying(10, storageRef).then((url) => {
            quill.deleteText(range.index, 1);
            quill.insertEmbed(range.index, 'image', url);
          });
        });
      }
    }
  }

  delay(t, v) {
    return new Promise(function(resolve) { 
      setTimeout(resolve.bind(null, v), t)
    });
  }
  
  keepTrying(triesRemaining, storageRef) {
    if (triesRemaining < 0) {
      return Promise.reject('out of tries');
    }
  
    return storageRef.getDownloadURL().then((url) => {
      return url;
    }).catch((error) => {
      switch (error.code) {
        case 'storage/object-not-found':
          return this.delay(2000, this).then(() => {
            return this.keepTrying(triesRemaining - 1, storageRef)
          });
        default:
          console.log(error);
          return Promise.reject(error);
      }
    })
  }

  ngOnInit() {
    this.article = this.route.snapshot.data.article;
    this.comments = this.db.collection<Comment>('comments', ref => ref.orderBy('createdAt', 'asc')
      .where('slug', '==', this.route.snapshot.params.slug)).valueChanges();
  }

  ngAfterViewInit() {
    this.editor.quill.getModule('toolbar').addHandler('image', this.imageHandler.bind(this));
  }

  deleteArticle() {
    this.isDeleting = true;

    // this.articlesService.destroy(this.article.slug)
    //   .subscribe(
    //     success => {
    //       this.router.navigateByUrl('/');
    //     }
    //   );
  }

  addComment() {
    this.isSubmitting = true;
    this.commentFormErrors = {};
    let that = this;
    this.db.collection('comments').add({
        slug: this.article.slug,
        body: this.editor.quill.root.innerHTML,
        createdAt: new Date(),
        author: this.authService.profile
    })
    .then(function() {
        that.commentContent = '';
        that.isSubmitting = false;
    })
    .catch(function(error) {
        console.error("Error writing document: ", error);
        that.isSubmitting = false;
    });
  }

  onDeleteComment(comment) {
    // this.commentsService.destroy(comment.id, this.article.slug)
    //   .subscribe(
    //     success => {
    //       this.comments = this.comments.filter((item) => item !== comment);
    //     }
    //   );
  }

}
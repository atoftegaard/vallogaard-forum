import { Component, OnInit, Inject, ViewChild, AfterViewInit } from '@angular/core';
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
import { EditorHelper } from '../shared/editor-helper';

@Component({
  selector: 'app-article-page',
  templateUrl: './article.component.html',
  providers: [DatePipe],
  styleUrls: ['./article.component.css']
})

export class ArticleComponent implements OnInit, AfterViewInit  {
  @ViewChild(Editor) editor: Editor;

  constructor(@Inject(ActivatedRoute) private route: TypedRoute<ArticleRouteData, ArticleRoutePath>,
    private db: AngularFirestore,
    private authService: AuthService,
    private editorHelper: EditorHelper
  ) { }

  commentContent: string;
  article: Article = { author: {} } as Article;
  comments: Observable<Comment[]>;
  currentUser: Profile;
  canModify: boolean;
  commentFormErrors = {};
  isSubmitting = false;
  isDeleting = false;

  imageHandler() {
    const that = this;
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    const quill = this.editor.quill;
    input.onchange = async function() {
      if (input.files.length) {
        const file = input.files[0];
        const range = quill.getSelection(true);
        const fileName = uuid.v4();
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(fileName);

        quill.insertEmbed(range.index, 'image', 'assets/img/loading_large.gif');
        quill.setSelection(range.index + 1);

        imageRef.put(file).then(() => {
          const lStorageRef = firebase.storage().ref().child(fileName + '_500x500');
          that.editorHelper.keepTrying(10, lStorageRef).then((url) => {
            quill.deleteText(range.index, 1);
            quill.insertEmbed(range.index, 'image', url);
          });
        });
      }
    };
  }

  async ngOnInit() {
    await this.authService.loggedIn();

    this.article = this.route.snapshot.data.article;
    this.comments = this.db.collection<Comment>('comments', ref => ref.orderBy('createdAt', 'desc')
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
    const that = this;
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
        console.error('Error writing document: ', error);
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

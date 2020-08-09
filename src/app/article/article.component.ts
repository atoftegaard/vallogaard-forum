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
import { SimpleProfile } from '../core/models/simple-profile.model';
import { AngularFireFunctions } from '@angular/fire/functions';

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
    private fns: AngularFireFunctions,
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

    await this.authService.isAdmin.then(x => {
      if (!this.article.views[this.authService.profile.uid]) {
        this.article.views[this.authService.profile.uid] = {
            uid: this.authService.profile.uid,
            name: this.authService.profile.name,
            image: this.authService.profile.image
        } as SimpleProfile;
        this.db.collection<Article>('articles').doc(this.article.slug)
        .update({
          views: this.article.views
        });
      }
    });
  }

  ngAfterViewInit() {
    this.editor.quill.getModule('toolbar').addHandler('image', this.imageHandler.bind(this));
  }

  watchingAllowed() {
    if (!this.authService.profile) {
      return false;
    } else {
      return this.authService.profile.notifyAboutNewComments;
    }
  }

  async addComment() {
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
        that.notifyWatchers(that.article.slug, that.authService.profile.uid, that.authService.profile.name);

        const simpleProfile = {
          uid: that.authService.profile.uid,
          name: that.authService.profile.name,
          image: that.authService.profile.image
        } as SimpleProfile;

        that.article.comments.push(simpleProfile);
        if (that.watchingAllowed()) {
          that.article.watchers[simpleProfile.uid] = simpleProfile;
        }

        that.commentContent = '';
        that.db.collection<Article>('articles').doc(that.article.slug)
          .update({
            updatedAt: new Date(),
            comments: that.article.comments,
            watchers: that.article.watchers
          }).then(x => {
            that.isSubmitting = false;
          });
    })
    .catch(function(error) {
        console.error('Error writing document: ', error);
        that.isSubmitting = false;
    });
  }

  async notifyWatchers(slug, commentorUid, commentorName) {
    const callable = this.fns.httpsCallable('notifyWatchers');
    callable({
      'articleSlug': slug,
      'commentorUid': commentorUid,
      'commentorName': commentorName,
      'articleUrl': `${window.location.origin}/article/${slug}`
    }).toPromise().then(res => {

    })
    .catch(er => {
      console.log(er);
    });
  }
}

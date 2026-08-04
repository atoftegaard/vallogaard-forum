import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Article, Comment, Profile } from '../core';
import { TypedRoute } from 'ngx-typed-router';
import { ArticleRouteData } from './article-route-data';
import { ArticleRoutePath } from './article-route-path';
import { Firestore, collection, collectionData, doc, updateDoc, addDoc, query, orderBy, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Storage, ref, uploadBytes } from '@angular/fire/storage';
import { Functions, httpsCallable } from '@angular/fire/functions';
import * as uuid from 'uuid';
import { DatePipe } from '@angular/common';
import { Editor, EditorInitEvent } from 'primeng/editor';
import { EditorHelper } from '../shared/editor-helper';
import { SimpleProfile } from '../core/models/simple-profile.model';

@Component({
  standalone: false,
  selector: 'app-article-page',
  templateUrl: './article.component.html',
  providers: [DatePipe],
  styleUrls: ['./article.component.css']
})

export class ArticleComponent implements OnInit  {
  @ViewChild(Editor) editor: Editor;

  constructor(@Inject(ActivatedRoute) private route: TypedRoute<ArticleRouteData, ArticleRoutePath>,
    private firestore: Firestore,
    private storage: Storage,
    private fns: Functions,
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
        const imageRef = ref(that.storage, fileName);

        quill.insertEmbed(range.index, 'image', 'assets/img/loading_large.gif');
        quill.setSelection(range.index + 1);

        uploadBytes(imageRef, file, { contentType: file.type }).then(() => {
          const lStorageRef = ref(that.storage, fileName + '_500x500');
          that.editorHelper.keepTrying(10, lStorageRef).then((url) => {
            quill.deleteText(range.index, 1);
            quill.insertEmbed(range.index, 'image', url);
          }).catch((error) => {
            console.error('Error loading resized image: ', error);
            quill.deleteText(range.index, 1);
          });
        });
      }
    };
  }

  async ngOnInit() {
    await this.authService.loggedIn();

    this.article = this.route.snapshot.data.article;
    const commentsQuery = query(collection(this.firestore, 'comments'),
      orderBy('createdAt', 'desc'), where('slug', '==', this.route.snapshot.params.slug));
    this.comments = collectionData(commentsQuery) as Observable<Comment[]>;

    await this.authService.isAdmin.then(x => {
      if (!this.article.views[this.authService.profile.uid]) {
        this.article.views[this.authService.profile.uid] = {
            uid: this.authService.profile.uid,
            name: this.authService.profile.name,
            image: this.authService.profile.image
        } as SimpleProfile;
        updateDoc(doc(this.firestore, 'articles', this.article.slug), {
          views: this.article.views
        });
      }
    });
  }

  onEditorInit(event: EditorInitEvent) {
    event.editor.getModule('toolbar').addHandler('image', this.imageHandler.bind(this));
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
    addDoc(collection(this.firestore, 'comments'), {
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

        if (that.watchingAllowed()) {
          that.article.watchers[simpleProfile.uid] = simpleProfile;
        }

        that.commentContent = '';
        updateDoc(doc(that.firestore, 'articles', that.article.slug), {
            updatedAt: new Date(),
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
    const callable = httpsCallable(this.fns, 'notifyWatchers');
    callable({
      'articleSlug': slug,
      'commentorUid': commentorUid,
      'commentorName': commentorName,
      'articleUrl': `${window.location.origin}/article/${slug}`
    }).then(res => {

    })
    .catch(er => {
      console.log(er);
    });
  }
}

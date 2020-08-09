import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Article } from '../core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { first, map } from 'rxjs/operators';
import { AngularFireFunctions } from '@angular/fire/functions';
import { Editor } from 'primeng/editor';
import * as uuid from 'uuid';
import { EditorHelper } from '../shared/editor-helper';
import * as firebase from 'firebase/app';
import * as slug from 'slug';
import { SimpleProfile } from '../core/models/simple-profile.model';

@Component({
  selector: 'app-editor-page',
  templateUrl: './editor.component.html'
})
export class EditorComponent implements OnInit, AfterViewInit {
  @ViewChild(Editor) editor: Editor;

  article: Article = {} as Article;
  articleContent: string;
  articleForm: FormGroup;
  tagField = new FormControl();
  error: string;
  isSubmitting = false;
  isAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: AngularFirestore,
    private fb: FormBuilder,
    private authService: AuthService,
    private fns: AngularFireFunctions,
    private editorHelper: EditorHelper
  ) {
    // use the FormBuilder to create a form group
    this.articleForm = this.fb.group({
      title: '',
      body: '',
      sticky: false
    });
  }

  async ngOnInit() {
    await this.authService.loggedIn();

    this.authService.isAdmin.then((isAdmin) => {
      this.isAdmin = isAdmin;
    });

    this.route.data.subscribe((data: { article: Article }) => {
      if (data.article) {
        this.article = data.article;
        this.articleForm.patchValue(data.article);
      }
    });
  }

  ngAfterViewInit() {
    this.editor.quill.getModule('toolbar').addHandler('image', this.imageHandler.bind(this));
  }

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

  submitForm() {
    this.isSubmitting = true;

    // update the model
    this.articleForm.value.slug = slug(this.articleForm.value.title);
    this.articleForm.value.createdAt = new Date();
    this.articleForm.value.updatedAt = new Date();
    this.updateArticle(this.articleForm.value);
    this.article.author = this.authService.profile;
    const that = this;

    const collection = this.db.collection<Article>('articles', ref => ref.where('slug', '==', this.article.slug));
    collection.valueChanges().pipe(first(), map(x => x[0])).subscribe(a => {
      if (a) {
        that.error = 'Der findes allerede et opslag med samme navn, vælg venligst et andet';
        that.isSubmitting = false;
      } else {
        // post the changes
        const articleRef = this.db.collection('articles').doc(this.article.slug);

        articleRef.set(this.article, { merge: true }).then(() => {
          that.router.navigateByUrl('/article/' + that.article.slug),
          this.fns.httpsCallable('notifyNewArticle')({
            'articlename': this.article.title,
            'articleurl': `${window.location.origin}/article/${this.article.slug}`,
            'authorname': this.article.author.name,
            'authoruid': this.article.author.uid
          });
          that.isSubmitting = false;
        })
        .catch(function(error) {
          console.error('Error writing document: ', error);
          that.isSubmitting = false;
        });
      }
    });
  }

  updateArticle(values: Object) {
    Object.assign(this.article, values);
    this.article.comments = [];
    this.article.views = {} as Map<string, SimpleProfile>;
    this.article.watchers = {} as Map<string, SimpleProfile>;
    this.article.body = this.editor.quill.root.innerHTML;
  }
}

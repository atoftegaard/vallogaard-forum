import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Article } from '../core';
import { Firestore, collection, collectionData, doc, setDoc, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { first, map } from 'rxjs/operators';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Editor, EditorInitEvent } from 'primeng/editor';
import 'quill-mention/autoregister';
import * as uuid from 'uuid';
import { EditorHelper } from '../shared/editor-helper';
import { Storage, ref, uploadBytes } from '@angular/fire/storage';
import slug from 'slug';
import { SimpleProfile } from '../core/models/simple-profile.model';

@Component({
  standalone: false,
  selector: 'app-editor-page',
  templateUrl: './editor.component.html'
})
export class EditorComponent implements OnInit {
  @ViewChild(Editor) editor: Editor;

  article: Article = {} as Article;
  articleContent: string;
  articleForm: FormGroup;
  tagField = new FormControl();
  error: string;
  isSubmitting = false;
  isAdmin = false;
  editorModules = { mention: {
    allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
    mentionDenotationChars: ['@'],
    source: async function(searchTerm, renderList) {
      const matchedPeople = await this.suggestPeople(searchTerm);
      renderList(matchedPeople);
    }
  }};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private fb: FormBuilder,
    private authService: AuthService,
    private fns: Functions,
    private storage: Storage,
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

  onEditorInit(event: EditorInitEvent) {
    event.editor.getModule('toolbar').addHandler('image', this.imageHandler.bind(this));
  }

  async suggestPeople(searchTerm) {
    const allPeople = [
      {
        id: 1,
        value: 'Fredrik Sundqvist'
      },
      {
        id: 2,
        value: 'Patrik Sjölin'
      }
    ];
    return allPeople.filter(person => person.value.includes(searchTerm));
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

  submitForm() {
    this.isSubmitting = true;

    // update the model
    this.articleForm.value.slug = slug(this.articleForm.value.title);
    this.articleForm.value.createdAt = new Date();
    this.articleForm.value.updatedAt = new Date();
    this.updateArticle(this.articleForm.value);
    this.article.author = this.authService.profile;
    const that = this;

    const q = query(collection(this.firestore, 'articles'), where('slug', '==', this.article.slug));
    (collectionData(q) as Observable<Article[]>).pipe(first(), map(x => x[0])).subscribe(a => {
      if (a) {
        that.error = 'Der findes allerede et opslag med samme navn, vælg venligst et andet';
        that.isSubmitting = false;
      } else {
        // post the changes
        const articleRef = doc(this.firestore, 'articles', this.article.slug);

        setDoc(articleRef, this.article, { merge: true }).then(() => {
          that.router.navigateByUrl('/article/' + that.article.slug),
          httpsCallable(this.fns, 'notifyNewArticle')({
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
    this.article.views = {} as Map<string, SimpleProfile>;
    this.article.watchers = {} as Map<string, SimpleProfile>;
    this.article.body = this.editor.quill.root.innerHTML;
  }
}

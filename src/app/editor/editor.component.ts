import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Article } from '../core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { first, map } from 'rxjs/operators';
let slug = require('slug');

@Component({
  selector: 'app-editor-page',
  templateUrl: './editor.component.html'
})
export class EditorComponent implements OnInit {
  article: Article = {} as Article;
  articleContent: string;
  articleForm: FormGroup;
  tagField = new FormControl();
  error: string;
  isSubmitting = false;
  commentOptions: Object = {
    charCounterCount: false,
    attribution:false,
    placeholderText: "Skriv opslag her",
    toolbarButtons: ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertTable', '|', 'insertLink', 'insertImage', '|', 'undo', 'redo']
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: AngularFirestore,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    // use the FormBuilder to create a form group
    this.articleForm = this.fb.group({
      title: '',
      body: ''
    });
  }

  ngOnInit() {
    // If there's an article prefetched, load it
    this.route.data.subscribe((data: { article: Article }) => {
      if (data.article) {
        this.article = data.article;
        this.articleForm.patchValue(data.article);
      }
    });
  }

  submitForm() {
    this.isSubmitting = true;

    // update the model
    this.articleForm.value.slug = slug(this.articleForm.value.title);
    this.articleForm.value.createdAt = new Date();
    this.updateArticle(this.articleForm.value);
    this.article.author = this.authService.profile;
    this.article.body = this.articleContent;

    let that = this;
    const collection = this.db.collection<Article>('articles', ref => ref.where('slug', '==', this.article.slug));
    collection.valueChanges().pipe(first(), map(x => x[0])).subscribe(a => {
      if (a) {
        console.error('Document already exists');
        that.error = 'Der findes allerede et opslag med samme navn, vælg venligst et andet';
        that.isSubmitting = false;
      } else {
        // post the changes
        let articleRef = this.db.collection('articles').doc(this.article.slug);

        articleRef.set(this.article, { merge: true }).then(function() {
          that.router.navigateByUrl('/article/' + that.article.slug),
          that.isSubmitting = false;
        })
        .catch(function(error) {
          console.error("Error writing document: ", error);
          that.isSubmitting = false;
        });
      }
    });
    
  }

  updateArticle(values: Object) {
    Object.assign(this.article, values);
  }
}

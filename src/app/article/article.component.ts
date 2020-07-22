import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Article,
  Comment,
  Profile,
} from '../core';
import { TypedRoute } from 'ngx-typed-router';
import { ArticleRouteData } from './article-route-data';
import { ArticleRoutePath } from './article-route-path';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import * as firebase from 'firebase/app';
import * as uuid from 'uuid';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-article-page',
  templateUrl: './article.component.html',
  providers:[DatePipe],
  styleUrls: ['./article.component.css']
})
export class ArticleComponent implements OnInit {

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
  images: File[] = [];
  commentOptions: string;
  /*
  commentOptions: Object = {
    height: 300,
    charCounterCount: false,
    attribution:false,
    placeholderText: "Skriv opslag her",
    toolbarButtons: ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertTable', '|', 'insertLink', 'insertImage', '|', 'undo', 'redo'],
    imageUploadParam: 'image_param',
    // Set max image size to 5MB.
    imageMaxSize: 5 * 1024 * 1024,
    imageAllowedTypes: ['jpeg', 'jpg', 'png'],
    events:  {
      'image.beforeUpload': function(images: FileList) {
        if  (images.length) {
          const imgId = uuid.v4();
          let storageRef = firebase.storage().ref();
          let imageRef = storageRef.child(imgId);
          let editor = this;
          imageRef.put(images[0]).then(() => {
            imageRef.getDownloadURL().then((url) => {
              editor.image.insert(url, null, null, editor.image.get());
            });
          });
        }
        return  false;
      },
      'image.beforeRemove': (image) => {
        let storageRef = firebase.storage().ref();
        let imgId = image[0].src.substring(image[0].src.indexOf('/o/') + 3, image[0].src.indexOf('?'));
        storageRef.child(imgId).delete();
      }
    }
  };*/

  ngOnInit() {
    this.article = this.route.snapshot.data.article;
    this.comments = this.db.collection<Comment>('comments', ref => ref.orderBy('createdAt', 'asc').where('slug', '==', this.route.snapshot.params.slug)).valueChanges();
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
        body: this.commentContent,
        createdAt: new Date(),
        author: this.authService.profile
    })
    .then(function() {
        console.log("Document successfully written!");
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
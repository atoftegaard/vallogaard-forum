import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Comment, UserService, Profile } from '../core';

@Component({
  selector: 'app-article-comment',
  templateUrl: './article-comment.component.html'
})
export class ArticleCommentComponent implements OnInit {
  constructor(
    private userService: UserService,
    private datePipe: DatePipe
  ) {}

  @Input() comment: Comment;
  @Output() deleteComment = new EventEmitter<boolean>();

  canModify: boolean;

  ngOnInit() {
    // Load the current user's data
    this.userService.currentUser.subscribe(
      (userData: Profile) => {
        this.canModify = (userData.uid === this.comment.author.uid);
      }
    );
  }

  deleteClicked() {
    this.deleteComment.emit(true);
  }

  toLongDate(date: any) {
    return this.datePipe.transform(date.toDate(), 'longDate');
  }
}

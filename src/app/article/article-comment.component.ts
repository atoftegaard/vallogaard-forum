import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Comment, UserService, Profile, ProfilesService } from '../core';

@Component({
  selector: 'app-article-comment',
  templateUrl: './article-comment.component.html'
})
export class ArticleCommentComponent implements OnInit {
  constructor(
    private userService: UserService,
    private profilesService: ProfilesService,
    private datePipe: DatePipe
  ) {}

  @Input() comment: Comment;
  @Output() deleteComment = new EventEmitter<boolean>();

  canModify: boolean;
  email: String = '';

  ngOnInit() {
    // Load the current user's data
    this.userService.currentUser.subscribe(
      (userData: Profile) => {
        this.canModify = (userData.uid === this.comment.author.uid);
      }
    );
    this.getEmail(this.comment.author.uid);
  }

  getEmail(uid: string) {
    this.profilesService.getEmail(uid).subscribe((x) => {
      this.email = x;
    });
  }

  deleteClicked() {
    this.deleteComment.emit(true);
  }

  toLongDate(date: any) {
    return this.datePipe.transform(date.toDate(), 'longDate');
  }
}

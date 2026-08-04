import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Comment, UserService, Profile, ProfilesService } from '../core';

@Component({
  standalone: false,
  selector: 'app-article-comment',
  templateUrl: './article-comment.component.html'
})
export class ArticleCommentComponent implements OnInit {
  constructor(
    private userService: UserService,
    private profilesService: ProfilesService,
    private datePipe: DatePipe,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  @Input() comment: Comment;
  @Output() deleteComment = new EventEmitter<boolean>();

  canModify: boolean;
  email: String = '';
  // comment.author is a snapshot of the commenter's profile (incl. image) taken when the
  // comment was posted, so it goes stale if they update their avatar afterwards. This holds
  // their current image, fetched live, in preference to the stale stored one.
  authorImage: string;

  ngOnInit() {
    // Load the current user's data
    this.userService.currentUser.subscribe(
      (userData: Profile) => {
        this.canModify = (userData.uid === this.comment.author.uid);
      }
    );
    this.getEmail(this.comment.author.uid);
    this.loadAuthorImage(this.comment.author.uid);
  }

  private loadAuthorImage(uid: string) {
    this.profilesService.get(uid).subscribe({
      next: (profile) => {
        if (profile) {
          this.authorImage = profile.image;
          this.changeDetectorRef.markForCheck();
        }
      },
      error: (err) => console.error('Error loading comment author image for', uid, err)
    });
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

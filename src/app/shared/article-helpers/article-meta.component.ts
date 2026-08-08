import { Component, Input, Inject, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Article, Comment, ProfilesService } from '../../core';
import { SimpleProfile } from '../../core/models/simple-profile.model';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { Firestore, doc, updateDoc, collection, collectionData, query, where, orderBy } from '@angular/fire/firestore';

@Component({
  standalone: false,
  selector: 'app-article-meta',
  templateUrl: './article-meta.component.html',
  styleUrls: ['article-meta.component.css'],
  providers: [DatePipe]
})
export class ArticleMetaComponent implements OnChanges {
  email: string;
  @Input() article: Article;
  @Input() showSticky: boolean;

  constructor(@Inject(DOCUMENT) private document: Document,
    private firestore: Firestore,
    private datePipe: DatePipe,
    private profilesService: ProfilesService,
    private authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef) {}

  // Comments used to be duplicated onto the article doc as a denormalized snapshot (incl. a
  // copy of each commenter's profile image), which went stale whenever a user updated their
  // avatar. The comments collection is the source of truth for who commented, and profiles is
  // the source of truth for their current avatar - this reads both live instead of trusting a copy.
  commentCount = 0;
  commenters: { uid: string, name: string }[] = [];
  commenterImages: { [uid: string]: string } = {};

  // ArticleComponent's ngOnInit is async and awaits auth before assigning the real article, so
  // on the article page this component first receives a placeholder ({author: {}}, no slug) and
  // only gets the real data on a later @Input() update - ngOnInit alone would fire once against
  // that placeholder and never retry. ngOnChanges re-runs whenever the slug/uid actually arrive.
  ngOnChanges(changes: SimpleChanges) {
    if (!changes.article) {
      return;
    }
    const prevSlug = changes.article.previousValue?.slug;
    const currSlug = changes.article.currentValue?.slug;
    if (currSlug && currSlug !== prevSlug) {
      this.loadComments();
    }
    const prevUid = changes.article.previousValue?.author?.uid;
    const currUid = changes.article.currentValue?.author?.uid;
    if (currUid && currUid !== prevUid) {
      this.getEmail(currUid);
    }
  }

  private loadComments() {
    const q = query(collection(this.firestore, 'comments'),
      orderBy('createdAt', 'desc'), where('slug', '==', this.article.slug));
    collectionData(q).subscribe({
      next: (comments: Comment[]) => {
        this.commentCount = comments.length;
        const seen = new Set<string>();
        this.commenters = [];
        for (const c of comments) {
          const uid = c.author?.uid;
          if (uid && !seen.has(uid)) {
            seen.add(uid);
            this.commenters.push({ uid, name: c.author.name });
            this.loadCommenterImage(uid);
          }
        }
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => console.error('Error loading comments for', this.article.slug, err)
    });
  }

  private loadCommenterImage(uid: string) {
    this.profilesService.get(uid).subscribe({
      next: (profile) => {
        if (profile) {
          this.commenterImages[uid] = profile.image;
          // Firestore's snapshot listener doesn't reliably re-enter Angular's zone here,
          // so without this the mutated commenterImages value never reaches the view.
          this.changeDetectorRef.markForCheck();
        }
      },
      error: (err) => console.error('Error loading commenter image for', uid, err)
    });
  }

  toLongDate(date: any) {
    if (date) {
      return this.datePipe.transform(date.toDate(), 'longDate');
    } else {
      return '';
    }
  }

  getEmail(uid: string) {
    this.profilesService.getEmail(uid).subscribe((x) => {
      this.email = x;
    });
  }

  articleCount() {
    if (!this.article?.views) {
      return 0;
    }
    return Object.keys(this.article?.views).length;
  }

  copyUrl() {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = this.document.location.href;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }

  isWatching() {
    if (!this.article.watchers) {
      return false;
    } else {
      return this.article.watchers[this.authService.uid];
    }
  }

  watchingAllowed() {
    if (!this.authService.profile) {
      return false;
    } else {
      return this.authService.profile.notifyAboutNewComments;
    }
  }

  async watch(watch) {
    if (watch) {
      this.article.watchers[this.authService.uid] = {
        uid: this.authService.profile.uid,
        name: this.authService.profile.name,
        image: this.authService.profile.image
      } as SimpleProfile;
    } else {
      delete this.article.watchers[this.authService.uid];
    }
    await updateDoc(doc(this.firestore, 'articles', this.article.slug), {
      watchers: this.article.watchers
    });
  }
}

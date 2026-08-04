import { Directive, ElementRef, HostListener, Input } from '@angular/core';

// Swaps a broken avatar <img> (e.g. a dead external avatar service, like Peter's
// api.adorable.io URL) for a generated initials avatar, based on the person's name.
// Only kicks in on an actual load failure - never replaces a working image.
@Directive({
  selector: 'img[appAvatarFallback]',
  standalone: false
})
export class AvatarFallbackDirective {
  @Input() appAvatarFallback: string;

  private fallbackApplied = false;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError() {
    // While the live avatar URL is still loading, [src] is briefly empty/undefined, which the
    // browser resolves to the page's own URL and fails - that's not a real image failure, so it
    // must not consume the one-shot fallback (or the later, real failure would be ignored).
    const currentSrc = this.el.nativeElement.getAttribute('src');
    if (this.fallbackApplied || !currentSrc) {
      return;
    }
    this.fallbackApplied = true;
    const name = this.appAvatarFallback?.trim() || '?';
    this.el.nativeElement.src =
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
  }
}

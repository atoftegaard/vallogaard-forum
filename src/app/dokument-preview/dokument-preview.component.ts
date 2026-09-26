import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Dokument, BESTYRELSEN_CATEGORY, BESTYRELSEN_STORAGE_PATH } from '../core/models/dokument.model';
import { environment } from '../../environments/environment';
import { buildContentDisposition, extensionForContentType } from '../core/dokument-download-name';
import { Storage, ref, updateMetadata, deleteObject, getBlob, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  standalone: false,
  selector: 'app-dokument-preview',
  templateUrl: './dokument-preview.component.html',
  styleUrls: ['./dokument-preview.component.css'],
  providers: [DatePipe]
})
export class DokumentPreviewComponent implements OnInit {
  @Input() dokument: Dokument;
  @Input() isAdmin: boolean;
  @Input() existingCategories: string[] = [];
  @Output() categoryChanged = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  readonly bestyrelsenCategory = BESTYRELSEN_CATEGORY;
  // Sentinel <option> value meaning "type a new category name".
  readonly newCategoryOption = '__ny_kategori__';

  editingCategory = false;
  categorySelection = '';
  newCategoryName = '';
  saving = false;
  deleting = false;
  errorMessage = '';

  constructor(
    private datePipe: DatePipe,
    private storage: Storage) { }

  toLongDate(date: any) {
    return this.datePipe.transform(date, 'longDate');
  }

  ngOnInit(): void {
  }

  get chosenCategory(): string {
    return (this.categorySelection === this.newCategoryOption ? this.newCategoryName : this.categorySelection).trim();
  }

  startEditCategory() {
    const current = this.dokument.category;
    this.categorySelection = current && this.existingCategories.includes(current) ? current : '';
    this.newCategoryName = '';
    this.errorMessage = '';
    this.editingCategory = true;
  }

  cancelEditCategory() {
    this.editingCategory = false;
    this.errorMessage = '';
  }

  async deleteDokument() {
    const navn = this.dokument.title || 'dokumentet';
    if (!window.confirm('Er du sikker på, at du vil slette "' + navn + '"?\n\nDet kan ikke fortrydes.')) {
      return;
    }
    this.errorMessage = '';
    this.deleting = true;
    try {
      await deleteObject(ref(this.storage, this.dokument.path));
      this.deleted.emit();
    } catch (error) {
      console.error(error);
      this.errorMessage = 'Kunne ikke slette dokumentet. Prøv igen.';
      this.deleting = false;
    }
  }

  async saveCategory() {
    // A typed "bestyrelsen" (any casing) means the board category, not a new lookalike one.
    let category = this.chosenCategory;
    if (category.toLowerCase() === BESTYRELSEN_CATEGORY.toLowerCase()) {
      category = BESTYRELSEN_CATEGORY;
    }
    if (!category) {
      return;
    }
    if (category === this.dokument.category) {
      this.editingCategory = false;
      return;
    }

    const toBoard = category === BESTYRELSEN_CATEGORY;
    if (toBoard && !window.confirm(
      'Dokumentet flyttes til Bestyrelsen og kan herefter kun ses af administratorer.\n\nFortsæt?')) {
      return;
    }

    this.errorMessage = '';
    this.saving = true;
    try {
      if (toBoard) {
        await this.moveToBestyrelsen();
      } else {
        // updateMetadata replaces customMetadata wholesale rather than merging it field by
        // field, so the existing title has to be resent alongside the new category or it's lost.
        await updateMetadata(ref(this.storage, this.dokument.path), { customMetadata: { title: this.dokument.title, category } });
        this.dokument.category = category;
      }
      this.editingCategory = false;
      this.categoryChanged.emit();
    } catch (error) {
      console.error(error);
      this.errorMessage = 'Kunne ikke gemme kategorien. Prøv igen.';
    } finally {
      this.saving = false;
    }
  }

  // Labelling a document "Bestyrelsen" is not enough - only the admin-only Storage prefix
  // (see storage.rules) actually restricts it, so the file has to be moved there. Storage has
  // no move, so it's copied and then deleted. The copy gets a fresh download token, which
  // matters: the old public link (which regular users may have seen) must not keep working.
  private async moveToBestyrelsen() {
    const source = ref(this.storage, this.dokument.path);
    const target = ref(this.storage, BESTYRELSEN_STORAGE_PATH + '/' + this.dokument.filename);

    const contentDisposition = this.dokument.contentDisposition
      || (this.dokument.title && extensionForContentType(this.dokument.contentType)
        ? buildContentDisposition(this.dokument.title, extensionForContentType(this.dokument.contentType))
        : undefined);

    const blob = await getBlob(source);
    await uploadBytes(target, blob, {
      contentType: this.dokument.contentType,
      contentDisposition,
      customMetadata: { title: this.dokument.title, category: BESTYRELSEN_CATEGORY }
    });

    try {
      await deleteObject(source);
    } catch (error) {
      // Leaving both copies would keep the document public while also showing it as board-only.
      await deleteObject(target).catch(() => undefined);
      throw error;
    }

    this.dokument.path = target.fullPath;
    // Same as in the list: hosted link in production, direct link where the cookie can't reach.
    this.dokument.ref = environment.production
      ? '/dokument/bestyrelsen/' + this.dokument.filename
      : await getDownloadURL(target);
    this.dokument.contentDisposition = contentDisposition;
    this.dokument.category = BESTYRELSEN_CATEGORY;
    this.dokument.bestyrelsen = true;
  }
}

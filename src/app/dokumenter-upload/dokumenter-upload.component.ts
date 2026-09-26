import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Dokument, BESTYRELSEN_CATEGORY } from '../core/models/dokument.model';
import { ImageService } from '../core';

class FileSnippet {
  constructor(public src: string, public file: File) {}
}

@Component({
  standalone: false,
  selector: 'app-dokumenter-upload',
  templateUrl: './dokumenter-upload.component.html',
  styleUrls: ['./dokumenter-upload.component.css']
})
export class DokumenterUploadComponent implements OnInit {

  @Input() existingCategories: string[] = [];
  @Output() uploaded = new EventEmitter<void>();

  settingsForm: FormGroup;
  dokument: Dokument;
  isSubmitting: boolean;
  uploadNew: boolean;
  selectedFile: FileSnippet;
  private autoTitle = '';

  constructor(
    private fb: FormBuilder,
    private imageService: ImageService) {
    this.settingsForm = this.fb.group({
      file: '',
      title: '',
      category: ['', Validators.required],
      bestyrelsen: false
    });

    // Board-only documents have no category at all. Disabling (rather than hiding) the control
    // also drops its required validator from the form's validity, which *ngIf on the input
    // alone did not - a validator attached by the input's directive outlives the element.
    this.settingsForm.get('bestyrelsen').valueChanges.subscribe((checked: boolean) => {
      const categoryControl = this.settingsForm.get('category');
      if (checked) {
        categoryControl.setValue('');
        categoryControl.disable();
      } else {
        categoryControl.enable();
      }
    });
   }

  ngOnInit(): void {
    this.isSubmitting = false;
  }

  submitForm() {
    this.isSubmitting = true;
    const that = this;
    const { title, bestyrelsen } = this.settingsForm.value;
    // category is a disabled control (so absent from .value) when board-only is checked
    const category = bestyrelsen ? BESTYRELSEN_CATEGORY : this.settingsForm.value.category;

    const reader = new FileReader();
    reader.addEventListener('load', (event: any) => {
      this.imageService.uploadFile(this.selectedFile.file, title, category, !!bestyrelsen).subscribe((url) => {
        that.settingsForm.reset({ file: '', title: '', category: '', bestyrelsen: false });
        that.isSubmitting = false;
        that.uploadNew = false;
        that.selectedFile = undefined;
        that.uploaded.emit();
      }, (err) => {
        console.error(err);
        that.isSubmitting = false;
      });
    });

    reader.readAsDataURL(this.selectedFile.file);
  }

  processFile(imageInput: any) {
    const file: File = imageInput.files[0];
    if (!file) {
      return;
    }
    this.selectedFile = new FileSnippet('src', file);

    // Prefill the title from the file name (without extension), but never overwrite a title
    // the user has typed themselves - only an empty one or one we filled in for a previous file.
    const titleControl = this.settingsForm.get('title');
    if (!titleControl.value || titleControl.value === this.autoTitle) {
      this.autoTitle = file.name.replace(/\.[^.]+$/, '');
      titleControl.setValue(this.autoTitle);
    }
  }
}

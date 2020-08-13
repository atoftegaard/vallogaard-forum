import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Dokument } from '../core/models/dokument.model';
import { ImageService } from '../core';
import { AngularFirestore } from '@angular/fire/firestore';

class FileSnippet {
  constructor(public src: string, public file: File) {}
}

@Component({
  selector: 'app-dokumenter-upload',
  templateUrl: './dokumenter-upload.component.html',
  styleUrls: ['./dokumenter-upload.component.css']
})
export class DokumenterUploadComponent implements OnInit {

  settingsForm: FormGroup;
  dokument: Dokument;
  isSubmitting: boolean;
  uploadNew: boolean;
  selectedFile: FileSnippet;

  constructor(
    private fb: FormBuilder,
    private imageService: ImageService,
    private db: AngularFirestore) {
    this.settingsForm = this.fb.group({
      file: '',
      title: ''
    });
   }

  ngOnInit(): void {
    this.isSubmitting = false;
  }

  submitForm() {
    this.isSubmitting = true;
    const that = this;

    const reader = new FileReader();
    reader.addEventListener('load', (event: any) => {
      this.imageService.uploadFile(this.selectedFile.file, this.settingsForm.value.title).subscribe((url) => {
        that.settingsForm.reset();
        that.isSubmitting = false;
        that.uploadNew = false;
      }, (err) => { console.error(err); });
    });

    reader.readAsDataURL(this.selectedFile.file);
  }

  processFile(imageInput: any) {
    this.selectedFile = new FileSnippet('src', imageInput.files[0]);
  }
}

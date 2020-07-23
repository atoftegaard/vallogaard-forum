import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { ImageService } from '../core/services/settings-file-upload.service';
import { Referat } from '../core/models/referat.model';
import { AngularFirestore } from '@angular/fire/firestore';

class FileSnippet {
  constructor(public src: string, public file: File) {}
}

@Component({
  selector: 'app-referat-upload',
  templateUrl: './referat-upload.component.html',
  styleUrls: ['./referat-upload.component.css']
})
export class ReferatUploadComponent implements OnInit {
  settingsForm: FormGroup;
  referat: Referat;
  isSubmitting: boolean;
  uploadNew: boolean;
  selectedFile: FileSnippet;

  constructor(
    private fb: FormBuilder,
    private imageService: ImageService,
    private db: AngularFirestore) {
    this.settingsForm = this.fb.group({
      file: '',
      title: '',
      date: null
    });
   }

  ngOnInit(): void {
    this.isSubmitting = false;
  }

  submitForm() {
    this.isSubmitting = true;
    const that = this;
    this.updateReferat(this.settingsForm.value);

    const reader = new FileReader();
    reader.addEventListener('load', (event: any) => {
      this.imageService.uploadImage(this.selectedFile.file).subscribe((url) => {
        this.db.collection('referater').add({
          from: that.referat.from,
          title: that.referat.title,
          ref: url,
          uploadedAt: that.referat.uploadedAt
        })
        .then(function() {
            that.settingsForm.reset();
            that.isSubmitting = false;
            that.uploadNew = false;
        })
        .catch(function(error) {
            console.error('Error writing document: ', error);
            that.isSubmitting = false;
        });
      }, (err) => { console.error(err); });
    });

    reader.readAsDataURL(this.selectedFile.file);
  }

  updateReferat(values: any) {
    this.referat = {
      from: new Date(values.date),
      uploadedAt: new Date(),
      title: values.title
    };
  }

  processFile(imageInput: any) {
    this.selectedFile = new FileSnippet('src', imageInput.files[0]);
  }
}

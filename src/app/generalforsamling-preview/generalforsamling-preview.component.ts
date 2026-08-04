import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-generalforsamling-preview',
  templateUrl: './generalforsamling-preview.component.html',
  styleUrls: ['./generalforsamling-preview.component.css']
})
export class GeneralforsamlingPreviewComponent implements OnInit {

  anyUpcoming = false;
  isSubmitting = false;
  isAdmin: boolean;
  date: Date;
  settingsForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private authService: AuthService) {
    this.settingsForm = this.fb.group({
      date: null
    });
   }

  async ngOnInit() {
    await this.authService.loggedIn();

    this.authService.isAdmin.then((isAdmin) => {
      this.isAdmin = isAdmin;
    });

    const that = this;
    docData(doc(this.firestore, 'generalforsamling', 'current')).subscribe((g: any) => {
      that.date = new Date(g.date.seconds * 1000 + g.date.nanoseconds / 1000000);
      that.anyUpcoming = that.date >= new Date();
    });
  }

  submitForm() {
    this.isSubmitting = true;
    const that = this;
    updateDoc(doc(that.firestore, 'generalforsamling', 'current'), {
        date: new Date()
      }).then(x => {
        that.settingsForm.reset();
        that.isSubmitting = false;
      }).catch(function(error) {
        console.error('Error writing document: ', error);
        that.isSubmitting = false;
    });
  }

}

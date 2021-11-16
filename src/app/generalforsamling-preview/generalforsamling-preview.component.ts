import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

@Component({
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
    private db: AngularFirestore,
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
    this.db.collection('generalforsamling').doc('current').valueChanges().subscribe((g: any) => {
      that.date = new Date(g.date.seconds * 1000 + g.date.nanoseconds / 1000000);
      that.anyUpcoming = that.date >= new Date();
    });
  }

  submitForm() {
    this.isSubmitting = true;
    const that = this;
    that.db.collection('generalforsamling').doc('current')
      .update({
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

import { Component, OnInit, Renderer2, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Errors } from '../core';
import { AuthService } from  '../auth/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AngularFireFunctions, FUNCTIONS_ORIGIN } from '@angular/fire/functions';
import { DOCUMENT } from '@angular/common';

@Component({
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit {
  authType: String = '';
  title: String = '';
  errors: Errors = {errors: {}};
  isSubmitting = false;
  applied = false;
  authForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService:  AuthService,
    private httpClient: HttpClient,
    private fns: AngularFireFunctions,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    // use FormBuilder to create a form group
    this.authForm = this.fb.group({
      'email': ['', Validators.required]
    });
  }

  ngOnInit() {
    this.route.url.subscribe(data => {
      this.renderer.addClass(this.document.body, 'body-bg');
      // Get the last piece of the URL (it's either 'login' or 'register')
      this.authType = data[data.length - 1].path;
      // Set a title for the page accordingly
      this.title = (this.authType === 'login') ? 'LOG IND' : 'ANMOD';
      // add form control for username if this is the register page
      if (this.authType === 'register') {
        this.authForm.addControl('username', new FormControl());
        this.authForm.addControl('address', new FormControl());
      } else {
        this.authForm.addControl('password', new FormControl());
      }
    });
  }

  submitForm() {
    if (this.authType === 'register') {
      this.applyForUser();
    } else {
      this.isSubmitting = true;
      this.authService.login(this.authForm.value.email, this.authForm.value.password).then(x => {
        this.isSubmitting = false;
        this.renderer.removeClass(this.document.body, 'body-bg');
      });
    }
  }

  applyForUser() {
    this.sendApplicationNotification(this.authForm.value.username, this.authForm.value.email, this.authForm.value.address);
    this.applied = true;
    this.isSubmitting = false;
  }

  sendApplicationNotification(name: string, email: string, address: string) {
    const callable = this.fns.httpsCallable('applyForUser');
    callable({
      "destination": 'andreas@toftegaard.it',
      "name": name,
      "email": email,
      "address": address
    });
  }
}

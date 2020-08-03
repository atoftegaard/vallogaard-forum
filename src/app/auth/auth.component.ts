import { Component, OnInit, Renderer2, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Errors } from '../core';
import { AuthService } from '../auth/auth.service';
import { AngularFireFunctions } from '@angular/fire/functions';
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
  resetComplete = false;
  loginError = false;
  applied = false;
  authForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
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

      if (this.authType === 'login') {
        this.title = 'LOG IND';
      }
      if (this.authType === 'register') {
        this.title = 'ANMOD';
      }
      if (this.authType === 'reset') {
        this.title = 'NULSTIL KODEORD';
      }
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
    } else if (this.authType === 'reset') {
      this.loginError = false;
      this.isSubmitting = true;
      this.authService.reset(this.authForm.value.email).then(x => {
        this.isSubmitting = false;
        this.resetComplete = true;
      });
    } else {
      this.loginError = false;
      this.isSubmitting = true;
      this.authService.login(this.authForm.value.email, this.authForm.value.password).then(x => {
        this.isSubmitting = false;
        if (!x) {
          this.loginError = true;
        } else {
          this.renderer.removeClass(this.document.body, 'body-bg');
        }
      });
    }
  }

  applyForUser() {
    this.isSubmitting = true;
    this.sendApplicationNotification(this.authForm.value.username.trim(),
      this.authForm.value.email.trim(),
      this.authForm.value.address.trim());
  }

  sendApplicationNotification(name: string, email: string, address: string) {
    const callable = this.fns.httpsCallable('applyForUser');
    callable({
      'destination': 'andreas@toftegaard.it',
      'name': name,
      'email': email,
      'address': address
    }).toPromise().then(res => {
      this.applied = true;
      this.isSubmitting = false;
    })
    .catch(er => {
      console.log(er);
      this.isSubmitting = false;
    });
  }
}

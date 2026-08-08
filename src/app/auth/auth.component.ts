import { Component, OnInit, Renderer2, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Errors, RecaptchaService } from '../core';
import { AuthService } from '../auth/auth.service';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { DOCUMENT } from '@angular/common';

@Component({
  standalone: false,
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
  applyError = false;
  authForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
    private fns: Functions,
    private recaptchaService: RecaptchaService,
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
      if (this.authType === 'login') {
        this.authForm.addControl('rememberMe', new FormControl(true));
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
      this.authService.login(this.authForm.value.email, this.authForm.value.password, this.authForm.value.rememberMe).then(x => {
        this.isSubmitting = false;
        if (!x) {
          this.loginError = true;
        } else {
          this.renderer.removeClass(this.document.body, 'body-bg');
        }
      });
    }
  }

  async applyForUser() {
    this.isSubmitting = true;
    this.applyError = false;

    let recaptchaToken: string;
    try {
      recaptchaToken = await this.recaptchaService.execute('apply_for_user');
    } catch (err) {
      console.error('Error obtaining reCAPTCHA token: ', err);
      this.isSubmitting = false;
      this.applyError = true;
      return;
    }

    this.sendApplicationNotification(this.authForm.value.username.trim(),
      this.authForm.value.email.trim(),
      this.authForm.value.address.trim(),
      recaptchaToken);
  }

  sendApplicationNotification(name: string, email: string, address: string, recaptchaToken: string) {
    const callable = httpsCallable(this.fns, 'applyForUser');
    callable({
      'name': name,
      'email': email,
      'address': address,
      'recaptchaToken': recaptchaToken
    }).then(res => {
      this.applied = true;
      this.isSubmitting = false;
    })
    .catch(er => {
      console.log(er);
      this.isSubmitting = false;
      this.applyError = true;
    });
  }
}

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const grecaptcha: any;

// Loads Google reCAPTCHA v3 on demand and produces a per-action token, which the server
// verifies (score + action) before creating a new user - this is what actually stops bots
// from submitting the "Anmod om adgang" form, invisibly, with no checkbox for real users.
@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  private scriptLoaded: Promise<void>;

  private loadScript(): Promise<void> {
    if (!this.scriptLoaded) {
      this.scriptLoaded = new Promise((resolve, reject) => {
        if (typeof grecaptcha !== 'undefined') {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${environment.recaptchaSiteKey}`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Kunne ikke indlæse reCAPTCHA.'));
        document.head.appendChild(script);
      });
    }
    return this.scriptLoaded;
  }

  async execute(action: string): Promise<string> {
    await this.loadScript();
    return new Promise((resolve, reject) => {
      grecaptcha.ready(() => {
        grecaptcha.execute(environment.recaptchaSiteKey, { action })
          .then(resolve)
          .catch(reject);
      });
    });
  }
}

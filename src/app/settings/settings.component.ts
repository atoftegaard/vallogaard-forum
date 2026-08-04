import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Profile } from '../core';
import { TypedRoute } from 'ngx-typed-router';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { SettingsRouteData } from './settings-route-data';
import { SettingsRoutePath } from './settings-route-path';
import { AuthService } from '../auth/auth.service';
import * as uuid from 'uuid';
import { Storage, ref, uploadBytes } from '@angular/fire/storage';
import { EditorHelper } from '../shared/editor-helper';

class ImageSnippet {
  constructor(public src: string, public file: File) {}
}

@Component({
  standalone: false,
  selector: 'app-settings-page',
  templateUrl: './settings.component.html',
  styles: ['.form-control-inline { width: auto; display: inline; } .img-profile { max-width: 18em; max-height: 18em; }']
})
export class SettingsComponent implements OnInit {
  profile = {} as Profile;
  settingsForm: FormGroup;
  errors: Object = {};
  updated = false;
  isSubmitting = false;
  isLoadingImage = false;
  selectedFile: ImageSnippet;

  constructor(@Inject(ActivatedRoute) private route: TypedRoute<SettingsRouteData, SettingsRoutePath>,
    private firestore: Firestore,
    private storage: Storage,
    private authService: AuthService,
    private fb: FormBuilder,
    private editorHelper: EditorHelper
  ) {
    this.settingsForm = this.fb.group({
      image: '',
      name: '',
      email: '',
      password: '',
      notifyAboutNewArticles: '',
      notifyAboutNewComments: '',
      notifyAboutAnyComments: '',
      shareEmail: ''
    });
  }

  async ngOnInit() {
    await this.authService.loggedIn();

    this.profile = this.route.snapshot.data.profile;
    this.settingsForm.patchValue(this.profile);
  }

  submitForm() {
    const that = this;
    this.updated = false;
    this.isSubmitting = true;
    this.updateUser(this.settingsForm.value);

    const profileRef = doc(this.firestore, 'profiles', this.authService.user.uid);
    setDoc(profileRef, this.profile, { merge: true }).then(() => {
      that.isSubmitting = false;
      that.updated = true;
    })
    .catch(function(error) {
      console.error('Error writing document: ', error);
      that.isSubmitting = false;
    });
  }

  updateUser(values: any) {
    this.profile.name = values.name;
    this.profile.email = values.email;
    this.profile.notifyAboutNewArticles = values.notifyAboutNewArticles;
    this.profile.notifyAboutNewComments = values.notifyAboutNewComments;
    this.profile.notifyAboutAnyComments = values.notifyAboutAnyComments;
    this.profile.shareEmail = values.shareEmail;
  }

  processFile(imageInput: any) {
    this.isLoadingImage = true;
    const file: File = imageInput.files[0];
    const reader = new FileReader();
    const that = this;

    reader.addEventListener('load', (event: any) => {
      const fileName = uuid.v4();
      const imageRef = ref(that.storage, fileName);

      uploadBytes(imageRef, file, { contentType: file.type }).then(() => {
        const lStorageRef = ref(that.storage, fileName + '_500x500');
        that.editorHelper.keepTrying(10, lStorageRef).then((url) => {
          this.profile.image = url;
          this.authService.updateProfile(null);
          this.isLoadingImage = false;
        }).catch((error) => {
          console.error('Error loading resized image: ', error);
          this.errors = { errors: { billede: 'kunne ikke indlæses, prøv igen' } };
          this.isLoadingImage = false;
        });
      });
    });

    reader.readAsDataURL(file);
  }

}

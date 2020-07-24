import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Profile } from '../core';
import { TypedRoute } from 'ngx-typed-router';
import { AngularFirestore } from '@angular/fire/firestore';
import { SettingsRouteData } from './settings-route-data';
import { SettingsRoutePath } from './settings-route-path';
import { AuthService } from '../auth/auth.service';
import { first, map } from 'rxjs/operators';
import * as uuid from 'uuid';
import * as firebase from 'firebase/app';
import { EditorHelper } from '../shared/editor-helper';

class ImageSnippet {
  constructor(public src: string, public file: File) {}
}

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings.component.html',
  styles: ['.form-control-inline { width: auto; display: inline; } .img-profile { max-width: 18em; max-height: 18em; }']
})
export class SettingsComponent implements OnInit {
  profile = {} as Profile;
  settingsForm: FormGroup;
  errors: Object = {};
  isSubmitting = false;
  isLoadingImage = false;
  selectedFile: ImageSnippet;

  constructor(@Inject(ActivatedRoute) private route: TypedRoute<SettingsRouteData, SettingsRoutePath>,
    private db: AngularFirestore,
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
      notifyAboutNewComments: ''
    });
  }

  async ngOnInit() {
    await this.authService.loggedIn();

    this.profile = this.route.snapshot.data.profile;
    this.settingsForm.patchValue(this.profile);
  }

  submitForm() {
    const that = this;
    this.isSubmitting = true;
    this.updateUser(this.settingsForm.value);

    const collection = this.db.collection<Profile>('profiles', ref => ref.where('uid', '==', this.authService.user.uid));
    collection.snapshotChanges().pipe(first(), map(x => x[0])).subscribe((profile) => {
      const profileId = profile.payload.doc.id;
      const profileRef = this.db.collection('profiles').doc(profileId);
      profileRef.set(this.profile, { merge: true }).then(() => {
        that.isSubmitting = false;
      })
      .catch(function(error) {
        console.error('Error writing document: ', error);
        that.isSubmitting = false;
      });
    });
  }

  updateUser(values: any) {
    this.profile.name = values.name;
    this.profile.email = values.email;
    this.profile.notifyAboutNewArticles = values.notifyAboutNewArticles;
    this.profile.notifyAboutNewComments = values.notifyAboutNewComments;
  }

  processFile(imageInput: any) {
    this.isLoadingImage = true;
    const file: File = imageInput.files[0];
    const reader = new FileReader();
    const that = this;

    reader.addEventListener('load', (event: any) => {
      const fileName = uuid.v4();
      const storageRef = firebase.storage().ref();
      const imageRef = storageRef.child(fileName);

      imageRef.put(file).then(() => {
        const lStorageRef = firebase.storage().ref().child(fileName + '_500x500');
        that.editorHelper.keepTrying(10, lStorageRef).then((url) => {
          this.profile.image = url;
          this.authService.updateProfile(null);
          this.isLoadingImage = false;
        });
      });
    });

    reader.readAsDataURL(file);
  }

}

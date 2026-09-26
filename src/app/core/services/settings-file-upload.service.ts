import { Injectable, } from '@angular/core';
import { Observable } from 'rxjs';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import * as uuid from 'uuid';
import { BESTYRELSEN_STORAGE_PATH } from '../models/dokument.model';
import { buildContentDisposition, extensionOf } from '../dokument-download-name';

@Injectable()
export class ImageService {
  constructor(private storage: Storage) {}

  public uploadImage(image: File): Observable<string> {
    const obs = new Observable<string>(o => {
      const imgId = uuid.v4();
      const imageRef = ref(this.storage, imgId);
      uploadBytes(imageRef, image, { contentType: image.type }).then(() => {
        getDownloadURL(imageRef).then((url) => {
          o.next(url);
          o.complete();
        }, (err) => o.error(err));
      }, (err) => o.error(err));
    });
    return obs;
  }

  public uploadFile(image: File, title: string, category: string, bestyrelsen: boolean): Observable<string> {
    const obs = new Observable<string>(o => {
      const fileId = uuid.v4();
      // Board-only documents are stored under their own admin-only Storage prefix (see
      // storage.rules) - the folder is what actually restricts who can read them.
      const folder = bestyrelsen ? BESTYRELSEN_STORAGE_PATH : 'dokumenter';
      const imageRef = ref(this.storage, folder + '/' + fileId);
      // Neither promise here used to be caught, so a rejected upload (e.g. a metadata write
      // that the rules denied, or any other failure) never reached the caller's error
      // handler - it just looked like the upload silently hung instead of failing.
      const contentDisposition = buildContentDisposition(title, extensionOf(image.name));
      uploadBytes(imageRef, image, { contentType: image.type, contentDisposition, customMetadata: { title: title, category: category }}).then(() => {
        getDownloadURL(imageRef).then((url) => {
          o.next(url);
          o.complete();
        }, (err) => o.error(err));
      }, (err) => o.error(err));
    });
    return obs;
  }
}

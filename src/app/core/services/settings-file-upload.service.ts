import { Injectable, } from '@angular/core';
import { Observable } from 'rxjs';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import * as uuid from 'uuid';

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
        });
      });
    });
    return obs;
  }

  public uploadFile(image: File, title: string): Observable<string> {
    const obs = new Observable<string>(o => {
      const fileId = uuid.v4();
      const imageRef = ref(this.storage, 'dokumenter/' + fileId);
      uploadBytes(imageRef, image, { contentType: image.type, customMetadata: { title: title }}).then(() => {
        getDownloadURL(imageRef).then((url) => {
          o.next(url);
        });
      });
    });
    return obs;
  }
}

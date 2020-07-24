import { Injectable, } from '@angular/core';
import { Observable } from 'rxjs';
import { storage } from 'firebase';
import * as uuid from 'uuid';

require('firebase/storage');

@Injectable()
export class ImageService {
  constructor( ) {}

  public uploadImage(image: File): Observable<string> {
    const obs = new Observable<string>(o => {
      const imgId = uuid.v4();
      const storageRef = storage().ref();
      const imageRef = storageRef.child(imgId);
      imageRef.put(image).then(() => {
        imageRef.getDownloadURL().then((url) => {
          o.next(url);
        });
      });
    });
    return obs;
  }
}

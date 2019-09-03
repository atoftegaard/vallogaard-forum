import { Injectable, } from '@angular/core';
import { Observable } from 'rxjs';
import * as firebase from 'firebase/app';
import * as uuid from 'uuid';
require('firebase/storage');

@Injectable()
export class ImageService {
  constructor( ) {}
  
  public uploadImage(image: File): Observable<string> {
    const obs = new Observable<string>(o => {
      const imgId = uuid.v4();
      let storageRef = firebase.storage().ref();
      let imageRef = storageRef.child(imgId);
      imageRef.put(image).then(() => {
        imageRef.getDownloadURL().then((url) => {
          o.next(url);
        });
      });
    });
    return obs;
  }
}
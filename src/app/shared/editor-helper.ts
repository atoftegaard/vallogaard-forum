export class EditorHelper {

  delay(t, v) {
    return new Promise(function(resolve) {
      setTimeout(resolve.bind(null, v), t);
    });
  }

  keepTrying(triesRemaining, storageRef) {
    if (triesRemaining < 0) {
      return Promise.reject('out of tries');
    }

    return storageRef.getDownloadURL().then((url) => {
      return url;
    }).catch((error) => {
      switch (error.code) {
        case 'storage/object-not-found':
          return this.delay(2000, this).then(() => {
            return this.keepTrying(triesRemaining - 1, storageRef);
          });
        default:
          console.log(error);
          return Promise.reject(error);
      }
    });
  }
}

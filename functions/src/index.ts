import * as functions from 'firebase-functions';
import { environment } from '../../src/environments/environment';
import { Profile } from '../../src/app/core/models/profile.model';
import { Article } from '../../src/app/core/models/article.model';

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });
admin.initializeApp();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: environment.emailconfig.username,
        pass: environment.emailconfig.password
    }
});

exports.applyForUser = functions.https.onRequest((req: any, res: any) => {
    return cors(req, res, () => {
        
        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', 'GET, POST');

        if(req.method !== 'POST'){
            res.status(400).send('Please send a POST request');
            return;
        }

		console.log('applyForUser called with body', JSON.stringify(req.body));

        const name = req.body.data.name;
        const email = req.body.data.email;
        const address = req.body.data.address;
        const image = 'https://api.adorable.io/avatars/40/' + name.replace(/\s+/g, '') + '.png';

        admin.auth().createUser({
            email: email,
            emailVerified: false,
            password: 'testtest',
            displayName: name,
            photoURL: image,
            disabled: true
          }).then((userRecord: any) => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully created new user:', userRecord.uid);
            admin.firestore().collection('profiles').doc(userRecord.uid).set({
                'name': name,
                'email': email,
                'address': address,
                'image': image,
                'notifyAboutNewArticles': true,
                'notifyAboutNewComments': true,
                'shareEmail': true,
                'uid': userRecord.uid,
                'role': 'user'
              })
              .then(() => {
                console.log('profile added');
                const dest = req.body.data.destination;
                const mailOptions = {
                    from: 'Valløgård Forum <andreas@toftegaard.it>',
                    to: dest,
                    subject: 'Anmodning om brugeroprettelse',
                    html: `Der er kommet en anmodning om brugeroprettelse fra "` + name + `" - check <a href="https://console.firebase.google.com/project/vallogaard-2019/database/firestore/data~2Fprofiles">https://console.firebase.google.com/project/vallogaard-2019/database/firestore/data~2Fprofiles</a>`
                };
        
                return transporter.sendMail(mailOptions, (error: any) => {
                    if(error){
                        console.log('sendMail error', error.toString());
                        return res.status(500).send(error.toString());
                    }
                    return res.status(200).send({ data: 'OK' });
                });
              })
              .catch((error: any) => {
                console.log('collection error', error);
                return res.status(500).send(error.toString());
              });
        }).catch((error: any) => {
            console.log('Error creating new user:', error);
            return res.status(500).send(error.toString());
        });
    });    
});

exports.notifyNewArticle = functions.https.onRequest((req: any, res: any) => {
    return cors(req, res, () => {
        
        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', 'GET, POST');

        if(req.method !== 'POST'){
            res.status(400).send('Please send a POST request');
            return;
        }
 
        const articlename = req.body.data.articlename;
        const articleurl = req.body.data.articleurl;
        const authorname = req.body.data.authorname;
        const authoruid = req.body.data.authoruid;
       
        console.log('notifyNewArticle called with body', JSON.stringify(req.body));
        
        admin.firestore().collection('profiles', (ref: any) => ref.where('notifyAboutNewArticles', '==', true)).get()
        .then((snap: any) => {
            if (snap.empty) {
                return;
            }
            snap.forEach((doc: any) => {
                let profile = doc.data() as Profile;
                if (profile.uid === authoruid) {
                    return;
                }
                const mailOptions = {
                    from: 'Valløgård Forum <noreply@vallogaard.dk>',
                    to: profile.email,
                    subject: 'Nyt opslag fra ' +  authorname,
                    html: `<p>Hej ${profile.name}</p><p>${authorname} har lavet opslaget <a href="${articleurl}">${articlename}, klik her for at se det.</a></p>`
                };
        
                return transporter.sendMail(mailOptions, (error: any) => {
                    if(error){
                        console.log('sendMail error', error.toString());
                        return res.status(500).send(error.toString());
                    }
                    return res.status(200).send({ data: 'OK' });
                });
            });
        });
    });    
});

exports.notifyWatchers = functions.https.onRequest((req: any, res: any) => {
    return cors(req, res, () => {
        
        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', 'GET, POST');

        const articleSlug = req.body.data.articleSlug;
        const commentorUid = req.body.data.commentorUid;
        const articleUrl = req.body.data.articleUrl;
        const commentorName = req.body.data.commentorName;

        if(req.method !== 'POST'){
            res.status(400).send('Please send a POST request');
            return;
        }
 
        console.log('notifyWatchers called with body', JSON.stringify(req.body));
        
        admin.firestore().collection('articles')
        .get(articleSlug).then((aDoc: any) => {
            if (aDoc.exists) {
                console.log('article not found');
                return;
            }

            aDoc.forEach((articleDoc: any) => {
                const article = articleDoc.data() as Article;
                
                admin.firestore().collection('profiles', (ref: any) => ref.where('notifyAboutNewComments', '==', true)).get()
                .then((snap: any) => {
                    if (snap.empty) {
                        return;
                    }

                    snap.forEach((doc: any) => {
                        const profile = doc.data() as Profile;
                        if (profile.uid === commentorUid) {
                            return;
                        }

                        if (!(profile.uid in article.watchers)) {
                            return;
                        }

                        const mailOptions = {
                            from: 'Valløgård Forum <noreply@vallogaard.dk>',
                            to: profile.email,
                            subject: 'Ny kommentar på opslaget "' +  article.title + '"',
                            html: `<p>Hej ${profile.name}</p><p>${commentorName} har skrevet en kommentar 
                            på opslaget <a href="${articleUrl}">${article.title}, klik her for at se den.</a></p>
                            <p>Du modtager denne besked fordi du har skrevet en kommentar i samme opslag. 
                            Hvis du ikke ønsker at notificeres, kan du slå det fra på opslaget ved at trykke 
                            på "øjet" i toppen af siden - eller du kan redigere dine notifikationsindstillinger.</p>`
                        };
                
                        return transporter.sendMail(mailOptions, (error: any) => {
                            if(error){
                                console.log('sendMail error', error.toString());
                                return res.status(500).send(error.toString());
                            }
                            return res.status(200).send({ data: 'OK' });
                        });
                    });
                });
            });
        });
    });    
});
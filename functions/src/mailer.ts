const nodemailer = require('nodemailer');

// Gmail credentials live only in functions/.env, same as RECAPTCHA_SECRET_KEY - never in the
// frontend's environment.ts, which gets bundled into the client-side JS and would ship them
// to every visitor's browser.
export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// nodemailerConfig.js

const nodemailer = require('nodemailer');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    // host:
    // port:587,
    // secure:false,
    service: 'gmail',
    auth: {
        user: 'bloodyindiansparrow@gmail.com', // replace with your email address
        pass: 'blxrpskaqkcexfby', // replace with your password or app-specific password
    },
});

module.exports = transporter;
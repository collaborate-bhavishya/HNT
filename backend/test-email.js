const nodemailer = require('nodemailer');

async function main() {
    console.log("Testing SMTP Connection...");
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: "info.education10x@gmail.com",
            pass: "dksozkoqwvppvzry", // The app password we used
        },
    });

    try {
        let info = await transporter.sendMail({
            from: '"Hiring Team" <info.education10x@gmail.com>',
            to: "collaborate.bhavishya@gmail.com",
            subject: "Test Email from Local Setup",
            text: "Hello world?",
            html: "<b>Hello world?</b>",
        });

        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

main();

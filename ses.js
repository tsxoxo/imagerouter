const aws = require("aws-sdk");

const ses = new aws.SES({
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
    region: "eu-central-1",
});

exports.sendEmail = (to, subject, message) => {
    return ses
        .sendEmail({
            Source: "Image Router <joaorambo07@gmail.com>",
            Destination: {
                ToAddresses: Array.isArray(to) ? to : [to],
            },
            Message: {
                Body: {
                    Text: {
                        Data: message,
                    },
                },
                Subject: {
                    Data: subject,
                },
            },
        })
        .promise()
        .then(() => console.log("it worked!"))
        .catch((err) => console.log(err));
};

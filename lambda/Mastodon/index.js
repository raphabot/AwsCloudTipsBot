const { S3, SecretsManager } = require('aws-sdk');
const { login } = require('masto');

// Initialize the AWS clients
const s3 = new S3();
const secretsManager = new SecretsManager();

// Initialize the constants
const tipsBucketName = process.env.TIPS_BUCKET_NAME;
const tipOfTheDayObjectKey = process.env.TIP_OF_THE_DAY_OBJECT_KEY;
const mastodonSecretName = process.env.MASTODON_SECRET_NAME;  

const prepareTipOfTheDay = (tipOfTheDay) => {
    return `
☁️ Tip of the day! ☁️

Service: ${tipOfTheDay.service}

${tipOfTheDay.part1}...

...${tipOfTheDay.part2}

Did you know? Follow for Cloud Tips every day!

#AWS #Cloud #CloudLearning #CloudTips`.substring(0, 280);
}

exports.handler = async (event) => {
  try {

    // Read the content of the object
    const tipOfTheDayObject = await s3.getObject({
      Bucket: tipsBucketName,
      Key: tipOfTheDayObjectKey,
    }).promise();

    const tipOfTheDay = prepareTipOfTheDay(JSON.parse(tipOfTheDayObject.Body.toString('utf-8')));

    // Read the Twitter credentials from Secrets Manager
    const mastodonSecretRequest = await secretsManager.getSecretValue({
        SecretId: mastodonSecretName,
    }).promise();

    const mastodonSecret = JSON.parse(mastodonSecretRequest.SecretString);

    // Login to Mastodon
    const masto = await login({
        url: mastodonSecret.url,
        accessToken: mastodonSecret.access_token,
    });

    // Post the tip of the day
    await masto.v1.statuses.create({
        status: tipOfTheDay,
        visibility: 'public',
    });

    console.log('Successfully posted the tip of the day');
  } catch (error) {
    console.error('Failed to post the tip of the day:', error);
  }
};

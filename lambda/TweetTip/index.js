const { S3, SecretsManager } = require('aws-sdk');
const { TwitterApi } = require('twitter-api-v2');

// Initialize the AWS clients
const s3 = new S3();
const secretsManager = new SecretsManager();

// Initialize the constants
const tipsBucketName = process.env.TIPS_BUCKET_NAME;
const tipOfTheDayObjectKey = process.env.TIP_OF_THE_DAY_OBJECT_KEY;
const twitterSecretName = process.env.TWITTER_SECRET_NAME;  

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
    const twitterSecretRequest = await secretsManager.getSecretValue({
        SecretId: twitterSecretName,
    }).promise();

    const twitterSecret = JSON.parse(twitterSecretRequest.SecretString);

    // Post the tip to Twitter
    const client = new TwitterApi({
        appKey: twitterSecret.app_key,
        appSecret: twitterSecret.app_secret,
        accessToken: twitterSecret.access_token,
        accessSecret: twitterSecret.access_secret,
    });
    const rwClient = client.readWrite;

    await rwClient.v2.tweet(tipOfTheDay);

    console.log('Successfully tweeted the tip of the day');
  } catch (error) {
    console.error('Failed to tweet the tip of the day:')
    console.error(JSON.stringify(error, null, 2));
  }
};

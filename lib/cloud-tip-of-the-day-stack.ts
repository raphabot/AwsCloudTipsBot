import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

const UNUSED_TIPS_OBJECT_KEY = 'unused-tips.csv';
const TIP_OF_THE_DAY_OBJECT_KEY = 'tip-of-the-day.json';

export class CloudTipOfTheDayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const twitterSecretNameParameter = new cdk.CfnParameter(this, 'TwitterSecretName', {
      type: 'String',
      description: 'The name of the secret containing the Twitter credentials',
      minLength: 1,
    });
    
    const mastodonSecretNameParameter = new cdk.CfnParameter(this, 'MastodonSecretName', {
      type: 'String',
      description: 'The name of the secret containing the Mastodon credentials',
      minLength: 1,
    });

    // Create an S3 bucket
    const tipsBucket = new s3.Bucket(this, 'TipsBucket', {
      eventBridgeEnabled: true,
    });

    // Write local CSV file to the bucket
    new s3deployment.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deployment.Source.asset('./bucket-contents')],
      destinationBucket: tipsBucket,
    });

    // Create the lambda function to pick a tip
    const pickTipsLambda = new lambda.Function(this, 'PickTipsLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset('lambda/PickTips'),
      handler: 'index.handler',
      environment: {
        TIPS_BUCKET_NAME: tipsBucket.bucketName,
        UNUSED_TIPS_OBJECT_KEY,
        TIP_OF_THE_DAY_OBJECT_KEY,
      },
    });

    // Grant read/write permissions to the pickTipsLambda
    tipsBucket.grantReadWrite(pickTipsLambda);

    // Create an EventBridge rule to trigger the lambda function once a day at 10 AM CST
    const rule = new events.Rule(this, 'PickTipsRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '15', // 10 AM CST, since this is UTC time
      }),
    });
    rule.addTarget(new targets.LambdaFunction(pickTipsLambda));

    const twitterSecret = secretsmanager.Secret.fromSecretNameV2(this, 'TwitterSecret', twitterSecretNameParameter.valueAsString);

    // Create the lambda function to tweet the tip of the day
    const tweetTipLambda = new lambda.Function(this, 'TweetTipLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset('./lambda/TweetTip/'),
      handler: 'index.handler',
      environment: {
        TWITTER_SECRET_NAME: twitterSecret.secretName,
        TIPS_BUCKET_NAME: tipsBucket.bucketName,
        TIP_OF_THE_DAY_OBJECT_KEY,
      },
    });

    // Grant tweetTipLambda read permissions to the twitterSecret
    twitterSecret.grantRead(tweetTipLambda);

    // Grant read permission to the tweetTipLambda
    tipsBucket.grantRead(tweetTipLambda);

    const mastodonSecret = secretsmanager.Secret.fromSecretNameV2(this, 'MastodonSecret', mastodonSecretNameParameter.valueAsString);
    
    // Create the lambda function to post the tip of the day to Mastodon
    const mastodonTipLambda = new lambda.Function(this, 'MastodonTipLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset('./lambda/Mastodon/'),
      handler: 'index.handler',
      environment: {
        MASTODON_SECRET_NAME: mastodonSecret.secretName,
        TIPS_BUCKET_NAME: tipsBucket.bucketName,
        TIP_OF_THE_DAY_OBJECT_KEY,
      },
    });

    // Grant tweetTipLambda read permissions to the twitterSecret
    mastodonSecret.grantRead(mastodonTipLambda);

    // Grant read permission to the tweetTipLambda
    tipsBucket.grantRead(mastodonTipLambda);

    // Creates the EventBridhe Rule to trigger the tweetTipLambda and the mastodonTipLambda when the tip of the day is updated
    new events.Rule(this, 'UnusedTipsRule', {
      description: 'Trigger both the tweetTipLambda and the mastodonTipLambda when the tip of the day file is updated',
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [tipsBucket.bucketName],
          },
          object: {
            key: [UNUSED_TIPS_OBJECT_KEY],
          },
        },
      },
      targets: [
        new targets.LambdaFunction(tweetTipLambda),
        new targets.LambdaFunction(mastodonTipLambda),
      ],

    });

  }
}


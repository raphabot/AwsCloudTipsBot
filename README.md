# AWS Tip of the Day CDK Project

This is the source code for the Twitter bot: @AWSDailyTips.

## How to run your own

1. Make sure to have the proper Twitter API credentials
2. You'll need to create manually a Secret in AWS Secret. To do so:
    1. Update `twitter-creds-example.json` with your own credentials.
    2. Run:

    ```bash
    aws secretsmanager create-secret --name DailyCloudTipsTwitterCreds \
    --description "Twitter secrets for @DailyAwsSecrets" \
    --secret-string file://twitter-creds-example.json
    ```

3. To deploy the CDK project, run:

```bash
cdk deploy --require-approval never --parameters TwitterSecretName=DailyCloudTipsTwitterCreds`
```

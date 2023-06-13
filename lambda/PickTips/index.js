const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async () => {
  try {
    const unusedTipsBucketName = process.env.TIPS_BUCKET_NAME;
    const unusedTipsObjectKey = process.env.UNUSED_TIPS_OBJECT_KEY;
    const tipOfTheDayObjectKey = process.env.TIP_OF_THE_DAY_OBJECT_KEY;

    // Read the original file
    const originalFile = await s3.getObject({
      Bucket: unusedTipsBucketName,
      Key: unusedTipsObjectKey,
    }).promise();

    // Parse the CSV and randomly pick an entry
    const entries = originalFile.Body.toString('utf-8').split('\n');
    const randomIndex = Math.floor(Math.random() * entries.length);
    let pickedEntry = entries.splice(randomIndex, 1)[0];
    const service = pickedEntry.substring(0,pickedEntry.indexOf(','));
    pickedEntry = pickedEntry.substring(service.length+1);
    const part1 = pickedEntry.substring(0, pickedEntry.indexOf(','));
    pickedEntry = pickedEntry.substring(part1.length+1);
    const part2 = pickedEntry;

    // Create the JSON object
    const tipOfTheDay = {
      service: service.trim(),
      part1: part1.trim(),
      part2: part2.trim(),
    };

    // Write the picked tip as JSON to the new file
    await s3.putObject({
      Bucket: unusedTipsBucketName,
      Key: tipOfTheDayObjectKey,
      Body: JSON.stringify(tipOfTheDay),
    }).promise();

    // Update the original file without the picked entry
    await s3.putObject({
      Bucket: unusedTipsBucketName,
      Key: unusedTipsObjectKey,
      Body: entries.join('\n'),
    }).promise();

    console.log('Successfully picked today\'s tip');
  } catch (error) {
    console.error('Failed to pick today\'s tip:', error);
  }
};

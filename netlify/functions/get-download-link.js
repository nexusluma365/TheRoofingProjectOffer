const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

exports.handler = async () => {
  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: process.env.R2_FILE_KEY,
      ResponseContentDisposition: `attachment; filename="${process.env.R2_FILE_KEY}"`,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: 900,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Could not create download link",
        details: error.message,
      }),
    };
  }
};

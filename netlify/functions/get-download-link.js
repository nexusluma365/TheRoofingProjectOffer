const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const createStripe = require("stripe");

const headers = {
  "Content-Type": "application/json",
};

function getPaymentIntentId(clientSecret) {
  if (!clientSecret || typeof clientSecret !== "string") return null;
  const match = clientSecret.match(/^(pi_[^_]+)_secret_/);
  return match ? match[1] : null;
}

function errorResponse(statusCode, error, details) {
  return {
    statusCode,
    headers,
    body: JSON.stringify({ error, ...(details ? { details } : {}) }),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return errorResponse(500, "Missing STRIPE_SECRET_KEY environment variable.");
  }

  const requiredR2Vars = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_FILE_KEY",
  ];
  const missingR2Vars = requiredR2Vars.filter((key) => !process.env[key]);
  if (missingR2Vars.length) {
    return errorResponse(500, "Missing R2 environment variables.", missingR2Vars.join(", "));
  }

  const body = JSON.parse(event.body || "{}");
  const paymentIntentId = getPaymentIntentId(body.clientSecret);
  const downloadToken = body.downloadToken;

  if (!paymentIntentId || !downloadToken) {
    return errorResponse(403, "Payment verification is required before downloading.");
  }

  try {
    const stripe = createStripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      return errorResponse(403, "Payment has not been verified as successful.");
    }

    if (
      paymentIntent.amount !== 9700 ||
      paymentIntent.currency !== "usd" ||
      paymentIntent.metadata?.source !== "roofing-blueprint-sales-page" ||
      paymentIntent.metadata?.downloadToken !== downloadToken
    ) {
      return errorResponse(403, "Payment does not match this download session.");
    }

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
      expiresIn: 60,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url }),
    };
  } catch (error) {
    return errorResponse(500, "Could not create download link", error.message);
  }
};

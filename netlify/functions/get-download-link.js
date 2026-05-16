const createStripe = require('stripe');

const headers = {
  'Content-Type': 'application/json'
};

function getPaymentIntentId(clientSecret) {
  if (!clientSecret || typeof clientSecret !== 'string') return null;
  const match = clientSecret.match(/^(pi_[^_]+)_secret_/);
  return match ? match[1] : null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY environment variable.' })
    };
  }

  const downloadUrl = process.env.ROOFING_BLUEPRINT_DOWNLOAD_URL || process.env.DOWNLOAD_URL;
  if (!downloadUrl) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing ROOFING_BLUEPRINT_DOWNLOAD_URL environment variable.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const paymentIntentId = getPaymentIntentId(body.clientSecret);

    if (!paymentIntentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid payment verification token.' })
      };
    }

    const stripe = createStripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Payment has not been verified as successful.' })
      };
    }

    if (
      paymentIntent.amount !== 9700 ||
      paymentIntent.currency !== 'usd' ||
      paymentIntent.metadata?.source !== 'roofing-blueprint-sales-page'
    ) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Payment does not match this product.' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: downloadUrl })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

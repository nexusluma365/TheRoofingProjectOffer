const createStripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY environment variable.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const stripe = createStripe(process.env.STRIPE_SECRET_KEY);
    const amount = Number.parseInt(process.env.STRIPE_AMOUNT_CENTS || '9700', 10);

    if (!Number.isInteger(amount) || amount < 50) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid STRIPE_AMOUNT_CENTS environment variable.' })
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card'],
      description: 'The Roofing Business Blueprint',
      metadata: {
        product: body.product || 'The Roofing Business Blueprint',
        source: 'roofing-blueprint-sales-page',
        downloadToken: body.downloadToken || ''
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

# Roofing Blueprint Stripe Checkout Setup

## What changed
- Removed raw card-number inputs from the HTML.
- Added Stripe Payment Element so Stripe securely handles card entry.
- Added a Netlify Function that creates a $97 PaymentIntent.
- Added a success page for post-payment delivery.

## Setup
1. In Stripe Dashboard, copy your publishable key.
2. Confirm the same publishable key is set in both `index.html` and `success.html`.
3. In Netlify, add these environment variables:
   `STRIPE_SECRET_KEY=sk_test_or_sk_live_your_key_here`
   `R2_ACCOUNT_ID=your_cloudflare_account_id`
   `R2_ACCESS_KEY_ID=your_r2_access_key_id`
   `R2_SECRET_ACCESS_KEY=your_r2_secret_access_key`
   `R2_BUCKET=your_r2_bucket_name`
   `R2_FILE_KEY=your_download_file_key`
4. Deploy the full folder to Netlify. Netlify serves `index.html` and uses the functions in `netlify/functions`.
5. Test checkout with Stripe test mode first, then switch both the publishable key and `STRIPE_SECRET_KEY` to live keys when ready.

## Deploy without the 404
The publish root must be this folder:
`roofing_stripe_checkout_package`

This folder contains `index.html` directly at the top level. If Netlify is pointed at a nested folder, or if you upload a ZIP that contains this folder inside another parent folder, Netlify may deploy without a root `index.html` and show "Page not found".

Recommended deploy command:
```bash
npm run deploy
```

That command deploys this folder as the site root and uploads `netlify/functions` for checkout.

## Local testing
Run:
```bash
npm install
npm run start
```

Use Stripe test card:
`4242 4242 4242 4242`
Any future date, any CVC, any ZIP.

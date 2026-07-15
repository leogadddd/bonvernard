# PhysiCare checkout mockup

A Next.js mock storefront and checkout flow designed to match the clean white, royal-blue, product-grid style of the supplied PhysiCare Google Sites pages.

## Behaviour

- `/embed` always displays the products/services catalogue, cart, checkout, validation, and success confirmation.
- `/` automatically displays the checkout when loaded inside an iframe.
- When `/` is opened normally, it displays the empty standalone multi-page shell.
- Empty standalone routes: `/services`, `/products`, `/about`, and `/contact`.
- No payment processor, database, or API is used. Successful checkout creates a random mock order number in the browser.

## Edit the catalogue

Edit `data/catalog.json`.

A simple item:

```json
{
  "id": "new-service",
  "type": "service",
  "name": "New Service",
  "category": "Treatment",
  "description": "Description here.",
  "image": "/images/your-image.png",
  "price": 1000
}
```

An item with selectable options:

```json
{
  "id": "new-product",
  "type": "product",
  "name": "New Product",
  "category": "Equipment",
  "description": "Description here.",
  "image": "/images/your-image.png",
  "variants": [
    { "id": "small", "label": "Small", "price": 100 },
    { "id": "large", "label": "Large", "price": 200 }
  ]
}
```

Place new images in `public/images`.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000/embed` for the checkout.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, select **Add New → Project**.
3. Import the repository.
4. Keep the detected framework as **Next.js** and deploy.
5. Embed `https://YOUR-PROJECT.vercel.app/embed` in Google Sites.

The `Content-Security-Policy` header in `next.config.mjs` allows embedding from Google Sites. If using another parent domain, add it to the `frame-ancestors` list.

## Test payment details

- Card number: `4242 4242 4242 4242`
- Expiry: any future `MM/YY`
- CVC: any 3 or 4 digits

This is a demonstration only. No real payment information should be entered.

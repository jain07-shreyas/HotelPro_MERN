# Deploying HotelPro

Database: MongoDB Atlas. API: Render. Website: Vercel. Images: Cloudinary. Payments: Stripe.

## 1. MongoDB Atlas
- Network Access: allow `0.0.0.0/0` (Render has no fixed IP).
- Use a dedicated database user and a strong password (not the one you used while testing).

## 2. API on Render
1. Push the project to GitHub (the `.env` files are git-ignored, never commit them).
2. Render > New > Blueprint > pick the repo (it reads `render.yaml`), or create a Web Service by hand:
   root directory `server`, build `npm install`, start `npm start`.
3. Environment variables: see `render.yaml`. Important ones:
   - `NODE_ENV=production`
   - `CLIENT_URL` = your Vercel URL (no trailing slash). Several URLs can be separated by commas.
   - `SERVER_URL` = the Render URL of the API.
4. Check `https://<your-api>.onrender.com/api/v1/health` returns `healthy`.
5. The free plan sleeps after inactivity, so the first request can take ~30 seconds.

Cookies: in production the login cookie is `Secure` + `SameSite=None` so it works between two different
domains. This needs HTTPS on both (Render and Vercel provide it).

## 3. Create the first admin
Seeding wipes all rooms, so it refuses to run when `NODE_ENV=production`. Run it once from your computer instead,
with `NODE_ENV=development` but the production `MONGO_URI` in `server/.env` (set `ADMIN_EMAIL` / `ADMIN_PASSWORD`):
```bash
cd server && npm run seed
```
Do this only on a fresh database. Afterwards create staff accounts from Dashboard > Users & staff.

## 4. Website on Vercel
1. Import the repo, root directory `client`, framework Vite (build `npm run build`, output `dist`).
2. Environment variables:
   - `VITE_API_URL` = `https://<your-api>.onrender.com/api/v1`
   - `VITE_STRIPE_PUBLISHABLE_KEY` = your `pk_live_...` (or `pk_test_...`)
3. `client/vercel.json` already rewrites every path to `index.html`, so page refreshes and email links work.

## 5. Stripe webhook
Dashboard > Developers > Webhooks > Add endpoint:
`https://<your-api>.onrender.com/api/v1/payments/webhook`, event `payment_intent.succeeded`.
Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## 6. Cloudinary (room photos)
Render's disk is wiped on every deploy, so local uploads would disappear. Create a free Cloudinary account and set
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Uploads then go to Cloudinary automatically.

## 7. Email
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (Gmail needs an App Password; Brevo, Resend or
SendGrid SMTP also work). Then you can set `REQUIRE_EMAIL_VERIFICATION=true`.

## Scaling later
The server keeps no state in memory, so you can run several instances behind a load balancer. For heavy traffic add
Redis for caching room searches and move emails to a queue.

# HotelPro (MERN)

Hotel management system: guests book and pay online, staff run daily operations, admins manage and monitor everything.

## What is inside
**Guests:** register / login, email verification, forgot password, profile, search rooms (dates, category, pagination),
room details with seasonal pricing, booking, Stripe payment, invoices (PDF), cancellation with refund, reviews & ratings,
service requests (room service, laundry...), support tickets with chat, in-app notifications, dark mode.

**Staff:** bookings (confirm, check-in, check-out, cancel), room status, housekeeping tasks (created automatically after
check-out), service requests, support inbox.

**Manager / admin:** room inventory (add, edit, delete, photos), seasonal pricing, payments list, reports and charts
(revenue, occupancy, bookings), user and staff management (roles, deactivate), security monitoring, activity (audit) log,
system health.

**Security:** bcrypt, JWT in httpOnly cookie, role-based access, rate limits (stricter on login), NoSQL-injection
sanitizing, helmet, CORS allow-list, account deactivation, audit log, error log file.

## Run on your computer
Two terminals:
```bash
# 1) server
cd server
npm install
npm run seed      # first time only: sample rooms, admin, demo staff, sample season
npm run dev       # http://localhost:5000  (health check: /api/v1/health)

# 2) client
cd client
npm install
npm run dev       # http://localhost:5173
```
Logins created by the seed (from `server/.env`): admin `ADMIN_EMAIL` / `ADMIN_PASSWORD`, staff `STAFF_EMAIL` / `STAFF_PASSWORD`.
Guests sign up on the website.

## Tests
```bash
cd server && npm test     # pricing, sanitizing, pagination, tokens
```

## Stripe (test mode)
1. Put test keys in `server/.env` (STRIPE_SECRET_KEY) and `client/.env` (VITE_STRIPE_PUBLISHABLE_KEY), restart both.
2. Test card: `4242 4242 4242 4242`, any future date, any CVC.
3. Optional webhook: `stripe listen --forward-to localhost:5000/api/v1/payments/webhook`

## Roles
`guest` (default on sign-up) | `staff` | `manager` | `admin`. Only an admin can create staff/manager accounts or change roles.

## Good to know
- Unpaid bookings hold a room for 30 minutes. Cancelling a paid booking refunds it fully.
- Reviews open after a stay is checked out (staff: Dashboard > Bookings > Check out).
- Without SMTP settings, emails (including verification and reset links) are printed in the server console.
- Room photos go to `server/uploads/` locally, or to Cloudinary when its keys are set.
- `.env` files hold secrets: never commit or share them. See `DEPLOY.md` to put the project online.

## Troubleshooting
- Nothing loads: open http://localhost:5000/api/v1/health, it must say "healthy".
- Server exits at start: check MONGO_URI and Atlas > Network Access.
- Empty rooms list: run `npm run seed` in the server folder.

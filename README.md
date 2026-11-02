# PerlEvents — Production-Ready Banquet & Event Management ERP
### Powered by Drona

PerlEvents is an enterprise-grade Banquet and Luxury Event Operations platform designed for multi-venue hospitality groups.

---

## Architecture & Technology Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons
* **Authentication**: Firebase Authentication with strict Admin-controlled provisioning (no public self-registration)
* **Primary Database**: Firebase Realtime Database with atomic transactions, collision guards, and cross-tab reactive synchronization
* **Serverless Operations**: Firebase Cloud Functions for trusted backend admin provisioning and concurrency-safe booking slot reservations
* **Security**: Restrictive `database.rules.json` with `.indexOn` query optimizations
* **Deployment Target**: Vercel (Frontend) & Firebase (Realtime Database, Authentication, Cloud Functions)

---

## Three Primary Roles

1. **Admin (Director / Venue Owner)**
   - Full control over banquets, tariffs, owner contacts, and employee account provisioning.
   - Real-time dashboards, executive sales analytics, invoice oversight, and audit logs.
   - Can resolve booking conflicts and manage tentative holds.

2. **Salesperson (Mobile-First Experience)**
   - Persistent bottom navigation (`Home`, `Leads`, `Availability`, `Events`, `More`).
   - Create leads, schedule follow-ups, and convert leads into direct sales without re-entering client data.
   - Real-time availability checks with automatic 60-minute setup and cleanup buffer checks.
   - Generate official itemized invoices with printable PDF preview.

3. **Operations Manager**
   - Focused operational execution console for assigned events.
   - Interactive checklists populated from standard templates and vendor-specific service requirements.
   - Large touch-friendly check-offs, timestamp logging, and verification notes.

---

## Concurrency & Conflict Prevention

Traditional database checks risk race conditions where two salespersons simultaneously confirm overlapping events for the same hall. PerlEvents solves this with:
1. **Multi-Hall Isolation**: Every hall's availability is independently tracked.
2. **Buffer Guarding**: Configurable setup buffer (default 60 mins) and cleanup buffer (default 60 mins) are added to the event duration.
3. **Atomic Reservation**: Booking slots are verified and written atomically via Cloud Functions transactions (`/functions/index.js`) or the local reactive engine.
4. **Collision Feedback**: If an overlap occurs, the second user receives an immediate conflict explanation detailing the colliding event and times.

---

## Production Setup & Deployment

### 1. Firebase Project Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Authentication** (Email/Password).
3. Enable **Realtime Database** (select a region closest to your venue).
4. Deploy the restrictive security rules from `database.rules.json`:
   ```bash
   firebase deploy --only database
   ```
5. Deploy Cloud Functions:
   ```bash
   cd functions && npm install
   firebase deploy --only functions
   ```

### 2. Environment Variables
Configure your environment variables in `.env` or Vercel:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
```

### 3. First Administrator Provisioning
The initial administrator account must be provisioned through the trusted setup flow or directly in the Firebase Console:
- Path: `/users/{admin_uid}`
- Role: `"admin"`
- `isActive`: `true`
- `organizationId`: `"org_perlevents"`

---

## WhatsApp Vendor Coordination
Under each event's **Reminders** tab:
- Direct WhatsApp click-to-chat links are dynamically generated with prefilled templates for the banquet owner and each assigned vendor.
- Tracks communication status: `Not Contacted`, `Contacted`, `Confirmed`, `Follow-up Required`.
- Manual review in WhatsApp ensures full human control over outbound messages.

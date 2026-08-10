# AllegoryNow Hostinger migration

This checklist keeps the current Cloudflare deployment live until the Hostinger
copy, database, administrator page, comments, contributions, and file downloads
have all been tested.

## 1. Create the Hostinger MySQL database

In hPanel, open **Databases → MySQL Databases**, create one database and one
database user, and keep the displayed host, database name, username, and
password available for the Web App setup. Do not put those values in GitHub.

## 2. Configure the Web App

Import `orscathinus/passion` from GitHub and deploy the
`hostinger-migration` branch with:

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Node.js version | 22 |
| Root directory | `/` |
| Install command | `npm install` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Output directory | `hostinger-dist` |
| Entry file | `server.mjs` |

Choose **Other** instead of Hostinger's auto-detected Next.js preset. AllegoryNow
uses a custom Node entry point so the public site, administrator page, APIs, and
database remain in one application. The build packages that server and all
static pages together under `hostinger-dist/`.

## 3. Add production environment variables

Add these through Hostinger's environment-variable screen:

| Variable | Purpose |
| --- | --- |
| `DB_HOST` | Host shown by Hostinger MySQL |
| `DB_PORT` | Usually `3306` |
| `DB_USER` | Hostinger database username |
| `DB_PASSWORD` | Hostinger database password |
| `DB_NAME` | Hostinger database name |
| `ADMIN_EMAILS` | The email used for the existing AllegoryNow administrator |
| `MIGRATION_SOURCE_URL` | `https://allegorynow.thirtytwo32percent.chatgpt.site` during transfer only |
| `MIGRATION_TOKEN` | Temporary token supplied during the transfer |

Hostinger injects `PORT`; do not add or override it.

## 4. Transfer D1 and R2 once

The migration source returns data only when its temporary token is configured.
The Hostinger import endpoint requires the same token and can import only once.
It transfers:

- draft and published CMS documents and version history;
- the administrator password hash, audit history, and comment moderation state;
- public exhibit comments;
- contribution records and statuses; and
- each private R2 attachment into the Hostinger MySQL blob table.

Administrator sessions and failed-login records are deliberately not copied.
The administrator signs in again after cutover.

## 5. Verify before changing the domain

On the temporary Hostinger URL, verify:

1. the homepage and all navigation routes;
2. `/api/cms/public` returns the same published version as Cloudflare;
3. `/admin/` accepts the existing password;
4. saving a draft does not change the public site;
5. publishing changes the public site immediately;
6. comments load and post;
7. a test contribution uploads and downloads successfully; and
8. cross-site POST requests are rejected.

After verification, remove `MIGRATION_TOKEN` and `MIGRATION_SOURCE_URL` from
Hostinger, remove `MIGRATION_TOKEN` from Cloudflare, redeploy, and only then
point `allegorynow.org` to Hostinger. Keep the old Cloudflare deployment intact
until the custom domain is stable.

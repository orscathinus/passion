# AllegoryNow administration guide

The site is currently code-managed. This is the simplest and safest setup while one person is maintaining it. You can edit the files in GitHub, review the change, and publish only after it looks right.

## Where to edit content now

| Content | File or folder |
| --- | --- |
| Home page | `app/page.tsx` |
| Mission statement | `app/mission/page.tsx` |
| Biography and credentials | `app/who-we-are/page.tsx` |
| Claims, supports, evidence, and conclusion links | `app/data/inquiry.ts` |
| Exhibit list | `app/components/ExhibitBrowser.tsx` |
| Exhibit PDFs | `public/exhibits/family-court/` |
| Questions and rules | `app/qa-rules/page.tsx` |
| Contact form behavior | `app/components/ContributionForm.tsx` |
| Colors, spacing, and visual design | `app/globals.css` |

The contribution form opens a prefilled issue in `orscathinus/passion`. Enable GitHub Issues for that repository so visitors can use it.

## Safe update routine

1. Create a new branch in GitHub.
2. Edit one content area at a time.
3. Open a pull request and review the changed text and files.
4. Check links, claim numbers, privacy, and source labels.
5. Merge only after the site preview is correct.

Never upload sealed records, a child's identifying information, medical details, home addresses, or unredacted private case materials.

## Adding a claim

Open `app/data/inquiry.ts` and copy one object in the `focusedClaims` list. Give it a new two-digit `id`, then update:

- `title`, `statement`, and `status`;
- the argument being tested;
- `supportIds` using existing support IDs;
- evidence labels and links;
- `conclusionIds` for every broader conclusion it supports; and
- a serious counterargument or limitation.

The tree and list pages read from this same file, so the new claim appears in both places automatically.

## Adding an exhibit

1. Redact and review the PDF before upload.
2. Add it to `public/exhibits/family-court/` with a simple filename.
3. Add one matching entry in the `opinions` list in `app/components/ExhibitBrowser.tsx`.
4. Link it from the relevant claim in `app/data/inquiry.ts` if it actually bears on that claim.

An exhibit is part of the broader project record. It does not automatically prove a claim and is not automatically a source for the separate research paper.

## Full administrator panel: recommended implementation

When editing code becomes inconvenient, add a private `/admin` area rather than putting edit controls on public pages.

### Access

- Require sign-in for every `/admin` route.
- Allow only specific administrator accounts.
- Check authorization on the server for every create, edit, upload, publish, and delete action. Hiding a button in the browser is not security.

### Data

Use a database for:

- projects;
- claims and their status;
- broader conclusions;
- claim-to-conclusion connections;
- supports and evidence links;
- mission, biography, Q&A, and rules content;
- contribution review; and
- an audit log of who changed what and when.

Use object storage for uploaded PDFs and images. Keep private drafts separate from published records.

### Workflow

The admin panel should have four states: **Draft → Review → Published → Archived**. A public page should read only published content. Each edit should preserve the prior version so a mistake can be reversed.

### Essential safeguards

- validate file type and size;
- scan filenames and text for identifying information before publication;
- require a confirmation step before publishing;
- use stable IDs so links do not break when titles change;
- record an audit trail;
- back up the database and uploaded files; and
- never expose administrator keys in browser code.

For this project, a small authenticated admin panel backed by a database and object storage is enough. A large commercial content-management system would add complexity before the project needs it.

# AllegoryNow administration guide

The website now has a protected visual editor at `/admin/`. GitHub Pages sends that address to the secure administrator service automatically.

## First sign-in

1. Open `https://orscathinus.github.io/passion/admin/`.
2. Sign in with the authorized ChatGPT account when prompted.
3. Create an administrator password of at least 16 characters. A four-word passphrase is recommended.
4. Select the page you want to edit.
5. Save a draft, review it, and use **Publish changes** only when it is ready.

The administrator password is an additional layer after account authorization. It is stored only as a salted password hash. Administrator sessions use secure, HTTP-only cookies and expire after one hour.

The editor includes page writing, the separate unnumbered Central Conclusion, support categories, claims, exhibits, Q&A, contact text, and footer writing. Adding a claim automatically adds it to the relevant Tree and list views after publication.

## Where to edit content now

| Content | File or folder |
| --- | --- |
| Home page | `app/page.tsx` |
| Mission statement | `app/mission/page.tsx` |
| Biography and credentials | `app/who-we-are/page.tsx` |
| Default numbered claims and supports | `app/data/inquiry.ts` |
| Default Central Conclusion and CMS structure | `app/data/cms.ts` |
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

Open **Tree + Claims** in the administrator page, select **Add new claim**, and update:

- its number and level;
- its title, statement, and overall argument;
- support IDs and evidence links; and
- a serious counterargument or limitation.

The Central Conclusion is not a claim and never receives a claim number. Edit it on the separate **Central Conclusion** administrator page. Use the line editor under **Tree + Claims** to connect broader claims to it.

## Adding an exhibit

1. Redact and review the PDF before upload.
2. Add it to `public/exhibits/family-court/` with a simple filename.
3. Add one matching entry in the `opinions` list in `app/components/ExhibitBrowser.tsx`.
4. Link it from the relevant claim in `app/data/inquiry.ts` if it actually bears on that claim.

An exhibit is part of the broader project record. It does not automatically prove a claim and is not automatically a source for the separate research paper.

## Safeguards

- Require both the authorized account and administrator password.
- Check authorization on the server for every save and publication.
- Keep drafts separate from the public version.
- Require a confirmation step before publishing.
- Preserve earlier draft and published versions.
- Use stable IDs so claim links do not break when titles change.
- Record an audit trail.
- Never expose administrator keys in browser code.

The editor accepts writing and links. PDF or image uploads still belong in the repository so private or sealed material is never accidentally published through a one-click upload.

# Choose-creators campaign (manual) — integration guide

Files in this folder are new. They do not change any existing file.

| File | What it is |
|---|---|
| `ManualCampaignPage.tsx` | The 4-step page: Campaign Details, Creator Selection (tiers + popup), Promotion Content, Review & Launch |
| `CreatorPickerModal.tsx` | The popup. Opens when the artist clicks a tier. Filters, sort, tick to add, "Add N creators" |
| `types.ts` | All types and the `ManualCampaignApi` interface the UI talks to |
| `httpApi.ts` | Real client for the endpoints below |
| `tiers.ts` | The 8 tier labels (filters only, never prices) and display helpers |
| `mockApi.ts`, `preview-main.tsx`, `../../../manual-preview.html` | DEV PREVIEW ONLY (fake data). Do not import from production code. Delete before launch if you like. |
| `../../pages/sponsor/CreateCampaignManual.tsx` | Page wrapper with the sidebar. |

## To wire it in (2 small edits)
1. In `src/App.tsx` add: `<Route path="/sponsor/create-campaign/manual"><ProtectedSponsorRoute component={CreateCampaignManual} /></Route>` (import it too).
2. On the existing `/sponsor/create-campaign` page add a switch at the top with two options: "Fixed price" (the existing form) and "Choose creators" (a link/button to `/sponsor/create-campaign/manual`).

## Backend endpoints the UI needs (all require a logged-in artist; amounts are decided by the server)
- `GET /api/cities` → `City[]` (`{id, name, state}`)
- `GET /api/campaigns/creator-panel?cities=1,2&tier=micro&deliverable=reel&q=&minEngagement=3&genres=Music,Dance&sort=relevance|price_asc|price_desc|views_desc|followers_desc&cursor=` → `{items: CreatorCard[], total, nextCursor}`
  Only creators with: active profile, not blocked, available, city in `cities`, tier equal to `tier`, a rate for `deliverable`. `price` is that creator's current rate.
  `metricsSource` is `api_verified` only when the numbers came from the Instagram API, otherwise `creator_reported` or `none`.
- `POST /api/campaigns/choose-creators/bill` body `{deliverable, creatorIds}` → `Bill`. Server re-reads current rates, computes fee and GST-in-fee, reads the wallet, returns `billId` (a token tied to those exact amounts).
- `POST /api/campaigns/choose-creators` body `{details, creatorIds, billId}`:
  - recompute the bill; if it differs from `billId` → `409 {bill}` (nothing charged)
  - wallet too low → `402 {bill}`
  - else in ONE transaction: create the campaign, lock the total in escrow, create one offer per creator with `price_snapshot` and `reserved_amount`, notify creators → `201 {campaignId}`

See the v6 pack Steps 7, 8 and 15, and Appendix A for the money rules.

## Not in this UI yet
- File upload for audio/video (reuse the uploader from the existing `CreateCampaign.tsx`).
- Gender filter from the reference design: there is no gender data in the database, so it is left out.
- Recent reel thumbnails: `recentReels[].thumbUrl` must come from the backend (Instagram media URLs expire, so store or proxy them).

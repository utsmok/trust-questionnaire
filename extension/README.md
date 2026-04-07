# TRUST Capture Pilot

Chromium-first browser extension for explicit evidence capture into existing TRUST reviews.

## What it does

- pairs to the TRUST application with a one-time code created in `/settings/capture`
- requests host permission only for the chosen TRUST app origin
- captures the current page URL, title, selected text, reviewer note, and an optional visible-tab screenshot
- targets one of three destinations returned by the server:
  - review-level evidence
  - a writable criterion
  - the review inbox
- sends captures through the existing initialize / upload / finalize capture API flow
- keeps a small explicit local queue for retry and removal

## What it does not do

- no background monitoring
- no automatic review creation
- no cookie scraping
- no hidden DOM harvesting
- no long-lived API key
- no separate evidence store

## Load unpacked in Chromium

1. Open Chromium or Chrome.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select this repository's `extension/` directory.

## Pair and use

1. In the TRUST web app, open `/settings/capture`.
2. Generate a pairing code.
3. Open the extension popup.
4. Enter the TRUST app origin and pairing code.
5. Select a review.
6. Select a server-approved destination.
7. Add a note and confirm capture.

## Pilot checklist

- pairing succeeds with a one-time code
- review list loads after pairing
- target list includes review-level, criterion, and inbox destinations when valid
- screenshot capture succeeds
- URL/title/selected text are preserved in the shared capture flow
- retry works after a simulated transient failure
- revoke clears the paired session and host permission

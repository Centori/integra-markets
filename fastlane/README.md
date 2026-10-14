# App Store listing metadata

The listing text for every locale, in version control, so a ranking change has a
diff to point at.

```
metadata/<locale>/name.txt         <= 30 characters
metadata/<locale>/subtitle.txt     <= 30 characters
metadata/<locale>/keywords.txt     <= 100 characters, never displayed
metadata/<locale>/description.txt  <= 4000 characters
coverage.json                      what each keyword claims to resolve to
```

## Check before uploading

```sh
node scripts/check-store-metadata.mjs
```

Runs in CI on every pull request. It enforces:

* **Character limits**, counted in Unicode code points. Not `wc -m`, which on a
  shell with no `LANG` set counts bytes and called the es-MX subtitle 31/30 when
  it was 30; not `String.length`, which counts UTF-16 units.
* **No space after a comma** in `keywords` — the space is indexed as part of the
  next term.
* **No word repeated from `name` or `subtitle` into `keywords`.** Both are
  already indexed, so a repeat buys nothing and the keyword field is the
  scarcest surface you have.
* **No plurals.** Apple stems, so `future` already covers `futures`.
* **No term that resolves to nothing** — see below.
* **`description.txt` present**, because App Store Connect cannot create a
  localization without one.

## coverage.json

Every keyword term declares the commodity it resolves to, and that commodity has
to be one the engine actually scores.

This exists because the first drafts sold things the product does not track:
`soybean`, `iron ore`, `thermal coal`, `alumina`, `nickel`, `canola`,
`rapeseed`, `acucar`, `cafe`, `minerio`. Someone searching "soybean sentiment",
installing, and typing `soybean` would have got an empty result — worse than
never having been found. Adding such a term now takes a deliberate edit to
`coverage.json`, where it is obvious what is being claimed.

Regenerate the canonical list after any change to the engine's alias map, and
cross-check it against the live endpoint — the alias map contains canonicals
with no data yet (`coltan`, `helium`, `tin`, `macro`):

```sh
curl -H "Authorization: Bearer $INTEGRA_API_KEY" \
     https://api.integramarkets.app/v1/commodities
```

## Upload

Needs an App Store Connect account with the Apple ID for this app. Nothing here
has been uploaded; `Deliverfile` is configured to upload text only, to leave
screenshots alone, and never to submit for review.

```sh
cd fastlane
fastlane deliver --verify_only   # dry run: shows the HTML preview, uploads nothing
fastlane deliver                 # uploads, then asks before committing the change
```

Then read the listing in App Store Connect and submit by hand.

## Order

`es-MX` first and alone. It is the only locale here whose main claim —
that Apple serves a second metadata language inside the US storefront — is
convention rather than documented behaviour, so it is the one worth measuring on
its own before trusting the rest. Watch US impressions for a fortnight, then add
`pt-BR`, `de-DE`, `en-GB`, `en-AU`, `fr-FR`, `ja`.

## Not here yet

`expo.locales` and in-app translation ship in a binary, and the App Store build
lineage is still split from `main`. Listing text needs no build and is
unaffected; anything in the app does. Resolve the lineage first, or a rejection
will have two candidate causes.

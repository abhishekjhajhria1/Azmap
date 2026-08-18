# @abh/server — the sync relay

An append-only log of blobs it cannot read.

That is the whole product surface. It never merges, never resolves a conflict,
never validates domain shape, and never learns what anyone is studying. All
ordering is decided on-device by `compareVersions` in `@abh/core`, which is why
this is a few hundred lines and still correct: **the server does not have to be
right about anything.** Hand back a page twice, out of order, or including the
caller's own writes, and the on-device merge absorbs it.

## Run it

```bash
pnpm --filter @abh/server start        # :8787, abh.sqlite in the cwd
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8787` | Listen port |
| `ABH_DB` | `abh.sqlite` | SQLite file. Use a volume you actually back up. |
| `ABH_ORIGINS` | *(none)* | Comma-separated origins allowed to call this |

Storage is `node:sqlite`, which ships with Node — no native module, no install
step. It's genuinely enough: the write pattern is append-and-read-by-cursor, and
one box handles a lot of that. Moving to Postgres means replacing `db.ts`;
nothing above it touches SQL.

Point the app at it by building with `VITE_ABH_SYNC_URL=https://your-relay`.
Leave it unset and the app is local-only — a legitimate way to ship, since the
product works with no server at all.

## The API

Two endpoints do the work. Both need `Authorization: Bearer <device token>`.

- `POST /v1/sync/push` — `{ sealed }` → `{ cursor }`. Appends one opaque blob.
- `GET /v1/sync/pull?since=<cursor>&limit=<n>` → `{ cursor, items, hasMore }`.
  Everything after `since`, oldest first.

And three for enrolment:

- `POST /v1/accounts` — `{ accountId }` → `{ accountId, deviceId, token }`.
  The client generates the id *and the key* locally and sends only the id.
- `POST /v1/pairings` (auth) — `{ code, expiresAt }`. Registers a code the
  holder is showing on screen. Capped to ten minutes whatever the client asks.
- `POST /v1/pairings/claim` — `{ accountId, code }` → a token for the new
  device. Single-use, expiring, and rate-limited.

## What it cannot do, on purpose

- **Read your data.** Payloads are sealed with an account key that only your
  devices hold. A full database dump yields ciphertext and timestamps.
- **Recover your account.** There is no key escrow, so there can be no reset
  link. Pairing a second device *is* the backup, which is why the UI says so.
- **Deduplicate writes.** Two pushes of the same change are different
  ciphertexts (fresh IV each time), so it can't tell they match — and doesn't
  need to, because applying a change twice is a no-op on-device.

## What it can see

Account and device ids (opaque randoms), payload sizes, and timing. That is the
honest limit of this design: metadata, not content. If that matters for your
threat model, the fix is running your own — which is why it's one file and one
env var.

## Operating notes

- **Pruning is opportunistic**, on push. Entries are dropped only once *every*
  device on the account has read past them, and only after a retention window,
  so a phone that's been in a drawer for a month still gets its history.
- **Rate limiting is per-IP, in-memory.** Behind more than one instance you want
  something shared; behind a proxy, make sure `X-Forwarded-For` is trustworthy.
- **Back up the SQLite file.** It's the only copy of anyone's ciphertext that
  isn't on their devices.

## Hosting it

```sh
docker build -f apps/server/Dockerfile -t abh-relay .   # from the repo root
docker run -p 8080:8080 -v abh_data:/data abh-relay
```

Or `fly deploy` with the included `fly.toml` (Mumbai region, one machine, one
volume).

**The volume is not optional.** The relay's entire state is one SQLite file at
`$ABH_DB`. Without a persistent mount it survives exactly as long as the
container: every device then finds the log empty, re-uploads its whole map, and
— because the merge is last-writer-wins by `rev` — the oldest device's stale
copies can win against newer edits. Losing the log is not "sync starts fresh",
it is data loss with no error message.

**One machine, not zero and not many.** SQLite on a local volume means a second
instance has a *different* log. Devices would sync to whichever they reached,
diverge silently, and neither would report a problem. Scale this by moving to
Postgres, never by adding replicas.

### Environment

| | |
|---|---|
| `PORT` | Listen port (default 8787; the container sets 8080) |
| `ABH_DB` | Path to the SQLite file. **Point this at a mounted volume.** |
| `ABH_ORIGINS` | Comma-separated CORS allowlist. Empty means same-origin only. |

### What it can and cannot see

It stores `{ v, iv, ct }` blobs and a device token hash. It cannot read a
topic's title, cannot merge anything, and has no idea what a map is — every
decision that matters happens on the devices. That is enforced by the shape of
the code, not by a policy: there is no key on the server to decrypt with, and
the account key rides in a URL *fragment*, which browsers never transmit.

Which also means: **a lost account key is unrecoverable.** No password reset
exists or can exist. Pairing a new device requires an already-paired one.

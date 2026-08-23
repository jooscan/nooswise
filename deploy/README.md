# Deploying nooswise

One always-free `e2-micro` VM running Postgres, the app, and Caddy under Docker Compose.
Everything below stays inside Google Cloud's Always Free tier; the only recurring cost is
the domain (~$10–15/year).

Work through this top to bottom. Commands run on your Mac unless a step says "on the VM".

---

## 0. Before you start

You need:

- A Google Cloud account with billing enabled. Billing must be **on** even for free-tier
  resources — Google needs a card on file, but the resources below do not draw on it.
- The `gcloud` CLI: `brew install --cask google-cloud-sdk`, then `gcloud init`.
- A registered domain you can edit DNS for.

Set these once so the commands below can be pasted as-is:

```bash
export PROJECT_ID=nooswise-prod
export ZONE=us-east1-b
export DOMAIN=nooswise.example.com
```

---

## 1. Create the project

```bash
gcloud projects create "$PROJECT_ID" --name="nooswise"
```

Link it to your billing account (find the ID with `gcloud billing accounts list`):

```bash
gcloud billing projects link "$PROJECT_ID" --billing-account=XXXXXX-XXXXXX-XXXXXX
```

```bash
gcloud config set project "$PROJECT_ID" && gcloud services enable compute.googleapis.com storage.googleapis.com
```

---

## 2. Create the VM

**Every flag here matters for staying free.** `e2-micro` is the only free machine type,
only `us-west1`/`us-central1`/`us-east1` qualify, and the free 30 GB allowance covers
`pd-standard` only — `pd-balanced` is the default and is billed.

```bash
gcloud compute instances create nooswise --zone="$ZONE" --machine-type=e2-micro --boot-disk-type=pd-standard --boot-disk-size=30GB --image-family=debian-12 --image-project=debian-cloud --tags=nooswise-web --scopes=storage-rw
```

Open HTTP and HTTPS:

```bash
gcloud compute firewall-rules create nooswise-web --allow=tcp:80,tcp:443 --target-tags=nooswise-web --description="nooswise HTTP/HTTPS"
```

Get the external IP:

```bash
gcloud compute instances describe nooswise --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

---

## 3. Point your domain at it

At your registrar, create an **A record** for the hostname you chose, pointing at that IP.
Set TTL low (300s) while you're setting up.

Wait until this returns the VM's IP before continuing — Caddy asks Let's Encrypt to verify
the domain, and Let's Encrypt rate-limits failures:

```bash
dig +short "$DOMAIN"
```

---

## 4. Create the backup bucket

Cloud SQL took backups for you. On a self-hosted VM that is now your job.

```bash
gcloud storage buckets create "gs://${PROJECT_ID}-backups" --location=US --uniform-bucket-level-access
```

Delete backups after 30 days so the bucket stays inside the 5 GB free allowance:

```bash
printf '{"rule":[{"action":{"type":"Delete"},"condition":{"age":30}}]}' > /tmp/lifecycle.json && gcloud storage buckets update "gs://${PROJECT_ID}-backups" --lifecycle-file=/tmp/lifecycle.json
```

Let the VM write to it:

```bash
gcloud storage buckets add-iam-policy-binding "gs://${PROJECT_ID}-backups" --member="serviceAccount:$(gcloud projects describe "$PROJECT_ID" --format='get(projectNumber)')-compute@developer.gserviceaccount.com" --role=roles/storage.objectAdmin
```

---

## 5. Bootstrap the VM

```bash
gcloud compute ssh nooswise --zone="$ZONE"
```

Everything from here runs **on the VM**.

Get the code there. If your repo is private, create a read-only deploy key:

```bash
ssh-keygen -t ed25519 -C "nooswise-vm" -f ~/.ssh/id_ed25519 -N "" && cat ~/.ssh/id_ed25519.pub
```

Add that public key to your repo on GitHub under **Settings → Deploy keys** (read access is
enough), then:

```bash
git clone git@github.com:YOUR_USERNAME/nooswise-bill-splitter.git ~/nooswise
```

Install Docker, create the swap file, and set up automatic security updates:

```bash
cd ~/nooswise && sudo bash deploy/bootstrap.sh
```

Log out and back in so your user picks up Docker group access:

```bash
exit
```

---

## 6. Configure and start

Back on the VM (`gcloud compute ssh nooswise --zone="$ZONE"`):

```bash
cd ~/nooswise && cp .env.production.example .env
```

Generate a database password:

```bash
openssl rand -base64 32
```

Edit `.env` (`nano .env`) and set `NOOSWISE_DOMAIN`, `NOOSWISE_ACME_EMAIL`,
`POSTGRES_PASSWORD`, and `BACKUP_BUCKET` (the bucket name **without** `gs://`).

Then deploy:

```bash
bash deploy/update.sh
```

That builds the image, runs migrations, and starts all three containers. The first build
takes a few minutes on a shared-core VM. Caddy fetches the certificate on first request,
so the very first page load may take a few seconds.

Visit `https://your-domain` — you should get the landing page over HTTPS.

---

## 7. Bring your existing splits across

From **your Mac**, with the old data still in `data/splits.json`:

```bash
node scripts/import-legacy-json.mjs --api https://your-domain
```

It preserves the original IDs, so share links already in circulation keep working, and it
skips anything the server already has, so it is safe to run twice.

Anything sitting in a browser's localStorage migrates itself: the app posts it to
`/api/groups/import` on first load and then marks itself done.

---

## 8. Schedule nightly backups

On the VM:

```bash
(crontab -l 2>/dev/null; echo "17 4 * * * cd \$HOME/nooswise && /usr/bin/bash deploy/backup.sh >> \$HOME/backup.log 2>&1") | crontab -
```

Run one now, then **rehearse the restore** — this is the step people skip and regret:

```bash
bash deploy/backup.sh && bash deploy/restore.sh --list
```

```bash
bash deploy/restore.sh --file <the-file-it-just-listed>
```

That restores into a scratch database, prints row counts, and re-checks that every expense
still equals the sum of its splits. Production is untouched.

---

## 9. Confirm the bill is actually zero

Check the billing page 24 hours later, specifically for an **external IPv4** line item.
Google charges ~$0.005/hr for in-use external IPv4 on Compute Engine, and I could not
confirm whether the Always Free `e2-micro` is exempt — so verify rather than assume.

If it is being charged, the fix is Cloudflare Tunnel: the VM dials out to Cloudflare,
needs no public IP at all, and Cloudflare terminates TLS instead of Caddy. Ask and I'll
write that variant.

---

## Day-to-day

**Deploy a change** — push from your Mac, then on the VM:

```bash
cd ~/nooswise && bash deploy/update.sh
```

It takes a safety dump before migrating and refuses to migrate if that dump fails.

**Watch logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

**Check memory** — the thing most likely to bite on a 1 GB box:

```bash
free -h && docker stats --no-stream
```

If Postgres is near its ceiling or swap is being worked hard, `deploy/postgres.conf` is
where to turn `shared_buffers` down.

**Roll back** to a previous commit:

```bash
cd ~/nooswise && git checkout <previous-sha> && bash deploy/update.sh
```

Migrations are forward-only. If one was destructive, restore instead:

```bash
bash deploy/restore.sh --file <backup> --into-production
```

**Open a psql shell:**

```bash
docker compose -f docker-compose.prod.yml exec db psql -U nooswise -d nooswise
```

---

## Notes

- **Postgres is not reachable from the internet.** It has no published port and lives only
  on the internal Docker network. Reach it through `docker compose exec`.
- **`caddy_data` holds your TLS certificates.** Don't prune that volume casually —
  re-issuance is rate-limited by Let's Encrypt.
- **Egress is 1 GB/month free.** The app bundle is ~240 KB gzipped, so roughly 4,000 page
  loads. Worth knowing, unlikely to bite.
- **Scaling past one instance** would need the SSE fan-out in `server/services/events.ts`
  moved from an in-memory Map to Postgres `LISTEN/NOTIFY`. That file is the only thing
  that assumes a single process.

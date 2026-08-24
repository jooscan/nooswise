# Deploying nooswise

One always-free `e2-micro` VM running Postgres, the app, and a Cloudflare Tunnel under
Docker Compose. The VM has **no public IP at all** — Cloudflare Tunnel dials out from the
VM to Cloudflare's edge, so there is nothing for the internet to connect to directly, and
nothing on this box to secure against inbound traffic. Cloudflare terminates TLS.

This stays inside Google Cloud's Always Free tier entirely — no external IP means the
IPv4 charge that motivated this setup doesn't apply, so there's nothing to verify after
the fact. The only recurring cost is the domain, which you already own.

Work through this top to bottom. Commands run on your Mac unless a step says "on the VM".

---

## 0. Before you start

You need:

- `gcloud` CLI: `brew install --cask google-cloud-sdk`, then `gcloud init`.
- Your domain added to Cloudflare (already done) with Cloudflare as the DNS host.

Set these once so the commands below can be pasted as-is:

```bash
export PROJECT_ID=nooswise
export ZONE=us-east1-b
export DOMAIN=your-domain.example.com
```

---

## 1. Enable the APIs this needs

```bash
gcloud config set project "$PROJECT_ID"
gcloud services enable compute.googleapis.com storage.googleapis.com iap.googleapis.com
```

`iap.googleapis.com` is Identity-Aware Proxy — how you'll SSH into a VM that has no
public IP, without opening port 22 to the internet.

---

## 2. Create the VM

**Every flag here matters for staying free — and for staying unreachable except through
the tunnel.** `e2-micro` is the only free machine type, only `us-west1`/`us-central1`/
`us-east1` qualify, the free 30 GB allowance covers `pd-standard` only (`pd-balanced` is
the default and is billed), and `--no-address` is what skips assigning an external IP.

```bash
gcloud compute instances create nooswise --zone="$ZONE" --machine-type=e2-micro --boot-disk-type=pd-standard --boot-disk-size=30GB --image-family=debian-12 --image-project=debian-cloud --no-address --tags=nooswise-app --scopes=storage-rw
```

Allow SSH through IAP only — not the open internet:

```bash
gcloud compute firewall-rules create allow-iap-ssh --direction=INGRESS --action=ALLOW --rules=tcp:22 --source-ranges=35.235.240.0/20 --target-tags=nooswise-app --network=default
```

That range belongs to Google's IAP relay, not to you or the public internet — it's the
only source `gcloud compute ssh --tunnel-through-iap` connects from.

No other firewall rule is needed. There's no port 80 or 443 to open, because there's no
public IP for anything to reach.

---

## 3. Set up the Cloudflare Tunnel

This part happens in the Cloudflare dashboard, since it needs your Cloudflare login.

1. Go to **[one.dash.cloudflare.com](https://one.dash.cloudflare.com) → Networks → Tunnels**.
2. **Create a tunnel** → choose **Cloudflared** as the connector → name it `nooswise`.
3. On the install-command screen, don't run anything — just copy the **token** (the long
   string after `--token`, starting with `ey...`). You'll paste it into `.env` on the VM
   in step 6. Keep it private; anyone with it can route traffic through your tunnel.
4. Click **Next**. Under **Public Hostname**, add:
   - **Subdomain / Domain**: pick your domain (e.g. `nooswise.yourdomain.com`)
   - **Type**: `HTTP`
   - **URL**: `app:3000` — the app container's name and port on the Docker network Compose creates. Not `localhost`.
5. Save the tunnel. Cloudflare creates the DNS record for you — no manual A/CNAME record
   needed, and none would work here anyway since there's no IP to point at.

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
gcloud compute ssh nooswise --zone="$ZONE" --tunnel-through-iap
```

(`--tunnel-through-iap` is required every time you SSH in, since there's no direct
network path to this VM otherwise.)

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

SSH back in (`gcloud compute ssh nooswise --zone="$ZONE" --tunnel-through-iap`):

```bash
cd ~/nooswise && cp .env.production.example .env
```

Generate a database password:

```bash
openssl rand -base64 32
```

Edit `.env` (`nano .env`) and set:
- `CLOUDFLARE_TUNNEL_TOKEN` — the token you copied in step 3
- `POSTGRES_PASSWORD` — the password you just generated
- `BACKUP_BUCKET` — `${PROJECT_ID}-backups` (without `gs://`)

Then deploy:

```bash
bash deploy/update.sh
```

That builds the image, runs migrations, and starts all three containers: Postgres, the
app, and cloudflared. The first build takes a few minutes on a shared-core VM. Once
`cloudflared` connects, the tunnel shows as **Healthy** in the Cloudflare dashboard —
that's your signal it's live, since there's no IP to curl in the meantime.

Visit `https://your-domain` — you should get the landing page over HTTPS, with a
certificate issued by Cloudflare.

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

## Day-to-day

**Deploy a change** — push from your Mac, then on the VM:

```bash
cd ~/nooswise && bash deploy/update.sh
```

It takes a safety dump before migrating and refuses to migrate if that dump fails.

**Watch logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f cloudflared   # tunnel connection issues
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

**SSH in** whenever you need to — always through IAP, since there's no other path:

```bash
gcloud compute ssh nooswise --zone="$ZONE" --tunnel-through-iap
```

---

## Notes

- **Postgres is not reachable from the internet**, and neither is anything else on this
  VM — it has no external IP, full stop. `cloudflared` is the only process that talks
  outward, and only to Cloudflare.
- **Rotate the tunnel token** from the Cloudflare dashboard (Networks → Tunnels → your
  tunnel → Configure) if it's ever exposed, then update `.env` and
  `docker compose -f docker-compose.prod.yml up -d cloudflared`.
- **Egress is 1 GB/month free** on the GCP side. The app bundle is ~240 KB gzipped, so
  roughly 4,000 page loads. Worth knowing, unlikely to bite. Cloudflare's own bandwidth
  is unmetered on the free tier.
- **Scaling past one instance** would need the SSE fan-out in `server/services/events.ts`
  moved from an in-memory Map to Postgres `LISTEN/NOTIFY`. That file is the only thing
  that assumes a single process.

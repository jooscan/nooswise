# Deploying nooswise

One always-free `e2-micro` VM running Postgres, the app, and a Cloudflare Tunnel under
Docker Compose. Cloudflare terminates TLS and routes traffic to the tunnel; nothing
inbound ever reaches the VM directly.

Most of this is already done for the `nooswise` project — see **"What's already set up"**
below, then skip to step 4.

## Cost: ~$3.65/month, plus the domain

Almost everything here is inside Google Cloud's Always Free tier — the VM, its disk,
and the backup bucket. The one thing that isn't, and cannot be made to be: **an in-use
external IPv4 address on a running VM.**

Per Google's own pricing page (cloud.google.com/vpc/network-pricing):

> Both static and ephemeral IP addresses assigned to standard VM instances are offered
> with a free tier. **This free usage is limited to one hour per month per account.**

One hour, not a month. And static doesn't help — the same page prices "static and
ephemeral IP addresses in use on standard VM instances" identically, at $0.005/hr. A
reserved IP kept permanently attached to a running instance costs exactly what an
ephemeral one does; there's no cheaper tier to move to. (The Always Free feature list
for e2-micro confirms this by omission too — it names the instance, the 30GB disk, and
1GB egress explicitly, and says nothing about an IP.)

So ~$3.65/mo (730 hours × $0.005) is the real, essentially unavoidable cost of a VM
that stays running and needs to reach the internet — true whether that VM serves
traffic through a tunnel or a reverse proxy, and whether its IP is ephemeral or static.

**Why the VM needs an external IP at all:** a VM created with `--no-address` has no
internet access in *either* direction — it can't `apt-get`, `docker pull`, or
`git clone`, and `cloudflared` can't dial out to establish the tunnel either. Cloud NAT
provides outbound without an IP but costs ~$32+/mo, far worse than the IP itself.
IPv6-only is genuinely free but breaks `git clone`, because github.com publishes no
`AAAA` record.

**Given the cost is the same either way, why the tunnel and not a plain reverse proxy?**
Purely operational, not financial: zero ports open on the VM at all (not even 80/443),
Cloudflare handles TLS issuance and renewal, and because the IP here is ephemeral —
it changes whenever the VM is stopped and started — there's no DNS A record anywhere
that could go stale. A reverse-proxy setup would need either a reserved static IP (same
cost, one less moving part to manage) or a manual DNS update after every restart.

---

## What's already set up

For the `nooswise` GCP project, these steps are done:

- Project `nooswise`, billing linked, APIs enabled (`compute`, `storage`, `iap`, `cloudbilling`)
- VM `nooswise` in `us-east1-b`: `e2-micro`, 30GB `pd-standard`, Debian 12, tag `nooswise-app`
- **Ephemeral** external IP for outbound only (currently `34.24.109.34`, expected to change)
- 2 GB swap file, Docker + Compose, gcloud CLI, unattended security upgrades
- Repo cloned to `~/nooswise` on the VM
- Firewall: `allow-iap-ssh` only — port 22 scoped to Google's IAP relay range
- **GCP's `default-allow-ssh` and `default-allow-rdp` rules deleted** — new projects get
  these automatically and they open ports 22 and 3389 to `0.0.0.0/0`. Worth checking for
  on any new GCP project.
- Backup bucket `gs://nooswise-backups` in `us-east1` (matches the VM's region — required for the Cloud Storage Always Free tier, which only covers `us-east1`/`us-west1`/`us-central1`, not multi-region locations), 30-day lifecycle, VM service account has write access

**Still to do: steps 3 (create the tunnel) and 4 onward.**

---

## 0. Before you start

```bash
export PROJECT_ID=nooswise
export ZONE=us-east1-b
```

---

## 1. Create the project (done)

```bash
gcloud config set project "$PROJECT_ID" && gcloud services enable compute.googleapis.com storage.googleapis.com iap.googleapis.com
```

---

## 2. Create the VM (done)

**Every flag matters for staying free.** `e2-micro` is the only free machine type, only
`us-west1`/`us-central1`/`us-east1` qualify, and the free 30 GB allowance covers
`pd-standard` only — `pd-balanced` is the default and is billed. Note there is no
`--address` flag, so the IP is ephemeral.

```bash
gcloud compute instances create nooswise --zone="$ZONE" --machine-type=e2-micro --boot-disk-type=pd-standard --boot-disk-size=30GB --image-family=debian-12 --image-project=debian-cloud --tags=nooswise-app --scopes=storage-rw
```

SSH via IAP, so port 22 is never open to the internet:

```bash
gcloud compute firewall-rules create allow-iap-ssh --direction=INGRESS --action=ALLOW --rules=tcp:22 --source-ranges=35.235.240.0/20 --target-tags=nooswise-app --network=default
```

Then delete the wide-open defaults GCP creates for you:

```bash
gcloud compute firewall-rules delete default-allow-ssh default-allow-rdp --quiet
```

**No HTTP/HTTPS firewall rule is needed** — the tunnel is outbound-only, so there is
nothing to open.

---

## 3. Create the Cloudflare Tunnel

This happens in the Cloudflare dashboard, since it needs your login.

1. Go to **[one.dash.cloudflare.com](https://one.dash.cloudflare.com) → Networks → Tunnels**.
2. **Create a tunnel** → **Cloudflared** connector → name it `nooswise`.
3. On the install-command screen, don't run anything — just copy the **token** (the long
   string after `--token`, starting with `ey...`). It goes into `.env` in step 4. Keep it
   private; anyone with it can route traffic through your tunnel.
4. Click **Next**. Under **Public Hostname**, add:
   - **Subdomain / Domain**: pick your domain
   - **Type**: `HTTP`
   - **URL**: `app:3000` — the app container's name and port on the Docker network
     Compose creates. Not `localhost`, and not `https`.
5. Save. Cloudflare creates the DNS record itself — you never enter an IP anywhere,
   which is the whole point.

---

## 4. Configure and start

```bash
gcloud compute ssh nooswise --zone="$ZONE" --tunnel-through-iap
```

(`--tunnel-through-iap` is required every time, since port 22 isn't open publicly.)

On the VM:

```bash
cd ~/nooswise && cp .env.production.example .env
```

Generate a database password:

```bash
openssl rand -base64 32
```

Edit `.env` (`nano .env`) and set `CLOUDFLARE_TUNNEL_TOKEN`, `POSTGRES_PASSWORD`, and
`BACKUP_BUCKET` (`nooswise-backups`, without `gs://`).

Then deploy:

```bash
bash deploy/update.sh
```

That builds the image, runs migrations, and starts Postgres, the app, and cloudflared.
The first build takes a few minutes on a shared-core VM. Once the tunnel shows
**Healthy** in the Cloudflare dashboard, your domain serves the app over HTTPS.

If it doesn't come up, check the tunnel connection first:

```bash
docker compose -f docker-compose.prod.yml logs cloudflared
```

---

## 5. Bring your existing splits across

From **your Mac**, with the old data still in `data/splits.json`:

```bash
node scripts/import-legacy-json.mjs --api https://your-domain
```

It preserves the original IDs, so share links already in circulation keep working, and it
skips anything the server already has, so it is safe to run twice.

Anything sitting in a browser's localStorage migrates itself: the app posts it to
`/api/groups/import` on first load and then marks itself done.

---

## 6. Schedule nightly backups

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

## 7. Confirm the bill matches expectations

Check the billing page after a couple of days. You should see one external-IP line item
around $3.65/mo (see the Cost section above for why this is real and expected, not a
mistake). What would mean something is actually wrong: a second such line item — check
for a second VM with an external IP, or a reserved static address:

```bash
gcloud compute instances list
gcloud compute addresses list
```

One instance, empty address list, is what you want.

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

**SSH in:**

```bash
gcloud compute ssh nooswise --zone="$ZONE" --tunnel-through-iap
```

---

## Notes

- **Nothing on this VM is reachable from the internet.** No container publishes a port,
  the only firewall rule is IAP-scoped SSH, and the external IP exists purely so the box
  can reach out. Postgres in particular is only on the internal Docker network.
- **Stopping and starting the VM changes its IP.** Nothing breaks — that's why the tunnel
  is here rather than a reverse proxy and an A record.
- **Rotate the tunnel token** from the Cloudflare dashboard (Networks → Tunnels → your
  tunnel → Configure) if it's ever exposed, then update `.env` and
  `docker compose -f docker-compose.prod.yml up -d cloudflared`.
- **Egress is 1 GB/month free** on the GCP side. The app bundle is ~240 KB gzipped, so
  roughly 4,000 page loads. Cloudflare's own bandwidth is unmetered on the free plan.
- **Scaling past one instance** would need the SSE fan-out in `server/services/events.ts`
  moved from an in-memory Map to Postgres `LISTEN/NOTIFY`. That file is the only thing
  that assumes a single process.

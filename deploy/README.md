# Deploying nooswise

One always-free `e2-micro` VM running Postgres, the app, and Caddy under Docker Compose.
Caddy terminates TLS with an automatically-renewed Let's Encrypt certificate.

Most of this is already done for the `nooswise` project — see **"What's already set up"**
below, and skip to step 5.

## Cost

The VM, its disk, and the backup bucket are all inside Google Cloud's Always Free tier.
The one thing that isn't: **an in-use external IPv4 address, ~$0.005/hr (~$3.65/mo)**.

That is effectively unavoidable, and it's worth understanding why, because it's not
obvious:

- A VM created with `--no-address` has **no internet access at all** — not just no
  inbound, no *outbound* either. It can't `apt-get`, `docker pull`, or `git clone`.
- Cloud NAT solves that but costs ~$32+/mo, far more than the IP.
- **IPv6-only doesn't work**: GitHub publishes no `AAAA` record at all, so `git clone`
  and the `git pull` in `deploy/update.sh` would fail. (Docker Hub and Debian's mirrors
  are fine over IPv6 — GitHub is the blocker.)

Cloudflare Tunnel was evaluated as a way to avoid the charge and **does not**, for the
same reason: the VM still needs outbound access to dial out to Cloudflare in the first
place.

So: ~$3.65/mo, plus the domain. Check your billing page after the first day to confirm
that's the only line item.

---

## What's already set up

For the `nooswise` GCP project, these steps are done:

- Project `nooswise`, billing linked, APIs enabled (`compute`, `storage`, `iap`)
- VM `nooswise` in `us-east1-b`: `e2-micro`, 30GB `pd-standard`, Debian 12, tag `nooswise-app`
- 2 GB swap file, Docker + Compose, gcloud CLI, unattended security upgrades
- Repo cloned to `~/nooswise` on the VM
- Firewall: `allow-iap-ssh` (port 22, scoped to Google's IAP relay range only)
- **GCP's `default-allow-ssh` and `default-allow-rdp` rules deleted** — new projects get
  these automatically and they open ports 22 and 3389 to `0.0.0.0/0`. Worth checking for
  on any new GCP project.
- Backup bucket `gs://nooswise-backups`, 30-day lifecycle, VM service account has write access

**Still to do: steps 3 (DNS), 4 (firewall for HTTP/HTTPS), and 5 onward.**

---

## 0. Before you start

Set these once so the commands below can be pasted as-is:

```bash
export PROJECT_ID=nooswise
export ZONE=us-east1-b
export DOMAIN=your-domain.example.com
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
`pd-standard` only — `pd-balanced` is the default and is billed.

```bash
gcloud compute instances create nooswise --zone="$ZONE" --machine-type=e2-micro --boot-disk-type=pd-standard --boot-disk-size=30GB --image-family=debian-12 --image-project=debian-cloud --tags=nooswise-app --scopes=storage-rw
```

SSH is via IAP, so port 22 never needs opening to the internet:

```bash
gcloud compute firewall-rules create allow-iap-ssh --direction=INGRESS --action=ALLOW --rules=tcp:22 --source-ranges=35.235.240.0/20 --target-tags=nooswise-app --network=default
```

Then delete the wide-open defaults GCP creates for you:

```bash
gcloud compute firewall-rules delete default-allow-ssh default-allow-rdp --quiet
```

---

## 3. Point your domain at the VM

Get the external IP:

```bash
gcloud compute instances describe nooswise --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

At Cloudflare (your registrar), create an **A record** for your hostname pointing at that IP.

**Set the record to "DNS only" (grey cloud), not "Proxied" (orange cloud).** Caddy needs
to reach Let's Encrypt directly to prove it controls the domain; proxying breaks that
challenge. You can switch it to proxied later once the certificate exists, if you want
Cloudflare in front.

Wait until this returns the VM's IP before continuing — Let's Encrypt rate-limits failures:

```bash
dig +short "$DOMAIN"
```

---

## 4. Open HTTP and HTTPS

Only do this once DNS resolves, so Caddy can get its certificate on first boot:

```bash
gcloud compute firewall-rules create nooswise-web --allow=tcp:80,tcp:443 --target-tags=nooswise-app --description="nooswise HTTP/HTTPS"
```

Port 80 is required — Let's Encrypt uses it for the HTTP-01 challenge, and Caddy
redirects it to HTTPS afterwards.

---

## 5. Configure and start

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

Edit `.env` (`nano .env`) and set `NOOSWISE_DOMAIN`, `NOOSWISE_ACME_EMAIL`,
`POSTGRES_PASSWORD`, and `BACKUP_BUCKET` (`nooswise-backups`, without `gs://`).

Then deploy:

```bash
bash deploy/update.sh
```

That builds the image, runs migrations, and starts all three containers. The first build
takes a few minutes on a shared-core VM. Caddy fetches the certificate on first request,
so the very first page load may take a few seconds.

Visit `https://your-domain` — you should get the landing page over HTTPS.

If it doesn't come up, check Caddy first — certificate problems are the usual cause:

```bash
docker compose -f docker-compose.prod.yml logs caddy
```

---

## 6. Bring your existing splits across

From **your Mac**, with the old data still in `data/splits.json`:

```bash
node scripts/import-legacy-json.mjs --api https://your-domain
```

It preserves the original IDs, so share links already in circulation keep working, and it
skips anything the server already has, so it is safe to run twice.

Anything sitting in a browser's localStorage migrates itself: the app posts it to
`/api/groups/import` on first load and then marks itself done.

---

## 7. Schedule nightly backups

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

- **Postgres is not reachable from the internet.** It has no published port and lives only
  on the internal Docker network. Reach it through `docker compose exec`.
- **SSH is not reachable from the internet either** — only through IAP. If you ever can't
  connect, check that `allow-iap-ssh` still exists and that `default-allow-ssh` hasn't been
  recreated.
- **`caddy_data` holds your TLS certificates.** Don't prune that volume casually —
  re-issuance is rate-limited by Let's Encrypt.
- **Egress is 1 GB/month free.** The app bundle is ~240 KB gzipped, so roughly 4,000 page
  loads. Worth knowing, unlikely to bite.
- **Scaling past one instance** would need the SSE fan-out in `server/services/events.ts`
  moved from an in-memory Map to Postgres `LISTEN/NOTIFY`. That file is the only thing
  that assumes a single process.

# Self-hosting Conscient (Kali / any Linux box + Cloudflare Tunnel)

This runbook assumes a Linux server with Docker + Docker Compose installed,
and `cloudflared` already running as a tunnel on that same box. MongoDB runs
self-hosted as its own container in this same compose stack -- no external
database account or signup needed.

## 1. Prerequisites on the server

```bash
docker --version
docker compose version
git --version
```

If Docker isn't installed on Kali:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

## 2. Clone the repo

```bash
git clone https://github.com/jagdishpatel-dev/Conscient.git
cd Conscient
```

## 3. Configure secrets

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in real values:

```env
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB_NAME=conscient
JWT_SECRET=<generate one -- see below>
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
```

Leave `MONGODB_URI` exactly as `mongodb://mongo:27017` -- `mongo` is the
Mongo container's name on the compose network, resolved automatically by
Docker's internal DNS. It has no auth and isn't exposed outside this
compose network on purpose (see the comment in `docker-compose.yml`).

Generate a strong `JWT_SECRET`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

`backend/.env` is gitignored -- it never leaves the server.

## 4. Build and start

```bash
docker compose up -d --build
```

First build takes a while: it downloads the embedding model
(`all-MiniLM-L6-v2`) and the emotion classifier
(`j-hartmann/emotion-english-distilroberta-base`) into the backend image so
the container never needs internet access at runtime.

## 5. Verify locally on the server

```bash
curl http://localhost:8080/api/health
# {"status":"ok"}

curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"smoketest","password":"password123"}'
```

Open `http://<server-lan-ip>:8080` in a browser on the same network to check
the UI renders and you can sign up / write an entry / chat.

The `web` container only binds to `127.0.0.1:8080` on the host -- it is not
reachable from your LAN or the internet directly. The only way in is through
your Cloudflare Tunnel, which is intentional: one less thing to firewall.

## 6. Point your Cloudflare Tunnel at it

Add an ingress rule to your existing `~/.cloudflared/config.yml` (adjust the
hostname to whatever you want to use):

```yaml
ingress:
  - hostname: conscient.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

Make sure this rule comes *before* the catch-all `http_status:404` line, and
that a DNS record routes your hostname to the tunnel
(`cloudflared tunnel route dns <tunnel-name> conscient.yourdomain.com` if you
haven't already). Then restart the tunnel:

```bash
sudo systemctl restart cloudflared
# or, if you run it manually:
cloudflared tunnel run <tunnel-name>
```

Your app is now live at `https://conscient.yourdomain.com` with TLS handled
entirely by Cloudflare -- no certs to manage on the server.

## Day-to-day operations

**Logs:**
```bash
docker compose logs -f backend
docker compose logs -f web
```

**Update to latest code:**
```bash
git pull
docker compose up -d --build
```

**Restart without rebuilding:**
```bash
docker compose restart
```

**Stop everything:**
```bash
docker compose down
```

**Data persistence.** Two named Docker volumes survive restarts and
rebuilds: `mongo_data` (users, diary entries, chat history -- the actual
source of truth) and `chroma_data` (the vector index, rebuildable from
Mongo's diary entries if lost). `docker compose down -v` deletes both --
don't run that casually.

**Backups.** Since Mongo is self-hosted now (not Atlas, which handled this
for you automatically), back it up yourself periodically:
```bash
docker compose exec mongo mongodump --archive=/data/db/backup.archive
docker cp $(docker compose ps -q mongo):/data/db/backup.archive ./backup-$(date +%F).archive
```
Copy that file off the server (another disk, cloud storage, wherever) --
a backup that only lives on the same box as the database isn't a real backup.

## Troubleshooting

- **`docker compose up` fails on the backend build with a `torch` error**:
  the Dockerfile pins the CPU-only wheel for `linux/amd64`. If your server is
  ARM (unlikely for a typical Kali install, but possible on a Raspberry Pi),
  you'll need to drop the `--index-url https://download.pytorch.org/whl/cpu`
  line in `backend/Dockerfile` and let pip resolve a platform-appropriate
  build instead.
- **Chat replies are slow or return the "AI model is a bit overloaded"
  fallback message**: this is the free OpenRouter tier being rate-limited
  upstream, not a bug in the deploy -- the backend already retries a few
  times before falling back.
- **`/api/health` works but the web UI shows a blank page**: check
  `docker compose logs web` -- usually a stale build; try
  `docker compose up -d --build --no-cache web`.

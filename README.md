# Lumina

A self-hosted family dashboard: shared calendar, a WooCommerce order board, photos and weather, run on your own machine with Docker. All data stays in a SQLite file on your server.

It was built for a small family business run from home, so the order board is the most developed part.

## Features

- **Calendar.** Google Calendar sync, iCloud (CalDAV) sync, and per-person control over whether other family members can see your events.
- **Order board.** WooCommerce orders on a drag-and-drop board. Moving a card updates the order status in WooCommerce, and changes made in WooCommerce are pulled in every 30 minutes. Several columns can share one WooCommerce status (for example "Making" and "Packed" can both be `processing`).
- **Order details.** Product options (board style, font, colour, names) are read from the order and shown on each card. You can filter by those options or by date, hide columns you don't need, and add Australia Post tracking numbers.
- **Photos.** Upload photos into albums, with thumbnails generated on the server.
- **Weather.** Current conditions and forecast from OpenWeather.
- **Kiosk mode.** A full-screen slideshow for a wall-mounted tablet or display.
- **Users.** Admin and member roles, with individual permissions that can be granted or removed per person.

## Install

You need Docker with the Compose plugin. Lumina runs on amd64 and arm64, including a Raspberry Pi 4 or 5.

```bash
git clone https://github.com/jasoisjaso/lumina.git
cd lumina
docker compose up -d
```

Then open `http://<your-server>:3000`. The first visit takes you through setup: family name, admin account, and optional weather and WooCommerce keys.

`docker-compose.yml` builds the images from source. To use the prebuilt images instead (quicker on a Pi), use `docker-compose.ghcr.yml` or run `./deploy-pi.sh`. See [RASPBERRY_PI_DEPLOY.md](RASPBERRY_PI_DEPLOY.md).

### Ports

| Port | Service |
| --- | --- |
| 3000 | Web app (nginx, also proxies `/api` to the backend) |
| 3001 | Backend API |

## Configuration

Most settings are made in the app under Settings. The backend reads a few environment variables, which you set in the `environment:` section of the compose file you use:

| Variable | Default | Notes |
| --- | --- | --- |
| `JWT_SECRET` | generated | Signs login tokens. If unset, a random secret is created on first start and saved to `backend/data/.jwt_secret`. |
| `DATABASE_URL` | `sqlite:///app/data/lumina.db` | Location of the SQLite database. |
| `REDIS_HOST`, `REDIS_PORT` | `redis`, `6379` | |
| `SYNC_INTERVAL` | `30` | Minutes between WooCommerce and Google Calendar syncs. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | | Needed for Google Calendar sync. |

`backend/.env.example` lists every option for running the backend outside Docker.

## Data and backups

Everything is stored in `backend/data/`:

- `lumina.db`: the database
- `uploads/`: photos
- `.jwt_secret`: the generated signing secret, if you didn't set `JWT_SECRET`

To back up, stop the containers and copy the folder. The folder belongs to the container's user (UID 1001), so the copy needs `sudo`:

```bash
docker compose down
sudo mkdir -p backups
sudo cp -a backend/data backups/lumina-$(date +%Y%m%d)
docker compose up -d
```

To restore, stop the containers, replace `backend/data` with the backup copy, and start them again.

Stopping the containers first matters. The database runs in WAL mode, and the backend only folds recent writes back into `lumina.db` when it shuts down cleanly.

## Upgrading

```bash
git pull
docker compose up -d --build
```

Database migrations run automatically when the backend starts. Read [CHANGELOG.md](CHANGELOG.md) before upgrading; 1.1.0 has a few changes that affect existing installs.

## Development

Requirements: Node.js 22 and a local Redis (`docker compose up -d redis` works).

```bash
# Backend, on port 3001
cd backend
npm ci
npm run migrate:latest
npm run dev

# Frontend, on port 3000
cd frontend
npm ci
npm start
```

Checks that CI runs on every pull request:

```bash
cd backend && npm run type-check && npm test
cd frontend && npx tsc --noEmit && CI=true npm run build
```

Backend tests use Vitest and run against a temporary SQLite database, so they never touch your data.

### Layout

```
backend/    Express API (TypeScript), Knex migrations, sync jobs, tests
frontend/   React 18 app (TypeScript, Zustand, Tailwind)
docs/       Deployment and troubleshooting guides
```

## More documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): production setup, reverse proxy, HTTPS
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md): common problems
- [TESTING_GUIDE.md](TESTING_GUIDE.md): checking WooCommerce sync by hand
- [CONTRIBUTING.md](CONTRIBUTING.md): how to contribute

## License

MIT. See [LICENSE](LICENSE).

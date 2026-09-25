# Changelog

## [1.1.0] - 2026-09-25

### Before you upgrade

- If you never set `JWT_SECRET` (the default for Docker installs), everyone has to log in again once.
- Only admins can call `POST /api/v1/auth/register`. The app itself never used it; members are added from User Management.
- Members get blank values for integration secrets (WooCommerce keys, weather API key, kiosk PIN). Admins still see them.
- Redis is no longer published on port 6379 in `docker-compose.prod.yml`.
- `/api/v1/debug/*` is no longer available when `NODE_ENV=production`.

### Security

- Only admins can register users, and new users always join the admin's own family.
- Members can no longer change their own role, status or family through the profile endpoints.
- If `JWT_SECRET` is unset or left at the example value, a random secret is generated and saved to `data/.jwt_secret`. Previously a hardcoded default was used, which let anyone forge a login.
- Refresh tokens are no longer accepted as access tokens. Role and family are read from the database on every request, so demoted or disabled users lose access immediately.
- Fixed a path check in photo serving that let a crafted URL read another family's photos. Photos are now cached as private.
- Order updates, stage changes, order history and user permission changes are checked against the caller's family.
- Changing an order's status needs `manage_orders`, and a manual sync needs `sync_orders`.
- Passwords are no longer HTML-sanitized before hashing. Existing accounts affected by the old behaviour can still log in, and are re-hashed.
- Admin password resets and invitation acceptance use the full password strength check.

### Fixed

- Moving a card on the order board now updates WooCommerce. It was sending an invalid order id, so the update failed silently and the next sync moved the card back.
- The WooCommerce sync no longer moves orders between columns that share a status (for example from "Making" back to "Ready to Make").
- Saving the column setup no longer deletes every order's board position and history.
- Accepting an invitation no longer requires being logged in.
- Stopping the backend now closes the database cleanly, and a dropped Redis connection no longer crashes it.
- Requests no longer hang when a token refresh fails, and a wrong password shows its error instead of reloading the page.

### Changed

- SQLite runs in WAL mode with a busy timeout, which avoids "database is locked" errors during syncs.
- Docker images use Node 22. Node 18 is end of life.
- CI now runs. It type-checks and tests the backend, type-checks and builds the frontend, builds both images and starts them with Docker Compose. Lockfiles are committed.
- Added backend tests (Vitest).
- Rewrote the README and removed old one-off fix notes.

## [1.0.1] - 2026-01-24

### Added

- Admins can create users with a password directly.
- Feature toggles.
- Input sanitization and rate limiting on API routes.
- Password rules: at least 8 characters, with upper case, lower case and a number.

### Fixed

- Workflow date filters returned no results for the 7 and 30 day presets.
- The refresh button on the order board gave no feedback.
- Creating a user failed with a `password_hash` constraint error.
- Disabled and invited users could log in.

## [1.0.0] - 2026-01-23

First release: shared family calendar (Google and iCloud), WooCommerce order board, photo gallery, weather, admin and member roles, Docker setup.

[1.1.0]: https://github.com/jasoisjaso/lumina/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/jasoisjaso/lumina/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jasoisjaso/lumina/releases/tag/v1.0.0

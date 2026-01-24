# Changelog

All notable changes to Lumina will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.1] - 2026-01-24

### Critical Bug Fixes (2026-01-22)
- **Workflow Date Filters**: Fixed date filtering returning 0 results for "7 days" and "30 days" filters
  - Root cause: Database stores dates as UNIX timestamps but filters were comparing to ISO strings
  - Solution: Convert dates to timestamps (.getTime()) before SQL comparison
  - Result: 7-day filter now shows 18 orders (was 0), 30-day shows 91 orders (was 0)
- **Refresh Button Feedback**: Added visual feedback for refresh button that appeared to do nothing
  - Button now shows "Refreshing..." text and spinning icon during reload
  - Disabled state prevents multiple simultaneous refreshes

### Security Enhancements (2026-01-24)
- **Input Sanitization**: Added comprehensive input sanitization middleware to prevent XSS and SQL injection attacks
- **Rate Limiting**: Implemented rate limiting on authentication endpoints
  - Login: 5 requests per 15 minutes
  - Token refresh: 10 requests per 15 minutes
  - General API: 100 requests per 15 minutes
- **Permission-Based Access Control**: Added granular permission checks to workflow routes
  - Order modification endpoints now require `MANAGE_ORDERS` permission
  - Stage visibility updates restricted to admin users
  - Bulk update operations require proper authorization
- **Password Requirements**: Enforced strong password policy (8+ characters, uppercase, lowercase, number)
- **Login Security**: Added account status validation to prevent disabled/invited users from logging in
- **Performance Indexes**: Added database indexes for faster query performance on high-traffic tables

### Added
- **Direct User Creation**: New endpoint `POST /api/v1/users` for admins to create users with passwords
  - Users can log in immediately after creation
  - No email invitation flow required
  - Password validation with clear requirements
- **User Management UI**: Updated admin panel with password field for creating new users
- **Feature Toggle System**: Infrastructure for managing feature flags across the application
- **Debug Endpoints**: Added debug endpoints for workflow troubleshooting
  - `GET /api/v1/debug/filter-test` - Shows recent orders and filter statistics
  - `GET /api/v1/debug/order-dates` - Displays order date information

### Changed
- **User Invitation Flow**: Fixed database constraint issues in user invitation system
- **Workflow Routes**: Enhanced security with input sanitization and permission checks
- **Authentication Service**: Improved user status validation during login
- **UI Labels**: Changed "Invite Member" to "Add Member" for clearer user creation flow

### Fixed
- **User Creation Bug**: Resolved `NOT NULL constraint failed: users.password_hash` error
- **Workflow Service**: Fixed incomplete code blocks in order filtering logic
- **WooCommerce Service**: Corrected syntax errors in status mapping
- **Code Compilation**: Fixed multiple TypeScript compilation errors
- **Indentation Issues**: Corrected code formatting in workflow sync methods

### Technical Improvements
- Added sanitize-html and validator packages for input sanitization
- Implemented express-rate-limit for API protection
- Created reusable middleware for authentication and authorization
- Improved error handling in workflow and user management services
- Enhanced type safety across backend services
- Added comprehensive debug logging for workflow filters

### Dependencies
- Added: `sanitize-html@2.17.0`
- Added: `validator@13.15.26`
- Added: `express-rate-limit@8.2.1`
- Updated: All dependencies to latest secure versions

---

## [1.0.0] - 2026-01-23

### Initial Release
- Family dashboard with multi-user support
- WooCommerce order management with workflow board
- Google Calendar and iCloud integration
- Photo gallery with album support
- Weather widget
- Role-based permissions (admin/member)
- JWT-based authentication
- Docker containerization
- SQLite database with Knex migrations

[1.0.1]: https://github.com/yourusername/lumina/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/yourusername/lumina/releases/tag/v1.0.0

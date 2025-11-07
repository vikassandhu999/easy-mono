# Configuration Guide

This document describes all configuration options for the Easy Coaching Platform.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Application Configuration](#application-configuration)
- [Authentication & Security](#authentication--security)
- [Email Configuration](#email-configuration)
- [Database Configuration](#database-configuration)
- [Deployment Configuration](#deployment-configuration)

## Environment Variables

### Required for Production

These environment variables **must** be set in production:

| Variable          | Description                                                  | Example                            |
| ----------------- | ------------------------------------------------------------ | ---------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string                                 | `ecto://user:pass@host/dbname`     |
| `SECRET_KEY_BASE` | Phoenix secret key base (generate with `mix phx.gen.secret`) | `abc123...`                        |
| `JWT_SECRET`      | Secret key for signing JWT tokens (min 32 characters)        | `your-secret-key-minimum-32-chars` |
| `PHX_HOST`        | Public hostname for the application                          | `api.example.com`                  |
| `PORT`            | HTTP port to bind to                                         | `4000`                             |

### Email Configuration

Configure email delivery using one of the supported adapters:

#### Postmark (Default)

```bash
MAILER_ADAPTER=postmark
POSTMARK_API_KEY=your-postmark-api-key
```

#### SendGrid

```bash
MAILER_ADAPTER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
```

#### Mailgun

```bash
MAILER_ADAPTER=mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.example.com
```

#### SMTP

```bash
MAILER_ADAPTER=smtp
SMTP_RELAY=smtp.example.com
SMTP_USERNAME=your-username
SMTP_PASSWORD=your-password
SMTP_PORT=587
```

### Email Sender Configuration

| Variable             | Description                       | Default                    |
| -------------------- | --------------------------------- | -------------------------- |
| `EMAIL_FROM_NAME`    | Display name for outgoing emails  | `Easy Coaching`            |
| `EMAIL_FROM_ADDRESS` | Email address for outgoing emails | `noreply@easycoaching.com` |
| `APP_URL`            | Base URL for invitation links     | `http://localhost:4000`    |

### Optional Configuration

| Variable            | Description                          | Default |
| ------------------- | ------------------------------------ | ------- |
| `POOL_SIZE`         | Database connection pool size        | `10`    |
| `ECTO_IPV6`         | Enable IPv6 for database connections | `false` |
| `DNS_CLUSTER_QUERY` | DNS query for clustering             | -       |

## Application Configuration

### Authentication Settings

Configure authentication behavior in `config/config.exs`:

```elixir
config :easy, :auth,
  # OTP token settings
  otp_expiry_minutes: 10,              # OTP code expiration time
  otp_max_attempts: 3,                 # Maximum OTP verification attempts
  invitation_expiry_days: 7,           # Client invitation token expiration

  # Rate limiting settings
  rate_limit_window_minutes: 15,       # Rate limit time window
  rate_limit_max_requests: 3,          # Maximum OTP requests per window

  # Session settings
  session_expiry_days: 7,              # Session validity period
  access_token_expiry_days: 7,         # JWT access token expiration
  refresh_token_expiry_days: 30,       # JWT refresh token expiration

  # Cleanup settings
  cleanup_expired_tokens_older_than_days: 7,    # Delete old OTP tokens
  cleanup_old_sessions_older_than_days: 90,     # Delete old sessions

  # Idempotency settings (NEW)
  idempotent_otp_window_seconds: 60,   # Return same token_id if OTP requested within this window
  idempotent_operations_enabled: true  # Enable idempotent behavior for critical operations
```

### JWT Configuration

Configure JWT token behavior in `config/config.exs`:

```elixir
config :easy, :jwt,
  # Token expiration times
  access_token_ttl_days: 7,            # Access token lifetime
  refresh_token_ttl_days: 30,          # Refresh token lifetime
  # Algorithm used for signing (HS256 - HMAC with SHA-256)
  algorithm: "HS256"
```

The JWT secret is configured via environment variable in `config/runtime.exs`:

```elixir
config :easy,
  jwt_secret: System.get_env("JWT_SECRET") || "dev-secret-key-minimum-32-characters-long"
```

### Email Configuration

Configure email settings in `config/config.exs`:

```elixir
config :easy, :email,
  # From email address for all outgoing emails
  from_email: {"Easy Coaching", "noreply@easycoaching.com"},
  # Base URL for invitation links (overridden in runtime.exs)
  app_url: "http://localhost:4000"
```

## Authentication & Security

### OTP (One-Time Password) Settings

**OTP Expiration** (`otp_expiry_minutes`)

- Default: 10 minutes
- Controls how long OTP codes remain valid
- Applies to email verification and login OTP codes
- Client invitation tokens use `invitation_expiry_days` instead

**OTP Max Attempts** (`otp_max_attempts`)

- Default: 3 attempts
- Maximum number of times a user can attempt to verify an OTP code
- After exceeding this limit, a new OTP must be requested
- Prevents brute force attacks

**Invitation Expiry** (`invitation_expiry_days`)

- Default: 7 days
- How long client invitation links remain valid
- Longer expiry allows flexibility for client onboarding

### Rate Limiting

**Rate Limit Window** (`rate_limit_window_minutes`)

- Default: 15 minutes
- Time window for counting OTP requests
- Prevents abuse of OTP generation

**Rate Limit Max Requests** (`rate_limit_max_requests`)

- Default: 3 requests
- Maximum OTP requests allowed per email within the time window
- Returns HTTP 429 with `Retry-After` header when exceeded

### Session Management

**Session Expiry** (`session_expiry_days`)

- Default: 7 days
- How long a session remains valid
- Sessions are automatically cleaned up after expiration

**Access Token Expiry** (`access_token_expiry_days`)

- Default: 7 days
- Lifetime of JWT access tokens
- Tokens include user ID, email, and roles

**Refresh Token Expiry** (`refresh_token_expiry_days`)

- Default: 30 days
- Lifetime of JWT refresh tokens
- Used to obtain new access tokens without re-authentication

### Cleanup Settings

**Expired Tokens Cleanup** (`cleanup_expired_tokens_older_than_days`)

- Default: 7 days
- Deletes OTP tokens that expired more than this many days ago
- Should be run periodically as a background job

**Old Sessions Cleanup** (`cleanup_old_sessions_older_than_days`)

- Default: 90 days
- Deletes sessions that expired more than this many days ago
- Should be run periodically as a background job

### Idempotency Settings

**Idempotent OTP Window** (`idempotent_otp_window_seconds`)

- Default: 60 seconds
- When a duplicate OTP request is made within this window, the same token_id is returned
- Prevents duplicate OTP codes from being sent for accidental retries
- Improves user experience by handling network retries gracefully

**Idempotent Operations Enabled** (`idempotent_operations_enabled`)

- Default: true
- Enables idempotent behavior for critical operations:
  - OTP generation returns existing token_id if requested within window
  - Business creation returns existing business if user already owns one
  - Client invitation returns existing invitation if one is pending
- Set to false to disable idempotency (not recommended for production)

**How Idempotency Works:**

1. **OTP Generation**: When a user requests an OTP, the system checks if a valid OTP was generated within the last 60 seconds. If found, the existing token_id is returned instead of generating a new one.

2. **Business Creation**: When a user attempts to create a business, the system checks if they already own one. If found, the existing business is returned with HTTP 200 instead of creating a duplicate.

3. **Client Invitation**: When a coach invites a client, the system checks if a pending invitation already exists for that email/business combination. If found, the existing invitation is returned.

**Benefits:**

- Handles network retries gracefully without creating duplicates
- Improves user experience by preventing duplicate emails
- Reduces database load from retry attempts
- Maintains data consistency

## Email Configuration

### Development Environment

In development, emails are stored locally and can be viewed at `/dev/mailbox`:

```elixir
# config/dev.exs
config :easy, Easy.Mailer, adapter: Swoosh.Adapters.Local
```

### Test Environment

In test, emails are captured but not sent:

```elixir
# config/test.exs
config :easy, Easy.Mailer, adapter: Swoosh.Adapters.Test
```

### Production Environment

Configure your email provider in production using environment variables (see [Email Configuration](#email-configuration) above).

### Email Templates

The application sends the following types of emails:

1. **OTP Verification Email** - Sent during coach registration
2. **Login OTP Email** - Sent during login
3. **Client Invitation Email** - Sent when a coach invites a client

All email templates are defined in `lib/easy/emails.ex`.

## Database Configuration

### Development

Configure your local database in `config/dev.exs`:

```elixir
config :easy, Easy.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "easy_dev",
  pool_size: 10
```

### Test

Test database is automatically managed:

```elixir
config :easy, Easy.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "easy_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2
```

### Production

Use the `DATABASE_URL` environment variable:

```bash
DATABASE_URL=ecto://user:pass@host/database
```

Optional settings:

- `POOL_SIZE` - Number of database connections (default: 10)
- `ECTO_IPV6` - Set to `true` or `1` to enable IPv6

## Deployment Configuration

### Starting the Server

Set `PHX_SERVER=true` to start the web server:

```bash
PHX_SERVER=true mix phx.server
```

Or use the generated release script:

```bash
bin/easy start
```

### CORS Configuration

#### Development

In development, CORS allows all origins:

```elixir
# config/dev.exs
config :cors_plug,
  origin: ["*"],
  credentials: true
```

#### Production

In production, restrict CORS to specific domains:

```elixir
# config/prod.exs
config :cors_plug,
  origin: [
    "https://yourdomain.com",
    "https://app.yourdomain.com",
    "https://coach.yourdomain.com",
    "https://client.yourdomain.com"
  ],
  credentials: true
```

Update these domains to match your production URLs.

### SSL/HTTPS Configuration

For production HTTPS, configure SSL in `config/runtime.exs`:

```elixir
config :easy, EasyWeb.Endpoint,
  https: [
    port: 443,
    cipher_suite: :strong,
    keyfile: System.get_env("SSL_KEY_PATH"),
    certfile: System.get_env("SSL_CERT_PATH")
  ],
  force_ssl: [hsts: true]
```

### Health Checks

The application provides a health check endpoint at `/health` (if implemented).

### Logging

Configure log level in production:

```elixir
# config/prod.exs
config :logger, level: :info
```

Available levels: `:debug`, `:info`, `:warning`, `:error`

## Development-Specific Configuration

### OTP Bypass (Development Only)

In development, you can enable OTP bypass for easier testing:

```elixir
# config/dev.exs
config :easy,
  otp_bypass_enabled: true,  # Accept "123456" as valid OTP
  otp_log_enabled: true       # Log generated OTP codes to console
```

**Warning:** Never enable these in production!

### JWT Secret (Development)

Development uses a hardcoded JWT secret:

```elixir
# config/dev.exs
config :easy, Easy.Accounts.Token,
  secret_key: "dev-jwt-secret-key-should-be-changed-in-production"
```

**Important:** Always use a secure, randomly generated secret in production via the `JWT_SECRET` environment variable.

## Configuration Checklist

### Before Deploying to Production

- [ ] Set `DATABASE_URL` environment variable
- [ ] Set `SECRET_KEY_BASE` (generate with `mix phx.gen.secret`)
- [ ] Set `JWT_SECRET` (minimum 32 characters)
- [ ] Configure email provider (Postmark, SendGrid, etc.)
- [ ] Set `EMAIL_FROM_NAME` and `EMAIL_FROM_ADDRESS`
- [ ] Set `APP_URL` to your production domain
- [ ] Set `PHX_HOST` to your production hostname
- [ ] Update CORS origins in `config/prod.exs`
- [ ] Configure SSL certificates (if using HTTPS)
- [ ] Review and adjust authentication settings if needed
- [ ] Set up background jobs for cleanup tasks
- [ ] Configure monitoring and error tracking

### Security Checklist

- [ ] JWT secret is at least 32 characters long
- [ ] JWT secret is randomly generated and kept secure
- [ ] Database credentials are not committed to version control
- [ ] Email API keys are stored as environment variables
- [ ] CORS is restricted to specific domains in production
- [ ] SSL/HTTPS is enabled in production
- [ ] Rate limiting is enabled and configured appropriately
- [ ] OTP bypass is disabled in production
- [ ] Session expiry times are appropriate for your use case

## Troubleshooting

### Common Issues

**"JWT secret not configured" error**

- Ensure `JWT_SECRET` environment variable is set
- In development, check `config/dev.exs` for the default secret

**Emails not sending**

- Check email adapter configuration
- Verify API keys are correct
- Check logs for email delivery errors
- In development, check `/dev/mailbox` for local emails

**Rate limit errors**

- Check `rate_limit_window_minutes` and `rate_limit_max_requests` settings
- Consider increasing limits if legitimate users are affected
- Check for abuse patterns in logs

**Database connection errors**

- Verify `DATABASE_URL` is correct
- Check database server is running
- Verify network connectivity
- Check pool size if seeing timeout errors

## Additional Resources

- [Phoenix Configuration Guide](https://hexdocs.pm/phoenix/deployment.html)
- [Ecto Configuration](https://hexdocs.pm/ecto/Ecto.Repo.html)
- [Swoosh Email Configuration](https://hexdocs.pm/swoosh/Swoosh.html)
- [Joken JWT Library](https://hexdocs.pm/joken/introduction.html)

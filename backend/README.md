# Easy Coaching Platform

A coaching platform MVP built with Phoenix/Elixir that enables coaches to manage their clients and track progress. The platform uses OTP-based passwordless authentication following OAuth 2.0 conventions.

## Features

- **Passwordless Authentication**: OTP-based authentication via email (no passwords)
- **OAuth 2.0 Compatible**: Standard OAuth endpoints for token management
- **Multi-Tenant Architecture**: Business-scoped data isolation
- **Coach Management**: Create and manage coach profiles
- **Client Management**: Invite and manage clients with automatic assignments
- **Session Management**: JWT-based sessions with refresh tokens

## Getting Started

### Prerequisites

- Elixir 1.15 or later
- PostgreSQL
- An email service provider (Postmark, SendGrid, Mailgun, or SMTP)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   mix setup
   ```

3. Configure your database in `config/dev.exs`

4. Start the Phoenix server:
   ```bash
   mix phx.server
   ```

5. Visit [`localhost:4000`](http://localhost:4000) from your browser

### Development

In development, emails are stored locally and can be viewed at [`localhost:4000/dev/mailbox`](http://localhost:4000/dev/mailbox).

For easier testing, OTP bypass is enabled in development - use "123456" as a valid OTP code.

## Configuration

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for detailed configuration options including:

- Environment variables
- Authentication settings
- Email configuration
- JWT token settings
- Rate limiting
- Session management
- Deployment configuration

## Documentation

- [Configuration Guide](docs/CONFIGURATION.md) - Complete configuration reference
- [API Structure](docs/API_STRUCTURE.md) - API endpoint documentation
- [Authorization Helpers](docs/AUTHORIZATION_HELPERS.md) - Authorization patterns
- [Email Configuration](docs/EMAIL_CONFIGURATION.md) - Email setup guide
- [OAuth Routes](docs/OAUTH_ROUTES.md) - OAuth 2.0 endpoint reference
- [API Contract](docs/api_contract.yaml) - OpenAPI 3.0 contract for frontend integration

## Production Deployment

Before deploying to production:

1. Set required environment variables (see [Configuration Guide](docs/CONFIGURATION.md))
2. Generate secrets:
   ```bash
   mix phx.gen.secret
   ```
3. Configure your email provider
4. Update CORS origins in `config/prod.exs`
5. Set up SSL/HTTPS
6. Configure background jobs for cleanup tasks

See the [Configuration Checklist](docs/CONFIGURATION.md#configuration-checklist) for a complete deployment checklist.

## Testing

Run tests with:

```bash
mix test
```

Run precommit checks (compile, format, test):

```bash
mix precommit
```

## Architecture

The application follows Phoenix context-driven design:

- **Easy.Accounts** - User identity, authentication, OTP, and session management
- **Easy.Orgs** - Business and subscription management
- **Easy.Orgs** - Coach profile management
- **Easy.Clients** - Client management and invitations

## Learn More

* Official website: https://www.phoenixframework.org/
* Guides: https://hexdocs.pm/phoenix/overview.html
* Docs: https://hexdocs.pm/phoenix
* Forum: https://elixirforum.com/c/phoenix-forum
* Source: https://github.com/phoenixframework/phoenix

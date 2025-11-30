# Email Configuration Guide

This document describes how to configure email delivery for the Easy Coaching platform.

## Overview

The platform uses Swoosh for email delivery with support for multiple adapters. Emails are sent asynchronously by default to improve response times and user experience.

## Configuration

### Environment Variables

The following environment variables control email delivery:

#### Required for Production

- `MAILER_ADAPTER` - Email service provider (default: `postmark`)
  - Options: `postmark`, `sendgrid`, `mailgun`, `smtp`

#### Adapter-Specific Variables

**Postmark** (recommended):
```bash
POSTMARK_API_KEY=your-api-key-here
```

**SendGrid**:
```bash
SENDGRID_API_KEY=your-api-key-here
```

**Mailgun**:
```bash
MAILGUN_API_KEY=your-api-key-here
MAILGUN_DOMAIN=mg.api.coacheasy.app
```

**SMTP**:
```bash
SMTP_RELAY=smtp.example.com
SMTP_USERNAME=your-username
SMTP_PASSWORD=your-password
SMTP_PORT=587
```

#### Optional Configuration

- `EMAIL_FROM_NAME` - Sender name (default: "Easy Coaching")
- `EMAIL_FROM_ADDRESS` - Sender email (default: "noreply@easycoaching.com")
- `APP_URL` - Base URL for invitation links (default: "http://localhost:4000")

### Development Environment

In development, emails are stored locally and can be viewed at:
```
http://localhost:4000/dev/mailbox
```

No additional configuration is required for development.

### Test Environment

In test environment, emails use the Local adapter and are not actually sent. They can be inspected in tests using Swoosh.TestAssertions.

## Email Types

The platform sends three types of emails:

1. **OTP Verification Email** - Sent when a coach registers
2. **Login OTP Email** - Sent when a user requests to log in
3. **Client Invitation Email** - Sent when a coach invites a client

## Async Email Delivery

All emails are sent asynchronously using `Easy.MailerDelivery.deliver_async/2`. This provides:

- **Non-blocking**: API responses are not delayed by email delivery
- **Error handling**: Failures are logged but don't crash the request
- **Monitoring**: All email attempts are logged with metadata

### Usage Example

```elixir
# Send email asynchronously (recommended)
email = Easy.Emails.otp_verification_email("user@example.com", "123456")
Easy.MailerDelivery.deliver_async(email, 
  metadata: %{user_id: 123, type: "verification"}
)

# Send email synchronously (when you need to know if it succeeded)
case Easy.MailerDelivery.deliver_sync(email) do
  {:ok, _response} -> 
    # Email sent successfully
    :ok
  {:error, reason} -> 
    # Handle error
    Logger.error("Failed to send email: #{inspect(reason)}")
end
```

## Error Handling

Email delivery errors are automatically logged with the following information:

- Recipient email address
- Email subject
- Error reason
- Custom metadata (if provided)

Errors do not cause API requests to fail. If email delivery is critical for your use case, use `deliver_sync/2` instead of `deliver_async/2`.

## Monitoring

All email delivery attempts are logged at the appropriate level:

- **Success**: `Logger.info` with recipient and subject
- **Failure**: `Logger.error` with recipient, subject, and error reason
- **Exception**: `Logger.error` with full stacktrace

Example log output:
```
[info] Email sent successfully recipient=user@example.com subject="Verify your email - Easy Coaching" metadata=%{type: "verification"}

[error] Failed to send email recipient=user@example.com subject="Verify your email - Easy Coaching" reason="API key invalid" metadata=%{type: "verification"}
```

## Production Setup

### Recommended: Postmark

1. Sign up for a Postmark account at https://postmarkapp.com
2. Create a server and get your API key
3. Verify your sender domain
4. Set environment variables:
   ```bash
   MAILER_ADAPTER=postmark
   POSTMARK_API_KEY=your-api-key
   EMAIL_FROM_ADDRESS=noreply@api.coacheasy.app
   ```

### Alternative: SendGrid

1. Sign up for SendGrid at https://sendgrid.com
2. Create an API key with "Mail Send" permissions
3. Verify your sender domain
4. Set environment variables:
   ```bash
   MAILER_ADAPTER=sendgrid
   SENDGRID_API_KEY=your-api-key
   EMAIL_FROM_ADDRESS=noreply@api.coacheasy.app
   ```

## Testing Email Delivery

### In Development

Visit `http://localhost:4000/dev/mailbox` to see all emails sent during development.

### In Production

Use your email provider's dashboard to monitor:
- Delivery rates
- Bounce rates
- Spam complaints
- Open rates (if tracking is enabled)

## Troubleshooting

### Emails not being sent

1. Check that the correct adapter is configured
2. Verify API keys are set correctly
3. Check application logs for error messages
4. Ensure sender domain is verified with your email provider

### Emails going to spam

1. Verify your sender domain with SPF and DKIM records
2. Use a reputable email service provider
3. Avoid spam trigger words in subject lines
4. Include an unsubscribe link (for marketing emails)

### Slow email delivery

Emails are sent asynchronously, so they should not affect API response times. If you're experiencing issues:

1. Check your email provider's rate limits
2. Monitor the Task.Supervisor for bottlenecks
3. Consider implementing a job queue (Oban) for high-volume scenarios

## Future Enhancements

For high-volume email sending, consider:

1. **Job Queue**: Implement Oban for better job management and retries
2. **Rate Limiting**: Add per-provider rate limiting
3. **Retry Logic**: Implement exponential backoff for failed deliveries
4. **Email Templates**: Use a template engine for more complex emails
5. **Tracking**: Add open and click tracking

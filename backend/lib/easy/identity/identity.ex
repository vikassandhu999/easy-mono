defmodule Easy.Identity do
  # Thin public facade over the identity workflows. Each flow lives in its
  # own module under Easy.Identity.*. Keep this module as a stable entrypoint
  # for controllers and tests — do not put logic here.

  alias Easy.Identity.AuthTokens
  alias Easy.Identity.EmailConfirmation
  alias Easy.Identity.Invitations
  alias Easy.Identity.OtpDelivery
  alias Easy.Identity.Signup

  defdelegate signup(attrs), to: Signup
  defdelegate verify(token_hash, opts), to: EmailConfirmation
  defdelegate send_otp(email, type), to: OtpDelivery
  defdelegate accept_invite(attrs), to: Invitations
  defdelegate verify_accept_invite(attrs, session_opts), to: Invitations
  defdelegate token(grant_type, opts), to: AuthTokens
end

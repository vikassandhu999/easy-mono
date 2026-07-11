defmodule Easy.Identity do
  # Thin public facade over the identity workflows. Each flow lives in its
  # own module under Easy.Identity.*. Keep this module as a stable entrypoint
  # for controllers and tests — do not put logic here.

  alias Easy.Identity.AuthTokens
  alias Easy.Identity.EmailConfirmation
  alias Easy.Identity.Invitations
  alias Easy.Identity.OtpDelivery
  alias Easy.Identity.Signup

  @spec signup(map()) :: {:ok, Easy.Identity.User.t()} | {:error, any()}
  defdelegate signup(attrs), to: Signup

  @spec verify(String.t(), map()) :: {:ok, AuthTokens.auth_token()} | {:error, any()}
  defdelegate verify(token_hash, opts), to: EmailConfirmation

  @spec send_otp(String.t(), String.t()) :: {:ok, :sent} | {:error, any()}
  defdelegate send_otp(email, type), to: OtpDelivery

  @spec accept_invite(map()) :: {:ok, :otp_sent} | {:error, any()}
  defdelegate accept_invite(attrs), to: Invitations

  @spec verify_accept_invite(map(), map()) :: {:ok, AuthTokens.auth_token()} | {:error, any()}
  defdelegate verify_accept_invite(attrs, session_opts), to: Invitations

  @spec token(:refresh_token | :otp, map()) :: {:ok, AuthTokens.auth_token()} | {:error, any()}
  defdelegate token(grant_type, opts), to: AuthTokens
end

defmodule Easy.Identity do
  # Thin public facade over the identity workflows. Each flow lives in its
  # own module under Easy.Identity.*. Keep this module as a stable entrypoint
  # for controllers and tests — do not put logic here.

  alias Easy.Identity.AuthTokens
  alias Easy.Identity.EmailConfirmation
  alias Easy.Identity.Invitations
  alias Easy.Identity.OtpDelivery
  alias Easy.Identity.SessionFactory
  alias Easy.Identity.Signup

  @spec signup(map()) :: {:ok, Easy.Identity.User.t()} | {:error, Signup.error()}
  defdelegate signup(attrs), to: Signup

  @spec verify(String.t(), SessionFactory.session_opts()) ::
          {:ok, AuthTokens.auth_token()} | {:error, EmailConfirmation.error()}
  defdelegate verify(token_hash, opts), to: EmailConfirmation

  @spec verify_otp(String.t(), String.t(), SessionFactory.session_opts()) ::
          {:ok, AuthTokens.auth_token()} | {:error, :invalid_otp | :otp_expired | Ecto.Changeset.t()}
  defdelegate verify_otp(email, otp, opts), to: EmailConfirmation

  @spec send_otp(String.t(), String.t()) :: {:ok, :sent} | {:error, OtpDelivery.error()}
  defdelegate send_otp(email, type), to: OtpDelivery

  @spec accept_invite(map()) :: {:ok, :otp_sent} | {:error, Invitations.accept_error()}
  defdelegate accept_invite(attrs), to: Invitations

  @spec verify_accept_invite(map(), SessionFactory.session_opts()) ::
          {:ok, AuthTokens.auth_token()} | {:error, Invitations.client_verify_error()}
  defdelegate verify_accept_invite(attrs, session_opts), to: Invitations

  @spec token(:refresh_token, AuthTokens.refresh_token_opts()) ::
          {:ok, AuthTokens.auth_token()} | {:error, AuthTokens.refresh_error()}
  @spec token(:otp, AuthTokens.otp_token_opts()) ::
          {:ok, AuthTokens.auth_token()} | {:error, AuthTokens.otp_error()}
  defdelegate token(grant_type, opts), to: AuthTokens
end

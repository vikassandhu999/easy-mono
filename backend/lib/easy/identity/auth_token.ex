defmodule Easy.Identity.AuthToken do
  @type t() :: %__MODULE__{}

  @derive {Jason.Encoder, only: [:access_token, :token_type, :expires_in, :refresh_token, :scope]}

  defstruct [:access_token, :token_type, :expires_in, :refresh_token, :scope]
end

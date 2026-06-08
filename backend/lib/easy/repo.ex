defmodule Easy.Repo do
  use Ecto.Repo,
    otp_app: :easy,
    adapter: Ecto.Adapters.Postgres
end

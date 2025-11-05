defmodule EasyWeb.HealthController do
  use EasyWeb, :controller

  @moduledoc """
  Health check endpoint for monitoring and load balancers.
  """

  def index(conn, _params) do
    conn
    |> put_status(:ok)
    |> json(%{
      status: "ok",
      service: "easy-backend",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      version: "1.0.0"
    })
  end
end

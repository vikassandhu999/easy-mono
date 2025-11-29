defmodule EasyWeb.PublicJoinController do
  @moduledoc """
  Controller for public join functionality.

  Handles client joining a business via public join code.
  This is a public endpoint (no authentication required).
  """
  use EasyWeb, :controller

  alias Easy.Organizations

  @doc """
  GET /api/join/:code

  Returns business information for the given join code.
  Used to display the public join page before signup.
  """
  def show(conn, %{"code" => code}) do
    case Organizations.get_settings_by_join_code(code) do
      {:ok, settings} ->
        render(conn, :show, settings: settings)

      {:error, :invalid_code} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Invalid join code"})

      {:error, :join_disabled} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Public join is currently disabled for this business"})
    end
  end
end

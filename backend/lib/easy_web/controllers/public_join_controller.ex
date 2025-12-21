defmodule EasyWeb.PublicJoinController do
  use EasyWeb, :controller

  alias Easy.Organizations

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

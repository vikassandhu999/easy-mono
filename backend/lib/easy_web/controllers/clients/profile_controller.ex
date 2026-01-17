defmodule EasyWeb.Clients.ProfileController do
  @moduledoc """
  Handles client self-service profile endpoints.

  All endpoints require authentication with client role.

  ## Endpoints
  - GET /api/me/profile - Get own profile
  - PATCH /api/me/profile - Update own profile
  """

  use EasyWeb, :controller

  alias Easy.Clients
  alias Easy.Auth.Scope

  require Logger

  @doc """
  GET /api/me/profile

  Gets the authenticated client's own profile with business info.
  """
  def show(conn, _params) do
    scope = conn.assigns.scope

    unless Scope.is_client?(scope) do
      {:error, Easy.Error.unauthorized("Insuficient Permision")}
    else
      with {:ok, client} <- Clients.get_my_profile(scope) do
        render(conn, :show, client: client)
      end
    end
  end

  @doc """
  PATCH /api/me/profile

  Updates the authenticated client's own profile.

  ## Request Body (restricted fields)
  - `full_name` - Client full name
  - `phone` - Client phone number
  """
  def update(conn, params) do
    scope = conn.assigns.scope

    unless Scope.is_client?(scope) do
      {:error, Easy.Error.unauthorized("Insuficient Permision")}
    else
      attrs =
        Map.take(params, [
          "full_name",
          "phone",
          "image_url",
          "height_cm",
          "weight_kg",
          "date_of_birth",
          "sex",
          "gender_identity",
          "activity_level",
          "goal",
          "dietary_notes",
          "injury_notes",
          "medication_notes",
          "measurement_system"
        ])

      with {:ok, client} <- Clients.update_my_profile(scope, attrs) do
        render(conn, :show, client: client)
      end
    end
  end
end

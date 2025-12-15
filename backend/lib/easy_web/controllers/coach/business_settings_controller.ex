defmodule EasyWeb.Coach.BusinessSettingsController do
  @moduledoc """
  Controller for managing business settings.

  Handles public join configuration and branding settings.
  """
  use EasyWeb, :controller

  alias Easy.Organizations
  alias Easy.Auth.Scope

  @doc """
  GET /api/organization/settings

  Returns the current business settings.
  """
  def show(conn, _params) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    case Organizations.get_business_settings(scope.business_id) do
      {:ok, settings} ->
        render(conn, :show, settings: settings)

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  PATCH /api/organization/settings

  Updates all business settings.
  """
  def update(conn, %{"settings" => settings_params}) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    case Organizations.update_business_settings(scope.business_id, settings_params) do
      {:ok, settings} ->
        render(conn, :show, settings: settings)

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  PATCH /api/organization/settings/public-join

  Updates only public join settings.
  """
  def update_public_join(conn, %{"settings" => settings_params}) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    case Organizations.update_public_join_settings(scope.business_id, settings_params) do
      {:ok, settings} ->
        render(conn, :show, settings: settings)

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  PATCH /api/organization/settings/branding

  Updates only branding settings.
  """
  def update_branding(conn, %{"settings" => settings_params}) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    case Organizations.update_branding_settings(scope.business_id, settings_params) do
      {:ok, settings} ->
        render(conn, :show, settings: settings)

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  POST /api/organization/settings/regenerate-code

  Regenerates the public join code.
  """
  def regenerate_code(conn, _params) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    case Organizations.regenerate_join_code(scope.business_id) do
      {:ok, settings} ->
        render(conn, :show, settings: settings)

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  POST /api/organization/settings/enable-public-join

  Enables public join for the business.
  """
  def enable_public_join(conn, _params) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    case Organizations.enable_public_join(scope.business_id) do
      {:ok, settings} ->
        render(conn, :show, settings: settings)

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  POST /api/organization/settings/disable-public-join

  Disables public join for the business.
  """
  def disable_public_join(conn, _params) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    case Organizations.disable_public_join(scope.business_id) do
      {:ok, settings} ->
        render(conn, :show, settings: settings)

      {:error, reason} ->
        {:error, reason}
    end
  end
end

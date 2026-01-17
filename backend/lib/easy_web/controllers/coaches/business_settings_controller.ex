defmodule EasyWeb.Coaches.BusinessSettingsController do
  use EasyWeb, :controller

  alias Easy.Organizations
  alias Easy.Auth.Scope

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

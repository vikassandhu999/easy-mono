defmodule EasyWeb.IngredientController do
  use EasyWeb, :controller

  alias Easy.Nutrition
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :update, :delete]

  def index(conn, params) do
    case extract_business_id(conn) do
      {:ok, business_id} ->
        {ingredients, meta} = Nutrition.list_ingredients(business_id, params)

        conn
        |> put_status(:ok)
        |> render(:index, %{ingredients: ingredients, meta: meta})

      {:error, reason} ->
        send_context_error(conn, reason)
    end
  end

  def create(conn, _params) do
    case extract_business_and_coach(conn) do
      {:ok, business_id, coach_id} ->
        case Nutrition.create_ingredient(business_id, coach_id, conn.body_params) do
          {:ok, ingredient} ->
            conn
            |> put_status(:created)
            |> render(:create, %{ingredient: ingredient})

          {:error, changeset} ->
            FallbackController.call(conn, {:error, changeset})
        end

      {:error, reason} ->
        send_context_error(conn, reason)
    end
  end

  def show(conn, _params) do
    conn
    |> put_status(:ok)
    |> render(:show, %{ingredient: conn.assigns.ingredient})
  end

  def update(conn, _params) do
    case Nutrition.update_ingredient(conn.assigns.ingredient, conn.body_params) do
      {:ok, ingredient} ->
        conn
        |> put_status(:ok)
        |> render(:update, %{ingredient: ingredient})

      {:error, changeset} ->
        FallbackController.call(conn, {:error, changeset})
    end
  end

  def delete(conn, _params) do
    case Nutrition.delete_ingredient(conn.assigns.ingredient) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, changeset} ->
        FallbackController.call(conn, {:error, changeset})
    end
  end

  defp authorize_resource(conn, _opts) do
    case {extract_business_id(conn), conn.params} do
      {{:ok, business_id}, %{"id" => id}} ->
        case Nutrition.fetch_ingredient(business_id, id) do
          {:ok, ingredient} ->
            assign(conn, :ingredient, ingredient)

          {:error, :not_found} ->
            FallbackController.not_found_response(conn, "Ingredient not found.")
        end

      {{:error, reason}, _} ->
        send_context_error(conn, reason)

      _ ->
        FallbackController.not_found_response(conn, "Ingredient not found.")
    end
  end

  defp extract_business_id(conn) do
    case conn.assigns[:token_claims] do
      %{"business_id" => business_id} when is_binary(business_id) ->
        {:ok, business_id}

      _ ->
        {:error, :missing_business}
    end
  end

  defp extract_business_and_coach(conn) do
    case conn.assigns[:token_claims] do
      %{"business_id" => business_id, "coach_id" => coach_id}
      when is_binary(business_id) and is_binary(coach_id) ->
        {:ok, business_id, coach_id}

      %{"business_id" => _business_id} ->
        {:error, :missing_coach}

      _ ->
        {:error, :missing_business}
    end
  end

  defp send_context_error(conn, :missing_business) do
    FallbackController.send_unauthorized_response(
      conn,
      "Business context is required to perform this action."
    )
  end

  defp send_context_error(conn, :missing_coach) do
    FallbackController.send_unauthorized_response(
      conn,
      "Coach context is required to perform this action."
    )
  end

  defp send_context_error(conn, _reason) do
    FallbackController.send_unauthorized_response(
      conn,
      "Insufficient permissions to perform this action."
    )
  end
end

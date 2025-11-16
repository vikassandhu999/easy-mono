defmodule Easy.Organizations do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Organizations.Coach
  alias Easy.Auth.Scope
  alias Easy.QueryHelpers
  alias EasyWeb.Authorization

  def list_coaches(%Scope{} = scope) do
    if Scope.has_business_context?(scope) do
      coaches =
        from(c in Coach, order_by: [desc: c.inserted_at])
        |> QueryHelpers.scope_to_business(scope)
        |> Repo.all()

      {:ok, coaches}
    else
      {:error, :forbidden}
    end
  end

  def get_coach(%Scope{} = scope, coach_id) when is_binary(coach_id) do
    case Repo.get(Coach, coach_id) do
      nil ->
        {:error, :not_found}

      coach ->
        # Check if scope has access to this coach
        # Access granted if: user owns the coach profile OR coach is in scope's business
        cond do
          scope.coach_id == coach_id ->
            {:ok, coach}

          scope.business_id == coach.business_id ->
            {:ok, coach}

          true ->
            {:error, :forbidden}
        end
    end
  end

  def create_coach(%Scope{business_id: business_id} = _scope, user_id, attrs)
      when not is_nil(business_id) and is_binary(user_id) do
    attrs_with_ids =
      attrs
      |> Map.put(:user_id, user_id)
      |> Map.put(:business_id, business_id)

    %Coach{}
    |> Coach.create_changeset(attrs_with_ids)
    |> Repo.insert()
  end

  def create_coach(%Scope{}, _user_id, _attrs), do: {:error, :forbidden}

  def update_coach(%Scope{} = scope, coach_id, attrs) when is_binary(coach_id) do
    with {:ok, coach} <- get_coach(scope, coach_id),
         :ok <- Authorization.authorize_coach_access(scope, coach_id) do
      coach
      |> Coach.update_changeset(attrs)
      |> Repo.update()
    end
  end

  def delete_coach(%Scope{} = scope, coach_id) when is_binary(coach_id) do
    with {:ok, coach} <- get_coach(scope, coach_id),
         :ok <- Authorization.authorize_business_owner(scope, coach.business_id) do
      Repo.delete(coach)
    end
  end
end

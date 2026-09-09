defmodule Easy.Orgs do
  import Ecto.Query

  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.Identity.Users
  alias Easy.Orgs.Business
  alias Easy.Repo

  # pre-auth onboarding: no ctx yet — runs during signup before a tenant ctx is established
  @spec create_business(Ctx.t(), map()) ::
          {:ok, Business.t()} | {:error, :user_not_found | Ecto.Changeset.t()}
  def create_business(%Ctx{} = ctx, attrs) do
    with {:ok, user} <- Users.get_by_id(ctx.user_id) do
      Repo.transact(fn -> create_business_transaction(user, attrs) end)
    end
  end

  defp create_business_transaction(user, attrs) do
    with {:ok, business} <- user.id |> Business.insert_changeset(attrs) |> Repo.insert(),
         {:ok, _} <- Coaches.create(user, business) do
      {:ok, %{business | owner: user}}
    end
  end

  @spec get_business(Ctx.t()) :: {:ok, Business.t()} | {:error, :not_found}
  def get_business(%Ctx{} = ctx) do
    Business
    |> Repo.get(ctx.business_id)
    |> ok_or_not_found()
  end

  @spec update_business(Ctx.t(), map()) :: {:ok, Business.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_business(%Ctx{} = ctx, attrs) when is_map(attrs) do
    with {:ok, business} <- get_business(ctx) do
      business
      |> Business.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec update_dashboard_setup(Ctx.t(), map()) ::
          {:ok, Business.t()} | {:error, :not_found | :not_owner | Ecto.Changeset.t()}
  def update_dashboard_setup(%Ctx{owner?: false}, _attrs), do: {:error, :not_owner}

  def update_dashboard_setup(%Ctx{} = ctx, attrs) do
    with {:ok, attrs} <- Business.dashboard_setup_input(attrs) do
      Repo.transact(fn -> update_locked_dashboard_setup(ctx.business_id, attrs) end)
    end
  end

  defp update_locked_dashboard_setup(business_id, attrs) do
    case lock_business(business_id) do
      nil -> {:error, :not_found}
      business -> persist_dashboard_setup(business, attrs)
    end
  end

  defp lock_business(business_id) do
    Business
    |> where([business], business.id == ^business_id)
    |> lock("FOR UPDATE")
    |> Repo.one()
  end

  defp persist_dashboard_setup(business, attrs) do
    business
    |> Business.update_changeset(:dashboard_setup, DateTime.utc_now(:second), attrs)
    |> Repo.update()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}
end

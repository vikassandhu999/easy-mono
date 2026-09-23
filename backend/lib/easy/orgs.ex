defmodule Easy.Orgs do
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

  @spec update_business(Ctx.t(), map()) :: {:ok, Business.t()} | {:error, :not_owner | :not_found | Ecto.Changeset.t()}
  def update_business(%Ctx{owner?: false}, _attrs), do: {:error, :not_owner}

  def update_business(%Ctx{} = ctx, attrs) when is_map(attrs) do
    with {:ok, business} <- get_business(ctx) do
      business
      |> Business.update_changeset(attrs)
      |> Repo.update()
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}
end

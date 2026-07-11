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
      Repo.transaction(fn -> create_business_transaction(user, attrs) end)
    end
  end

  defp create_business_transaction(user, attrs) do
    with {:ok, business} <- user |> Business.insert_changeset(attrs) |> Repo.insert(),
         {:ok, _} <- Coaches.create(user, business) do
      business
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  @spec get_business(Ctx.t()) :: {:ok, Business.t()} | {:error, :not_found}
  def get_business(%Ctx{} = ctx) do
    ctx.business_id
    |> then(&Repo.get(Business, &1))
    |> ok_or_not_found()
  end

  @spec update_business(Ctx.t(), map()) :: {:ok, Business.t()} | {:error, any()}
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

  def update_dashboard_setup(
        %Ctx{} = ctx,
        %{dashboard_setup_hidden_reason: _reason} = attrs
      ) do
    Repo.transaction(fn ->
      case lock_business(ctx.business_id) do
        nil -> Repo.rollback(:not_found)
        business -> persist_dashboard_setup(business, attrs)
      end
    end)
  end

  def update_dashboard_setup(%Ctx{}, _attrs) do
    changeset =
      %Business{}
      |> Ecto.Changeset.change()
      |> Ecto.Changeset.add_error(
        :dashboard_setup_hidden_reason,
        "must be present"
      )

    {:error, changeset}
  end

  defp lock_business(business_id) do
    Business
    |> where([business], business.id == ^business_id)
    |> lock("FOR UPDATE")
    |> Repo.one()
  end

  defp persist_dashboard_setup(
         %Business{dashboard_setup_hidden_reason: :completed} = business,
         _attrs
       ),
       do: business

  defp persist_dashboard_setup(business, attrs) do
    changeset = Business.update_changeset(business, attrs)
    reason = Ecto.Changeset.get_field(changeset, :dashboard_setup_hidden_reason)

    changeset
    |> Ecto.Changeset.put_change(
      :dashboard_setup_hidden_at,
      dashboard_setup_hidden_at(reason)
    )
    |> Repo.update()
    |> case do
      {:ok, updated_business} -> updated_business
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp dashboard_setup_hidden_at(nil), do: nil
  defp dashboard_setup_hidden_at(_reason), do: DateTime.utc_now(:second)

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}
end

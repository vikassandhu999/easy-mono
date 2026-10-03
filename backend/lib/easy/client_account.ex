defmodule Easy.ClientAccount do
  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.Orgs
  alias Easy.Repo

  require Ecto.Query

  @type account_profile :: %{
          client: Client.t(),
          coach: Orgs.Coach.t() | nil,
          unit_system: :metric | :imperial,
          timezone: String.t(),
          local_date: Date.t()
        }

  @type calendar :: %{timezone: String.t(), local_date: Date.t()}

  @spec get_accepted_client(Ctx.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_accepted_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Ecto.Query.where([client], not is_nil(client.user_id))
    |> Ecto.Query.preload([:business, :terms])
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec get_client_account(Ctx.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_client_account(%Ctx{} = ctx) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      Client
      |> Client.for_business(ctx.business_id)
      |> Ecto.Query.preload([:business, :terms])
      |> Repo.get(client_id)
      |> ok_or_not_found()
    end
  end

  @spec get_client_calendar(Ctx.t(), DateTime.t()) :: {:ok, calendar()} | {:error, :not_found}
  def get_client_calendar(%Ctx{} = ctx, now \\ DateTime.utc_now()) do
    with {:ok, client} <- get_client_account(ctx) do
      {:ok, client_calendar(client, now)}
    end
  end

  @spec get_client_account_profile(Ctx.t()) ::
          {:ok, account_profile()}
          | {:error, :not_found}
  def get_client_account_profile(%Ctx{} = ctx) do
    with {:ok, client} <- get_client_account(ctx) do
      load_profile(ctx, client)
    end
  end

  @spec update_client_account_profile(Ctx.t(), map()) ::
          {:ok, account_profile()}
          | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_account_profile(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client_account(ctx),
         {:ok, updated} <- client |> Client.self_update_changeset(attrs) |> Repo.update() do
      load_profile(ctx, updated)
    end
  end

  @spec record_client_activity(Ctx.t(), DateTime.t()) :: {:ok, :recorded} | {:error, :not_found}
  def record_client_activity(%Ctx{} = ctx, occurred_at) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      Client
      |> Client.last_active_stamp(ctx.business_id, client_id, occurred_at)
      |> Repo.update_all([])
      |> case do
        {1, nil} -> {:ok, :recorded}
        {0, nil} -> {:error, :not_found}
      end
    end
  end

  defp load_profile(ctx, client) do
    coach = get_assigned_coach(ctx, client.coach_id)

    profile = %{client: client, coach: coach, unit_system: client.unit_system}
    {:ok, Map.merge(profile, client_calendar(client, DateTime.utc_now()))}
  end

  defp client_calendar(client, now) do
    %{timezone: Client.applied_timezone(client), local_date: Client.local_date(client, now)}
  end

  defp get_assigned_coach(_ctx, nil), do: nil

  defp get_assigned_coach(ctx, coach_id) do
    case Coaches.get_coach(ctx, coach_id) do
      {:ok, coach} -> coach
      {:error, :not_found} -> nil
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end

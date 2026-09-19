defmodule Easy.ClientAccount do
  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.Orgs
  alias Easy.Repo

  @type account_profile :: %{
          client: Client.t(),
          coach: Orgs.Coach.t() | nil,
          default_weight_unit: :kg | :lbs,
          timezone: String.t(),
          local_date: Date.t()
        }

  @type calendar :: %{timezone: String.t(), local_date: Date.t()}

  @spec get_active_client(Ctx.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_active_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Client.active()
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec get_client_account(Ctx.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_client_account(%Ctx{} = ctx) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      Client
      |> Client.for_business(ctx.business_id)
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

  @spec update_client_required_services(Ctx.t(), Client.t(), [Client.service()] | nil) ::
          {:ok, Client.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_required_services(
        %Ctx{business_id: business_id, client_id: client_id},
        %Client{business_id: business_id, id: client_id} = client,
        services
      )
      when is_binary(client_id) do
    case services do
      nil -> {:ok, client}
      services -> client |> Client.update_changeset(Date.utc_today(), %{required_services: services}) |> Repo.update()
    end
  end

  def update_client_required_services(%Ctx{}, %Client{}, _services), do: {:error, :not_found}

  defp load_profile(ctx, client) do
    with {:ok, business} <- Orgs.get_business(ctx) do
      coach = get_assigned_coach(ctx, client.assigned_coach_id)

      profile = %{client: client, coach: coach, default_weight_unit: business.default_weight_unit}
      {:ok, Map.merge(profile, client_calendar(client, DateTime.utc_now()))}
    end
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

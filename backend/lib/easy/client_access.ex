defmodule Easy.ClientAccess do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo

  @spec authorize_client(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def authorize_client(%Ctx{} = ctx, client_id) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> Repo.get(client_id)
    |> case do
      nil -> {:error, :not_found}
      client -> {:ok, client}
    end
  end

  @spec authorize_client_id(Ctx.t(), String.t() | nil) :: :ok | {:error, :not_found}
  def authorize_client_id(_ctx, nil), do: :ok

  def authorize_client_id(%Ctx{} = ctx, client_id) do
    with {:ok, _client} <- authorize_client(ctx, client_id), do: :ok
  end

  @spec advance_stage_to_coaching(Ctx.t(), String.t()) :: :ok
  def advance_stage_to_coaching(%Ctx{} = ctx, client_id) do
    Client
    |> Client.for_business(ctx.business_id)
    |> where([client], client.id == ^client_id and client.stage == :onboarding)
    |> Repo.update_all(set: [stage: :coaching, updated_at: DateTime.utc_now(:second)])

    :ok
  end
end

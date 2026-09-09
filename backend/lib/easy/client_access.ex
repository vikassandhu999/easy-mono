defmodule Easy.ClientAccess do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo

  @spec authorize_client(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def authorize_client(%Ctx{} = ctx, client_id) do
    ctx
    |> visible_clients()
    |> Repo.get(client_id)
    |> case do
      nil -> {:error, :not_found}
      client -> {:ok, client}
    end
  end

  @spec authorize_client_id(Ctx.t(), String.t() | nil) :: :ok | {:error, :not_found}
  def authorize_client_id(%Ctx{}, nil), do: {:error, :not_found}

  def authorize_client_id(%Ctx{} = ctx, client_id) do
    query = ctx |> visible_clients() |> where([client], client.id == ^client_id)
    if Repo.exists?(query), do: :ok, else: {:error, :not_found}
  end

  @spec authorize_client_ids(Ctx.t(), [String.t()]) :: :ok | {:error, :not_found}
  def authorize_client_ids(%Ctx{}, []), do: :ok

  def authorize_client_ids(%Ctx{} = ctx, client_ids) do
    client_ids = Enum.uniq(client_ids)

    visible_count =
      ctx
      |> visible_clients()
      |> where([client], client.id in ^client_ids)
      |> Repo.aggregate(:count, :id)

    if visible_count == length(client_ids), do: :ok, else: {:error, :not_found}
  end

  defp visible_clients(ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
  end
end

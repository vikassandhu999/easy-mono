defmodule Easy.Clients do
  alias Easy.Orgs.Coaches
  alias Easy.Identity.Token
  alias Easy.Clients.Client
  alias Easy.Repo

  import Ecto.Query

  @type search_opts :: %{
          optional(:search) => String.t(),
          optional(:offset) => pos_integer(),
          optional(:limit) => pos_integer(),
          optional(:status) => String.t()
        }

  @spec invite(Token.claims(), map()) :: {:ok, Client.t()} | {:error, any()}
  def invite(claims, invite_attrs) when is_map(claims) do
    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, client} <- create_invitation(coach, invite_attrs),
         :ok <- send_invitation_email(client, coach) do
      {:ok, client}
    end
  end

  @spec get(Token.claims(), String.t()) :: {:ok, Client.t()} | {:error, any()}
  def get(claims, client_id) when is_map(claims) do
    get_client(client_id, claims.business_id)
  end

  @spec list_clients(Token.claims(), search_opts()) ::
          {:ok, non_neg_integer(), [Client.t()]} | {:error, any()}
  def list_clients(claims, opts \\ %{}) when is_map(claims) do
    search_term = Map.get(opts, :search, "")
    offset = Map.get(opts, :offset, 0) |> max(0)
    limit = Map.get(opts, :limit, 20) |> min(100) |> max(1)
    status = Map.get(opts, :status, nil) |> Client.to_status_atom()

    q =
      from c in Client,
        where: c.business_id == ^claims.business_id

    q =
      if search_term != "" do
        from c in q,
          where:
            ilike(c.first_name, ^"%#{search_term}%") or
              ilike(c.last_name, ^"%#{search_term}%") or
              ilike(c.email, ^"%#{search_term}%")
      else
        q
      end

    q =
      if status != nil do
        from c in q,
          where: c.status == ^status
      else
        q
      end

    total_count = Repo.aggregate(q, :count, :id)

    clients =
      Repo.all(from c in q, order_by: [desc: c.inserted_at], limit: ^limit, offset: ^offset)

    {:ok, total_count, clients}
  end

  def get_client(id) do
    Repo.get(Client, id)
    |> case do
      nil -> {:error, Easy.Error.not_found("Client not found")}
      client -> {:ok, client}
    end
  end

  def get_client(id, business_id) do
    Client
    |> where(id: ^id, business_id: ^business_id)
    |> Repo.one()
    |> case do
      nil -> {:error, Easy.Error.not_found("Client not found")}
      client -> {:ok, client}
    end
  end

  defp create_invitation(coach, invite_attrs) do
    coach
    |> Client.invite_changeset(invite_attrs)
    |> Repo.insert()
  end

  defp send_invitation_email(client, coach) do
    business = Repo.preload(coach, :business).business

    email =
      Easy.Emails.client_invitation_email(
        client.email,
        client.invitation_token,
        coach.name || "Coach",
        business.name
      )

    Easy.MailerDelivery.deliver_async(email,
      metadata: %{email: client.email}
    )
  end
end

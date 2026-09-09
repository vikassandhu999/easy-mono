defmodule Easy.Prospects do
  import Ecto.Query

  alias Easy.ClientInvitations
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Landing.Prospect
  alias Easy.Repo

  @type enrollment :: %{prospect: Prospect.t(), client: Client.t(), already_enrolled: boolean()}

  @spec list_prospects(Ctx.t(), keyword()) ::
          {:ok, %{prospects: [Prospect.t()], count: non_neg_integer(), summary: Prospect.status_counts()}}
  def list_prospects(%Ctx{} = ctx, opts \\ []) do
    status = Keyword.get(opts, :status)

    base = Prospect |> Prospect.for_business(ctx.business_id) |> Prospect.for_status(status)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       summary: Prospect |> Prospect.for_business(ctx.business_id) |> Prospect.select_status_counts() |> Repo.one(),
       prospects:
         base
         |> Prospect.newest()
         |> Easy.Utils.paginate(opts)
         |> Prospect.include_details()
         |> Repo.all()
     }}
  end

  @spec get_prospect(Ctx.t(), String.t()) :: {:ok, Prospect.t()} | {:error, :not_found}
  def get_prospect(%Ctx{} = ctx, id) do
    Prospect
    |> Prospect.for_business(ctx.business_id)
    |> Prospect.include_details()
    |> Repo.get(id)
    |> ok_or_not_found()
  end

  @spec update_prospect(Ctx.t(), String.t(), map()) ::
          {:ok, Prospect.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_prospect(%Ctx{} = ctx, id, attrs) do
    with {:ok, prospect} <- get_prospect(ctx, id) do
      prospect |> Prospect.update_changeset(attrs) |> Repo.update()
    end
  end

  # Enroll: reuse the invite flow to create a pending Client, link it, mark the prospect won.
  # Already-enrolled is a no-op that returns the linked Client.
  @spec enroll_prospect(Ctx.t(), String.t(), map()) ::
          {:ok, enrollment()} | {:error, ClientInvitations.error()}
  def enroll_prospect(%Ctx{} = ctx, id, attrs) do
    case Repo.transact(fn -> enroll_locked_prospect(ctx, id, attrs) end) do
      {:ok, %{already_enrolled: false, client: client} = enrollment} ->
        :ok = ClientInvitations.deliver(client)
        {:ok, enrollment}

      result ->
        result
    end
  end

  defp enroll_locked_prospect(ctx, id, attrs) do
    Prospect
    |> Prospect.for_business(ctx.business_id)
    |> lock("FOR UPDATE")
    |> Prospect.include_details()
    |> Repo.get(id)
    |> case do
      nil ->
        {:error, :not_found}

      %Prospect{client_id: nil} = prospect ->
        invite_and_link(ctx, prospect, attrs)

      prospect ->
        {:ok, %{prospect: prospect, client: prospect.client, already_enrolled: true}}
    end
  end

  defp invite_and_link(ctx, prospect, attrs) do
    with {:ok, client} <- ClientInvitations.create(ctx, Prospect.invitation_attrs(prospect, attrs)),
         {:ok, prospect} <- prospect |> Prospect.enroll_changeset(client.id) |> Repo.update() do
      {:ok, %{prospect: %{prospect | client: client}, client: client, already_enrolled: false}}
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end

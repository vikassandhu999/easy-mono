defmodule Easy.Prospects do
  import Ecto.Query

  alias Easy.ClientInvitations
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Landing.Prospect
  alias Easy.Repo
  alias Easy.Revision

  @type enrollment :: %{prospect: Prospect.t(), client: Client.t(), already_enrolled: boolean()}

  @spec list_prospects(Ctx.t(), keyword()) :: {:ok, map()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list_prospects(%Ctx{} = ctx, opts \\ []) do
    searched = Prospect |> Prospect.for_business(ctx.business_id) |> Prospect.search(Keyword.get(opts, :search))
    filtered = Prospect.for_status(searched, Keyword.get(opts, :status))

    with {:ok, page} <- prospect_page(filtered, opts) do
      {:ok, Map.put(page, :summary, searched |> Prospect.select_status_counts() |> Repo.one())}
    end
  end

  defp prospect_page(base, opts) do
    case Keyword.get(opts, :cursor) do
      nil ->
        rows = base |> Prospect.newest() |> Easy.Utils.paginate(opts) |> Prospect.include_details() |> Repo.all()
        {:ok, %{prospects: rows, count: Repo.aggregate(base, :count, :id), next_cursor: nil}}

      cursor ->
        with :ok <- cursor_options(opts),
             limit = CursorPage.limit(opts),
             {:ok, query} <- CursorPage.query(base, cursor, limit) do
          rows = query |> Prospect.include_details() |> Repo.all()
          page = CursorPage.finish(rows, limit, Repo.aggregate(base, :count, :id))
          {:ok, %{prospects: page.data, count: page.count, next_cursor: page.next_cursor}}
        end
    end
  end

  defp cursor_options(opts) do
    if Keyword.get(opts, :offset, 0) == 0, do: :ok, else: {:error, :cursor_incompatible}
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
    with {:ok, expected} <- Prospect.expected_revision(attrs) do
      query = Prospect.for_business(ctx.business_id) |> Prospect.include_details()

      Revision.locked(query, id, expected, fn prospect ->
        prospect |> Prospect.update_changeset(attrs) |> Repo.update()
      end)
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
        with {:ok, expected} <- Prospect.expected_revision(attrs),
             :ok <- Revision.check(prospect, expected) do
          invite_and_link(ctx, prospect, attrs)
        end

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

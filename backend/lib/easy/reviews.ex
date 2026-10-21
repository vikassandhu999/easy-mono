defmodule Easy.Reviews do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Reviews.Reply
  alias Easy.Reviews.Review
  alias Easy.Reviews.Screen
  alias Easy.Reviews.Snapshot
  import Ecto.Query

  @spec screen_for_client(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def screen_for_client(ctx, client_id, opts \\ []), do: Repo.snapshot(fn -> Screen.read(ctx, client_id, opts) end)

  @spec create_for_client(Ctx.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def create_for_client(ctx, client_id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, result} <- Repo.transact(fn -> create_locked(ctx, client_id, attrs) end) do
      Reply.notify(ctx, result.event)
      {:ok, present(ctx, result.review)}
    end
  end

  defp create_locked(ctx, client_id, attrs) do
    token = Map.get(attrs, :snapshot_token, Map.get(attrs, "snapshot_token"))
    key = hash(token)
    fields = Map.new(attrs, fn {k, v} -> {to_string(k), v} end) |> Map.take(["assessment", "private_note", "reply"])
    fingerprint = hash(fields)

    with {:ok, client} <- locked_client(ctx, client_id) do
      existing = Repo.one(from(r in Review.for_client(ctx.business_id, client_id), where: r.snapshot_key == ^key))

      case existing do
        %{request_fingerprint: ^fingerprint} = review -> {:ok, %{review: review, event: nil}}
        nil -> insert_review(ctx, client, token, key, fingerprint, attrs)
        _ -> {:error, :conflict}
      end
    end
  end

  defp insert_review(ctx, client, token, key, fingerprint, attrs) do
    with {:ok, snapshot} <- Snapshot.verify(ctx, client, token),
         changeset = Review.insert_changeset(ctx.business_id, ctx.coach_id, client.id, Map.put(snapshot, :reviewed_at, DateTime.utc_now(:microsecond)), attrs),
         {:ok, review} <-
           changeset |> Ecto.Changeset.change(snapshot_key: key, request_fingerprint: fingerprint) |> Repo.insert(),
         {:ok, {review, event}} <- Reply.save(ctx, review, attrs) do
      {:ok, %{review: review, event: event}}
    end
  end

  defp hash(value), do: :crypto.hash(:sha256, :erlang.term_to_binary(value)) |> Base.encode16()

  @spec update_for_client(Ctx.t(), String.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def update_for_client(ctx, client_id, id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, result} <- Repo.transact(fn -> update_locked(ctx, client_id, id, attrs) end) do
      Reply.notify(ctx, result.event)
      {:ok, present(ctx, result.review)}
    end
  end

  defp update_locked(ctx, client_id, id, attrs) do
    with {:ok, _client} <- locked_client(ctx, client_id),
         %Review{} = row <- Review.for_client(ctx.business_id, client_id) |> lock("FOR UPDATE") |> Repo.get(id),
         {:ok, row} <- row |> Review.update_changeset(attrs) |> Repo.update(),
         {:ok, {row, event}} <- Reply.save(ctx, row, attrs) do
      {:ok, %{review: row, event: event}}
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  defp locked_client(ctx, client_id) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> where([c], c.id == ^client_id)
    |> lock("FOR UPDATE")
    |> Repo.one()

    Clients.get_client_with_preloads(ctx, client_id)
  end

  @spec history_for_client(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def history_for_client(ctx, client_id, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, _} <- Clients.get_client_with_preloads(ctx, client_id),
         do: Easy.Trackers.page(Review.for_client(ctx.business_id, client_id), opts, &present(ctx, &1))
  end

  @spec present(Ctx.t(), Review.t()) :: map()
  def present(ctx, row) do
    row = Repo.preload(row, :coach)

    row
    |> Map.take([:id, :client_id, :coach_id, :reviewed_at, :reviewed_through_seq, :seen_at, :assessment, :private_note])
    |> Map.put(:coach_name, Coach.full_name(row.coach))
    |> Map.put(:reply, Reply.load(ctx, row))
  end
end

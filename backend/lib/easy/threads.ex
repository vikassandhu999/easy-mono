defmodule Easy.Threads do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Threads.Thread
  alias Easy.Threads.ThreadMessage
  alias Easy.Utils

  import Ecto.Query

  @thread_modules ~w(nutrition training fitness profile general)
  @thread_statuses ~w(open resolved archived)
  @thread_priorities ~w(normal attention)

  @spec list_threads(Ctx.t(), keyword()) :: {:ok, %{count: non_neg_integer(), threads: [Thread.t()]}}
  def list_threads(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

    base =
      Thread
      |> Thread.for_business(ctx.business_id)
      |> maybe_for_client(ctx.business_id, Keyword.get(opts, :client_id))
      |> Thread.for_module(Utils.safe_to_atom(Keyword.get(opts, :module), @thread_modules))
      |> Thread.for_status(Utils.safe_to_atom(Keyword.get(opts, :status), @thread_statuses))
      |> Thread.for_priority(Utils.safe_to_atom(Keyword.get(opts, :priority), @thread_priorities))

    count = Repo.aggregate(base, :count)

    threads =
      base
      |> Thread.recent()
      |> offset(^offset)
      |> limit(^limit)
      |> Repo.all()

    {:ok, %{count: count, threads: threads}}
  end

  @spec list_threads_for_client(Ctx.t(), String.t()) ::
          {:ok, %{count: non_neg_integer(), threads: [Thread.t()]}} | {:error, :not_found}
  def list_threads_for_client(%Ctx{} = ctx, client_id) do
    with {:ok, _client} <- Clients.get_client(ctx, client_id) do
      list_threads(ctx, client_id: client_id)
    end
  end

  @spec list_client_threads(Ctx.t()) ::
          {:ok, %{count: non_neg_integer(), threads: [Thread.t()]}} | {:error, :not_found}
  def list_client_threads(%Ctx{} = ctx) do
    with {:ok, client} <- get_client_account(ctx) do
      list_threads(ctx, client_id: client.id)
    end
  end

  @spec get_thread(Ctx.t(), String.t()) :: {:ok, Thread.t()} | {:error, :not_found}
  def get_thread(%Ctx{} = ctx, thread_id) do
    Thread
    |> Thread.for_business(ctx.business_id)
    |> Thread.include_messages()
    |> Repo.get(thread_id)
    |> ok_or_not_found()
  end

  @spec get_client_thread(Ctx.t(), String.t()) :: {:ok, Thread.t()} | {:error, :not_found}
  def get_client_thread(%Ctx{} = ctx, thread_id) do
    with {:ok, client} <- get_client_account(ctx) do
      Thread
      |> Thread.for_client(ctx.business_id, client.id)
      |> Thread.include_messages()
      |> Repo.get(thread_id)
      |> ok_or_not_found()
    end
  end

  @spec create_thread_for_client(Ctx.t(), String.t(), map()) ::
          {:ok, Thread.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_thread_for_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, coach} <- get_coach(ctx.business_id, ctx.user_id),
         {:ok, client} <- Clients.get_client(ctx, client_id) do
      ctx.business_id
      |> Thread.insert_changeset(client.id, %{type: "coach", id: coach.id}, attrs)
      |> Repo.insert()
    end
  end

  @spec create_client_thread(Ctx.t(), map()) ::
          {:ok, Thread.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_client_thread(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client_account(ctx) do
      ctx.business_id
      |> Thread.insert_changeset(client.id, %{type: "client", id: client.id}, attrs)
      |> Repo.insert()
    end
  end

  @spec update_thread(Ctx.t(), String.t(), map()) ::
          {:ok, Thread.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_thread(%Ctx{} = ctx, thread_id, attrs) do
    with {:ok, thread} <- get_thread_bare(ctx.business_id, thread_id) do
      thread
      |> Thread.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec add_message(Ctx.t(), String.t(), map()) ::
          {:ok, ThreadMessage.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def add_message(%Ctx{} = ctx, thread_id, attrs) do
    with {:ok, coach} <- get_coach(ctx.business_id, ctx.user_id),
         {:ok, thread} <- get_thread_bare(ctx.business_id, thread_id) do
      add_message_to_thread(thread, %{type: "coach", id: coach.id}, attrs)
    end
  end

  @spec add_client_message(Ctx.t(), String.t(), map()) ::
          {:ok, ThreadMessage.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def add_client_message(%Ctx{} = ctx, thread_id, attrs) do
    with {:ok, client} <- get_client_account(ctx),
         {:ok, thread} <- get_client_thread_bare(ctx.business_id, client.id, thread_id) do
      add_message_to_thread(thread, %{type: "client", id: client.id}, attrs)
    end
  end

  # Private (take plain ids extracted from ctx, mirroring Easy.Exercises)

  defp add_message_to_thread(thread, author, attrs) do
    Repo.transaction(fn ->
      case ThreadMessage.insert_changeset(thread.id, author, attrs) |> Repo.insert() do
        {:ok, message} ->
          preview = String.slice(message.body, 0, 200)

          Thread
          |> where([t], t.id == ^thread.id)
          |> Repo.update_all(
            set: [
              last_message_at: message.inserted_at,
              last_message_preview: preview,
              updated_at: message.inserted_at
            ]
          )

          message

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  defp maybe_for_client(query, _business_id, nil), do: query
  defp maybe_for_client(query, business_id, client_id), do: Thread.for_client(query, business_id, client_id)

  defp get_thread_bare(business_id, thread_id) do
    Thread
    |> Thread.for_business(business_id)
    |> Repo.get(thread_id)
    |> ok_or_not_found()
  end

  defp get_client_thread_bare(business_id, client_id, thread_id) do
    Thread
    |> Thread.for_client(business_id, client_id)
    |> Repo.get(thread_id)
    |> ok_or_not_found()
  end

  defp get_client_account(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_coach(business_id, user_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end

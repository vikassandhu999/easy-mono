defmodule Easy.Threads do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Threads.Thread
  alias Easy.Threads.ThreadMessage

  import Ecto.Query

  @spec list_threads(Ctx.t(), map()) :: {:ok, [Thread.t()]}
  def list_threads(%Ctx{} = ctx, filters \\ %{}) do
    threads =
      Thread
      |> Thread.for_business(ctx.business_id)
      |> maybe_for_client(Map.get(filters, "client_id"))
      |> Thread.with_module(Map.get(filters, "module"))
      |> Thread.with_status(Map.get(filters, "status"))
      |> Thread.with_priority(Map.get(filters, "priority"))
      |> Thread.recent()
      |> Repo.all()

    {:ok, threads}
  end

  @spec list_client_threads(Ctx.t(), String.t()) :: {:ok, [Thread.t()]} | {:error, :not_found}
  def list_client_threads(%Ctx{} = ctx, client_id) do
    with {:ok, _client} <- get_client(ctx.business_id, client_id) do
      list_threads(ctx, %{"client_id" => client_id})
    end
  end

  @spec list_threads_for_user(Ctx.t()) :: {:ok, [Thread.t()]} | {:error, :not_found}
  def list_threads_for_user(%Ctx{} = ctx) do
    with {:ok, client} <- Clients.get_client_for_user(ctx.business_id, ctx.user_id) do
      list_threads(ctx, %{"client_id" => client.id})
    end
  end

  @spec get_thread(Ctx.t(), String.t()) :: {:ok, Thread.t()} | {:error, :not_found}
  def get_thread(%Ctx{} = ctx, thread_id) do
    Thread
    |> Thread.for_business(ctx.business_id)
    |> Thread.with_messages()
    |> Repo.get(thread_id)
    |> ok_or_not_found()
  end

  @spec get_thread_for_user(Ctx.t(), String.t()) :: {:ok, Thread.t()} | {:error, :not_found}
  def get_thread_for_user(%Ctx{} = ctx, thread_id) do
    with {:ok, client} <- Clients.get_client_for_user(ctx.business_id, ctx.user_id) do
      Thread
      |> Thread.for_business(ctx.business_id)
      |> Thread.for_client(client.id)
      |> Thread.with_messages()
      |> Repo.get(thread_id)
      |> ok_or_not_found()
    end
  end

  @spec create_thread_as_coach(Ctx.t(), map()) ::
          {:ok, Thread.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_thread_as_coach(%Ctx{} = ctx, attrs) do
    client_id = Map.get(attrs, "client_id")

    with {:ok, coach} <- get_coach(ctx.business_id, ctx.user_id),
         {:ok, client} <- get_client(ctx.business_id, client_id) do
      ctx.business_id
      |> Thread.insert_changeset(client.id, %{type: "coach", id: coach.id}, attrs)
      |> Repo.insert()
    end
  end

  @spec create_thread_as_client(Ctx.t(), map()) ::
          {:ok, Thread.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_thread_as_client(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- Clients.get_client_for_user(ctx.business_id, ctx.user_id) do
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

  @spec add_message_as_coach(Ctx.t(), String.t(), map()) ::
          {:ok, ThreadMessage.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def add_message_as_coach(%Ctx{} = ctx, thread_id, attrs) do
    with {:ok, coach} <- get_coach(ctx.business_id, ctx.user_id),
         {:ok, thread} <- get_thread_bare(ctx.business_id, thread_id) do
      add_message(thread, %{type: "coach", id: coach.id}, attrs)
    end
  end

  @spec add_message_as_client(Ctx.t(), String.t(), map()) ::
          {:ok, ThreadMessage.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def add_message_as_client(%Ctx{} = ctx, thread_id, attrs) do
    with {:ok, client} <- Clients.get_client_for_user(ctx.business_id, ctx.user_id),
         {:ok, thread} <- get_client_thread_bare(ctx.business_id, client.id, thread_id) do
      add_message(thread, %{type: "client", id: client.id}, attrs)
    end
  end

  # Private (take plain ids extracted from ctx, mirroring Easy.Exercises)

  defp add_message(thread, author, attrs) do
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

  defp maybe_for_client(query, nil), do: query
  defp maybe_for_client(query, client_id), do: Thread.for_client(query, client_id)

  defp get_thread_bare(business_id, thread_id) do
    Thread
    |> Thread.for_business(business_id)
    |> Repo.get(thread_id)
    |> ok_or_not_found()
  end

  defp get_client_thread_bare(business_id, client_id, thread_id) do
    Thread
    |> Thread.for_business(business_id)
    |> Thread.for_client(client_id)
    |> Repo.get(thread_id)
    |> ok_or_not_found()
  end

  defp get_client(_business_id, nil), do: {:error, :not_found}

  defp get_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
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

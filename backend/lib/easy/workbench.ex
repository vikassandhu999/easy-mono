defmodule Easy.Workbench do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Workbench.QueueSnooze
  alias Easy.WorkbenchCheckInQueue
  alias Easy.WorkbenchExpiringQueue
  alias Easy.WorkbenchOnboardingQueue
  alias Easy.WorkbenchProgrammingQueue
  alias Easy.WorkbenchQuietQueue
  alias Easy.WorkbenchRepliesQueue

  @spec counts(Ctx.t()) ::
          {:ok,
           %{
             check_ins: non_neg_integer(),
             replies: non_neg_integer(),
             onboarding: non_neg_integer(),
             programming: non_neg_integer(),
             expiring: non_neg_integer(),
             new_clients: non_neg_integer(),
             quiet: non_neg_integer()
           }}
  def counts(%Ctx{} = ctx) do
    with {:ok, queues} <- Clients.count_workbench_queues(ctx) do
      check_ins = WorkbenchCheckInQueue.count(ctx)
      replies = WorkbenchRepliesQueue.count(ctx)
      onboarding = WorkbenchOnboardingQueue.count(ctx)

      {:ok,
       queues
       |> Map.put(:check_ins, check_ins)
       |> Map.put(:replies, replies)
       |> Map.put(:onboarding, onboarding)
       |> Map.put(:expiring, WorkbenchExpiringQueue.count(ctx))
       |> Map.put(:quiet, WorkbenchQuietQueue.count(ctx))}
    end
  end

  @spec list_onboarding_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}}
  def list_onboarding_queue(%Ctx{} = ctx, opts \\ []) do
    {:ok, WorkbenchOnboardingQueue.list(ctx, opts)}
  end

  @spec list_check_in_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}}
  def list_check_in_queue(%Ctx{} = ctx, opts \\ []) do
    {:ok, WorkbenchCheckInQueue.list(ctx, opts)}
  end

  @spec list_replies_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}}
  def list_replies_queue(%Ctx{} = ctx, opts \\ []) do
    {:ok, WorkbenchRepliesQueue.list(ctx, opts)}
  end

  @spec list_programming_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}} | {:error, :invalid_service}
  def list_programming_queue(%Ctx{} = ctx, opts \\ []) do
    WorkbenchProgrammingQueue.list(ctx, opts)
  end

  @spec list_expiring_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}}
  def list_expiring_queue(%Ctx{} = ctx, opts \\ []) do
    {:ok, WorkbenchExpiringQueue.list(ctx, opts)}
  end

  @spec list_quiet_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}}
  def list_quiet_queue(%Ctx{} = ctx, opts \\ []) do
    {:ok, WorkbenchQuietQueue.list(ctx, opts)}
  end

  @spec programming_counts(Ctx.t()) ::
          {:ok, %{all: non_neg_integer(), training: non_neg_integer(), nutrition: non_neg_integer()}}
  def programming_counts(%Ctx{} = ctx) do
    {:ok, WorkbenchProgrammingQueue.counts(ctx)}
  end

  @spec list_quiet_clients(Ctx.t(), keyword()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
  def list_quiet_clients(%Ctx{} = ctx, opts \\ []) do
    with {:ok, %{count: count, items: items}} <- list_quiet_queue(ctx, opts),
         ids = Enum.map(items, & &1.client.id),
         {:ok, result} <-
           Clients.list_clients_in_order(ctx, ids,
             limit: length(ids),
             include_plans: Keyword.get(opts, :include_plans, false)
           ) do
      {:ok, %{result | count: count}}
    end
  end

  @spec snooze_queue_for_client(Ctx.t(), String.t(), map()) ::
          {:ok, QueueSnooze.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def snooze_queue_for_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, client} <- Clients.authorize_client(ctx, client_id) do
      ctx.business_id
      |> QueueSnooze.insert_changeset(client.id, attrs)
      |> Repo.insert(
        on_conflict: {:replace, [:snoozed_until, :updated_at]},
        conflict_target: [:business_id, :client_id, :queue]
      )
    end
  end
end

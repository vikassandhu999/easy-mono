defmodule Easy.Workbench do
  alias Easy.ClientAccess
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
             programming: WorkbenchProgrammingQueue.counts(),
             expiring: non_neg_integer(),
             quiet: non_neg_integer()
           }}
  def counts(%Ctx{} = ctx) do
    {:ok,
     %{
       check_ins: WorkbenchCheckInQueue.count(ctx),
       replies: WorkbenchRepliesQueue.count(ctx),
       onboarding: WorkbenchOnboardingQueue.count(ctx),
       programming: WorkbenchProgrammingQueue.counts(ctx),
       expiring: WorkbenchExpiringQueue.count(ctx),
       quiet: WorkbenchQuietQueue.count(ctx)
     }}
  end

  @spec list_onboarding_queue(Ctx.t(), keyword()) ::
          {:ok, WorkbenchOnboardingQueue.page()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list_onboarding_queue(%Ctx{} = ctx, opts \\ []) do
    with {:ok, page} <- WorkbenchOnboardingQueue.list(ctx, opts), do: {:ok, preload_client_businesses(page)}
  end

  @spec list_check_in_queue(Ctx.t(), keyword()) ::
          {:ok, WorkbenchCheckInQueue.page()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list_check_in_queue(%Ctx{} = ctx, opts \\ []) do
    with {:ok, page} <- WorkbenchCheckInQueue.list(ctx, opts), do: {:ok, preload_client_businesses(page)}
  end

  @spec list_replies_queue(Ctx.t(), keyword()) ::
          {:ok, WorkbenchRepliesQueue.page()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list_replies_queue(%Ctx{} = ctx, opts \\ []) do
    WorkbenchRepliesQueue.list(ctx, opts)
  end

  @spec list_programming_queue(Ctx.t(), keyword()) ::
          {:ok, WorkbenchProgrammingQueue.page()} | {:error, :cursor_incompatible | :invalid_cursor | :invalid_service}
  def list_programming_queue(%Ctx{} = ctx, opts \\ []) do
    with {:ok, page} <- WorkbenchProgrammingQueue.list(ctx, opts) do
      {:ok, preload_client_businesses(page)}
    end
  end

  @spec list_expiring_queue(Ctx.t(), keyword()) ::
          {:ok, WorkbenchExpiringQueue.page()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list_expiring_queue(%Ctx{} = ctx, opts \\ []) do
    with {:ok, page} <- WorkbenchExpiringQueue.list(ctx, opts), do: {:ok, preload_client_businesses(page)}
  end

  @spec list_quiet_queue(Ctx.t(), keyword()) ::
          {:ok, WorkbenchQuietQueue.page()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list_quiet_queue(%Ctx{} = ctx, opts \\ []) do
    with {:ok, page} <- WorkbenchQuietQueue.list(ctx, opts), do: {:ok, preload_client_businesses(page)}
  end

  @spec snooze_queue_for_client(Ctx.t(), String.t(), map()) ::
          {:ok, QueueSnooze.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def snooze_queue_for_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id) do
      ctx.business_id
      |> QueueSnooze.insert_changeset(client.id, attrs)
      |> Repo.insert(
        on_conflict: {:replace, [:snoozed_until, :updated_at]},
        conflict_target: [:business_id, :client_id, :queue]
      )
    end
  end

  defp preload_client_businesses(%{items: items} = page) do
    clients = items |> Enum.map(& &1.client) |> Repo.preload(:business)
    %{page | items: Enum.zip_with(items, clients, fn item, client -> %{item | client: client} end)}
  end
end

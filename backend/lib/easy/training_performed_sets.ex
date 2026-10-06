defmodule Easy.Training.PerformedSets do
  import Ecto.Query
  import Ecto.Changeset
  alias Easy.{Ctx, RecordJournal, Repo, Revision, Units}
  alias Easy.Training.Execution
  alias Easy.Training.Library
  alias Easy.Training.TrainingPerformedSet
  alias Easy.Training.TrainingSession

  @spec create_client_performed_set(Ctx.t(), String.t(), map()) :: {:ok, TrainingPerformedSet.t()} | {:error, term()}
  def create_client_performed_set(%Ctx{} = ctx, session_id, attrs) do
    RecordJournal.write(ctx, &create_locked(ctx, &1, session_id, attrs)) |> present_result(ctx)
  end

  defp create_locked(ctx, client, session_id, attrs) do
    with {:ok, session} <- Execution.get_client_session(ctx, session_id),
         {:ok, attrs} <- Units.normalize(attrs),
         {:ok, attrs} <- validate_reference(ctx, session, attrs) do
      request = attrs["request_id"]

      row =
        if request,
          do:
            Repo.one(
              from(s in TrainingPerformedSet,
                where: s.session_id == ^session_id and s.request_id == ^request and s.business_id == ^ctx.business_id
              )
            )

      create_or_retry(ctx, client, session, row, attrs)
    end
  end

  defp create_or_retry(_ctx, _client, _session, %TrainingPerformedSet{} = row, attrs) do
    cs = TrainingPerformedSet.update_changeset(row, attrs)
    if cs.valid? and map_size(cs.changes) == 0, do: {:ok, row, []}, else: {:error, :conflict}
  end

  defp create_or_retry(ctx, _client, session, nil, attrs) do
    with :ok <- editable(session),
         :ok <- Revision.check(session, attrs["expected_revision"] || :any) do
      position =
        (Repo.aggregate(from(s in TrainingPerformedSet, where: s.session_id == ^session.id), :max, :position) || -1) + 1

      with {:ok, row} <-
             TrainingPerformedSet.insert_changeset(ctx.business_id, session.id, position, attrs) |> Repo.insert(),
           {:ok, updated} <- touch_session(session) do
        {:ok, row,
         [
           RecordJournal.change(session.id, "set", nil, row),
           RecordJournal.change(session.id, "session", session, updated)
         ]}
      end
    end
  end

  @spec update_client_performed_set(Ctx.t(), String.t(), map()) :: {:ok, TrainingPerformedSet.t()} | {:error, term()}
  def update_client_performed_set(%Ctx{} = ctx, id, attrs) do
    mutate(
      ctx,
      id,
      attrs,
      fn row, normalized -> row |> TrainingPerformedSet.update_changeset(normalized) |> Repo.update() end,
      "changed"
    )
    |> present_result(ctx)
  end

  @spec delete_client_performed_set(Ctx.t(), String.t(), map()) :: {:ok, TrainingPerformedSet.t()} | {:error, term()}
  def delete_client_performed_set(%Ctx{} = ctx, id, attrs) do
    mutate(
      ctx,
      id,
      attrs,
      fn row, _ -> row |> change(deleted_at: DateTime.utc_now(:second)) |> Repo.update() end,
      "removed"
    )
  end

  defp mutate(ctx, id, attrs, operation, action) do
    RecordJournal.write(ctx, &mutate_locked(ctx, &1, id, attrs, operation, action))
  end

  defp mutate_locked(ctx, client, id, attrs, operation, action) do
    row =
      Repo.one(
        from(s in TrainingPerformedSet,
          join: session in TrainingSession,
          on: session.id == s.session_id,
          where: s.id == ^id and s.business_id == ^ctx.business_id and session.client_id == ^client.id
        )
      )

    with true <- not is_nil(row) || {:error, :not_found},
         {:ok, session} <- Execution.get_client_session(ctx, row.session_id),
         :ok <- editable(session),
         :ok <- Revision.check(session, field(attrs, :expected_revision) || :any),
         true <- is_nil(row.deleted_at) || {:error, :conflict},
         {:ok, normalized} <- Units.normalize(attrs),
         {:ok, normalized} <- validate_reference(ctx, session, Map.merge(reference_attrs(row), normalized)),
         {:ok, updated} <- operation.(row, normalized),
         {:ok, touched} <- touch_session(session) do
      change = RecordJournal.change(session.id, "set", row, if(action == "removed", do: nil, else: updated))
      {:ok, updated, [change, RecordJournal.change(session.id, "session", session, touched)]}
    end
  end

  defp present_result({:ok, set}, ctx) do
    with {:ok, session} <- Execution.get_client_session(ctx, set.session_id),
         do: {:ok, Execution.set_name(set, session.prescription)}
  end

  defp present_result(error, _ctx), do: error

  defp reference_attrs(row),
    do: Map.new([:item_id, :set_id, :exercise_id, :exercise_name], fn k -> {to_string(k), Map.get(row, k)} end)

  defp validate_reference(ctx, session, attrs) do
    with :ok <- prescription_reference(session, attrs),
         :ok <- exercise_reference(ctx, attrs) do
      {:ok, if(attrs["exercise_id"], do: Map.put(attrs, "exercise_name", nil), else: attrs)}
    end
  end

  defp prescription_reference(%{prescription: nil}, attrs) do
    if attrs["item_id"] || attrs["set_id"], do: {:error, :invalid_prescription}, else: :ok
  end

  defp prescription_reference(session, attrs) do
    item_id = attrs["item_id"]
    set_id = attrs["set_id"]
    items = for b <- session.prescription["blocks"], i <- b["items"], do: i
    item = Enum.find(items, &(&1["id"] == item_id))

    cond do
      is_nil(item_id) and is_nil(set_id) -> :ok
      is_nil(item) -> {:error, :invalid_prescription}
      item["exercise_id"] != attrs["exercise_id"] -> {:error, :invalid_prescription}
      set_id && not Enum.any?(item["sets"], &(&1["id"] == set_id)) -> {:error, :invalid_prescription}
      true -> :ok
    end
  end

  defp exercise_reference(ctx, %{"exercise_id" => id}) when not is_nil(id) do
    with {:ok, _} <- Library.get_exercise(ctx, id), do: :ok
  end

  defp exercise_reference(_ctx, attrs) do
    if is_binary(attrs["exercise_name"]) and String.trim(attrs["exercise_name"]) != "",
      do: :ok,
      else: {:error, :invalid_exercise}
  end

  defp touch_session(session), do: session |> change(revision: session.revision + 1) |> Repo.update()
  defp editable(%{state: :discarded}), do: {:error, :conflict}
  defp editable(_), do: :ok
  defp field(attrs, key), do: attrs |> Map.new(fn {k, v} -> {to_string(k), v} end) |> Map.get(to_string(key))
end

defmodule Easy.ChatRecordReferences do
  import Ecto.Query

  alias Easy.ClientAccess
  alias Easy.ClientAccount
  alias Easy.Ctx
  alias Easy.Nutrition.DiaryMeal
  alias Easy.Repo
  alias Easy.Training.TrainingSession

  @spec reference(Ctx.t(), String.t(), map()) :: {:ok, map()} | {:error, :not_found | :conflict}
  def reference(ctx, client_id, %{type: type, id: id, revision: expected}) do
    Repo.snapshot(fn ->
      with :ok <- authorize(ctx, client_id),
           row when not is_nil(row) <- load_record(ctx.business_id, client_id, type, id) do
        freeze_reference(type, row, expected)
      else
        _ -> {:error, :not_found}
      end
    end)
  end

  defp authorize(%Ctx{client_id: client_id} = ctx, client_id) when not is_nil(client_id) do
    with {:ok, _} <- ClientAccount.get_client_account(ctx), do: :ok
  end

  defp authorize(%Ctx{client_id: nil} = ctx, client_id), do: ClientAccess.authorize_client_id(ctx, client_id)
  defp authorize(_ctx, _client_id), do: {:error, :not_found}

  defp load_record(business_id, client_id, "training_session", id) do
    from(s in TrainingSession,
      where: s.business_id == ^business_id and s.client_id == ^client_id and s.id == ^id and s.state == :completed,
      select: %{
        id: s.id,
        title:
          fragment(
            "COALESCE((SELECT w->>'name' FROM plan_revisions r, jsonb_array_elements(r.content->'workouts') w WHERE r.id=? AND w->>'id'=?::text), 'Workout')",
            s.plan_revision_id,
            s.workout_id
          ),
        occurred_on: s.local_date,
        recorded_at: s.ended_at,
        revision: s.revision
      }
    )
    |> Repo.one()
  end

  defp load_record(business_id, client_id, "meal", id) do
    from(s in DiaryMeal,
      where: s.business_id == ^business_id and s.client_id == ^client_id and s.id == ^id and not is_nil(s.shared_at),
      select: %{
        id: s.id,
        title: s.name,
        occurred_on: s.local_date,
        recorded_at: s.shared_at,
        revision: s.revision
      }
    )
    |> Repo.one()
  end

  defp load_record(_business_id, _client_id, _type, _id), do: nil

  defp freeze_reference(type, row, expected) do
    if is_nil(expected) or (is_integer(expected) and expected > 0 and expected <= row.revision) do
      snapshot = %{
        "title" => row.title,
        "occurred_on" => Date.to_iso8601(row.occurred_on),
        "recorded_at" => DateTime.to_iso8601(row.recorded_at),
        "revision" => expected || row.revision
      }

      {:ok, %{type: type, id: row.id, snapshot: source_snapshot(snapshot, row)}}
    else
      {:error, :conflict}
    end
  end

  defp source_snapshot(snapshot, %{meal_slot: slot}), do: Map.put(snapshot, "meal_slot", slot)
  defp source_snapshot(snapshot, _row), do: snapshot
end

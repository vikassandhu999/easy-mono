defmodule Easy.Training.PerformedSets do
  alias Easy.Ctx
  alias Easy.Repo

  alias Easy.Training.{
    PrescriptionSnapshot,
    TrainingExercise,
    TrainingPerformedSet,
    TrainingSession,
    TrainingSetRequest
  }

  import Ecto.Query

  @spec create_client_performed_set(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | :conflict | Ecto.Changeset.t()}
  def create_client_performed_set(%Ctx{} = ctx, session_id, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      Repo.transact(fn -> create_performed_set(ctx.business_id, client_id, session_id, attrs) end)
    end
  end

  @spec update_client_performed_set(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_performed_set(%Ctx{} = ctx, set_id, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      mutate_client_active_performed_set(ctx.business_id, client_id, set_id, fn set ->
        set
        |> TrainingPerformedSet.update_changeset(attrs)
        |> Repo.update()
      end)
    end
  end

  @spec delete_client_performed_set(Ctx.t(), String.t()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_client_performed_set(%Ctx{} = ctx, set_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      mutate_client_active_performed_set(ctx.business_id, client_id, set_id, &Repo.delete/1)
    end
  end

  defp lock_client_active_session(business_id, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(business_id, client_id)
    |> TrainingSession.for_state(:active)
    |> lock("FOR UPDATE")
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp create_performed_set(business_id, client_id, session_id, attrs) do
    with {:ok, session} <- lock_client_session(business_id, client_id, session_id),
         {:ok, identity} <- TrainingSetRequest.identity(attrs) do
      case find_request(session, identity) do
        nil -> create_new_set(session, attrs, identity)
        request -> replay_set(session, request, identity)
      end
    end
  end

  defp lock_client_session(business_id, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(business_id, client_id)
    |> lock("FOR UPDATE")
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp find_request(_session, nil), do: nil

  defp find_request(session, identity) do
    TrainingSetRequest
    |> TrainingSetRequest.for_session(session.business_id, session.id)
    |> Repo.get_by(request_id: identity.id)
  end

  defp replay_set(session, %{fingerprint: fingerprint, performed_set_id: id}, %{fingerprint: fingerprint})
       when is_binary(id) do
    TrainingPerformedSet
    |> TrainingPerformedSet.for_business(session.business_id)
    |> TrainingPerformedSet.for_session(session.id)
    |> TrainingPerformedSet.include_exercise(session.business_id)
    |> Repo.get(id)
    |> ok_or_not_found()
  end

  defp replay_set(_session, _request, _identity), do: {:error, :conflict}

  defp create_new_set(%TrainingSession{state: :active} = session, attrs, identity) do
    with {:ok, exercise_id} <- TrainingPerformedSet.exercise_reference(attrs),
         {:ok, exercise} <- fetch_visible_exercise(session.business_id, exercise_id),
         {:ok, set} <- insert_performed_set(session, attrs, exercise),
         :ok <- record_request(set, identity) do
      {:ok, set}
    end
  end

  defp create_new_set(_session, _attrs, _identity), do: {:error, :not_found}

  defp record_request(_set, nil), do: :ok

  defp record_request(set, identity) do
    case set |> TrainingSetRequest.insert_changeset(identity) |> Repo.insert() do
      {:ok, _request} -> :ok
      error -> error
    end
  end

  defp fetch_visible_exercise(_business_id, nil), do: {:ok, nil}

  defp fetch_visible_exercise(business_id, exercise_id) do
    TrainingExercise
    |> TrainingExercise.for_business_or_system(business_id)
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  defp fetch_client_active_performed_set(business_id, client_id, set_id) do
    active_session_ids =
      TrainingSession
      |> TrainingSession.for_client(business_id, client_id)
      |> TrainingSession.for_state(:active)
      |> select([session], session.id)

    TrainingPerformedSet
    |> TrainingPerformedSet.for_business(business_id)
    |> where([set], set.training_session_id in subquery(active_session_ids))
    |> TrainingPerformedSet.include_exercise(business_id)
    |> lock("FOR UPDATE")
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  defp mutate_client_active_performed_set(business_id, client_id, set_id, mutation) do
    Repo.transact(fn ->
      with {:ok, set} <- fetch_client_active_performed_set(business_id, client_id, set_id),
           {:ok, _session} <- lock_client_active_session(business_id, client_id, set.training_session_id) do
        mutation.(set)
      end
    end)
  end

  defp insert_performed_set(session, attrs, exercise) do
    position =
      TrainingPerformedSet
      |> TrainingPerformedSet.for_business(session.business_id)
      |> TrainingPerformedSet.for_session(session.id)
      |> select([set], max(set.position))
      |> Repo.one()
      |> then(&((&1 || -1) + 1))

    session.business_id
    |> TrainingPerformedSet.insert_changeset(session.id, position, exercise, attrs)
    |> PrescriptionSnapshot.validate_exercise_reference(session.prescription_snapshot)
    |> Repo.insert()
    |> case do
      {:ok, set} -> {:ok, %{set | exercise: exercise}}
      error -> error
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end

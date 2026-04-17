defmodule Easy.Training.LastPerformed do
  import Ecto.Query

  alias Easy.Repo
  alias Easy.Training.{PerformedSet, WorkoutElement, WorkoutSession}

  @type element_summary :: %{
          source: :element | :exercise,
          session_id: String.t(),
          ended_at: DateTime.t() | nil,
          started_at: DateTime.t(),
          exercise_id: String.t(),
          sets: [map()]
        }

  @type t :: %{optional(String.t()) => element_summary()}

  @spec for_elements(String.t(), String.t(), [WorkoutElement.t()], Keyword.t()) :: t()
  def for_elements(business_id, client_id, elements, opts \\ []) when is_list(elements) do
    elements
    |> Enum.map(fn %WorkoutElement{id: id, exercise_id: exercise_id} ->
      {id, exercise_id}
    end)
    |> then(&for_pairs(business_id, client_id, &1, opts))
  end

  @spec for_session(WorkoutSession.t()) :: t()
  def for_session(%WorkoutSession{planned_snapshot: nil}), do: %{}

  def for_session(%WorkoutSession{} = session) do
    pairs = pairs_from_snapshot(session.planned_snapshot)

    for_pairs(session.business_id, session.client_id, pairs, exclude_session_id: session.id)
  end

  defp pairs_from_snapshot(%{"elements" => elements}) when is_list(elements) do
    Enum.map(elements, fn el ->
      {Map.get(el, "element_id"), Map.get(el, "exercise_id")}
    end)
  end

  defp pairs_from_snapshot(_), do: []

  @spec for_pairs(String.t(), String.t(), [{String.t() | nil, String.t() | nil}], Keyword.t()) ::
          t()
  def for_pairs(business_id, client_id, pairs, opts \\ []) when is_list(pairs) do
    exclude_session_id = Keyword.get(opts, :exclude_session_id)

    Enum.reduce(pairs, %{}, fn
      {nil, _}, acc ->
        acc

      {element_id, exercise_id}, acc ->
        case last_for_pair(business_id, client_id, element_id, exercise_id, exclude_session_id) do
          nil -> acc
          summary -> Map.put(acc, element_id, summary)
        end
    end)
  end

  defp last_for_pair(business_id, client_id, element_id, exercise_id, exclude_session_id) do
    element_session =
      latest_session(business_id, client_id, exclude_session_id, fn q ->
        from(s in q, where: s.workout_element_id == ^element_id)
      end)

    case element_session do
      %WorkoutSession{} = session ->
        sets = session_sets_for(session.id, workout_element_id: element_id)
        build_summary(:element, session, exercise_id, sets)

      nil ->
        exercise_fallback(business_id, client_id, exercise_id, exclude_session_id)
    end
  end

  defp exercise_fallback(_business_id, _client_id, nil, _exclude), do: nil

  defp exercise_fallback(business_id, client_id, exercise_id, exclude_session_id) do
    session =
      latest_session(business_id, client_id, exclude_session_id, fn q ->
        from(s in q,
          where: s.exercise_id == ^exercise_id
        )
      end)

    case session do
      %WorkoutSession{} = s ->
        sets = session_sets_for(s.id, exercise_id: exercise_id)
        build_summary(:exercise, s, exercise_id, sets)

      nil ->
        nil
    end
  end

  defp latest_session(business_id, client_id, exclude_session_id, set_filter) do
    base =
      PerformedSet
      |> set_filter.()
      |> PerformedSet.for_client(client_id)
      |> PerformedSet.in_completed_sessions()

    session_id_query =
      from([session: ws] in base,
        where: ws.business_id == ^business_id,
        distinct: true,
        select: ws.id
      )
      |> maybe_exclude_session(exclude_session_id)

    WorkoutSession
    |> where([ws], ws.id in subquery(session_id_query))
    |> WorkoutSession.newest()
    |> limit(1)
    |> Repo.one()
  end

  defp maybe_exclude_session(query, nil), do: query

  defp maybe_exclude_session(query, session_id) do
    from([session: ws] in query, where: ws.id != ^session_id)
  end

  defp session_sets_for(session_id, workout_element_id: element_id) do
    PerformedSet
    |> PerformedSet.for_session(session_id)
    |> PerformedSet.for_element(element_id)
    |> PerformedSet.ordered()
    |> Repo.all()
    |> Enum.map(&set_summary/1)
  end

  defp session_sets_for(session_id, exercise_id: exercise_id) do
    PerformedSet
    |> PerformedSet.for_session(session_id)
    |> PerformedSet.for_exercise(exercise_id)
    |> PerformedSet.ordered()
    |> Repo.all()
    |> Enum.map(&set_summary/1)
  end

  defp set_summary(%PerformedSet{} = set) do
    %{
      position: set.position,
      actual_reps: set.actual_reps,
      load_value: set.load_value,
      load_unit: set.load_unit,
      rpe: set.rpe,
      rir: set.rir,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: set.distance_unit
    }
  end

  defp build_summary(source, %WorkoutSession{} = session, exercise_id, sets) do
    %{
      source: source,
      session_id: session.id,
      ended_at: session.ended_at,
      started_at: session.started_at,
      exercise_id: exercise_id,
      sets: sets
    }
  end
end

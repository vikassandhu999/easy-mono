defmodule Easy.Workouts do
  import Ecto.Query
  import Bitwise
  alias Easy.Attachments.Attachment
  alias Easy.{ClientAccess, Ctx, CursorPage, Repo}
  alias Easy.Clients.Client
  alias Easy.Orgs.Coach

  alias Easy.Workouts.{
    Content,
    Exercise,
    ExerciseMedia,
    Timing,
    Undo,
    Workout,
    WorkoutExerciseReference,
    WorkoutSchedule
  }

  @type result :: {:ok, map() | struct()} | {:error, atom() | Ecto.Changeset.t()}

  @spec list_exercises(Ctx.t(), keyword()) :: result()
  def list_exercises(ctx, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Exercise.visible(ctx.business_id)
      |> exercise_archive_filter(opts[:archived])
      |> search(opts[:search])
      |> facet(:kind, opts[:kind])
      |> tag(:goals, opts[:goal])
      |> tag(:places, opts[:place])
      |> equipment_filter(opts[:equipment])
      |> tag(:muscles, opts[:muscle])
      |> Exercise.include_media(ctx.business_id)
      |> page(opts)
    end
  end

  @spec get_exercise(Ctx.t(), String.t()) :: result()
  def get_exercise(ctx, id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Exercise.visible(ctx.business_id)
      |> Exercise.include_media(ctx.business_id)
      |> Repo.get(id)
      |> found()
    end
  end

  @spec create_exercise(Ctx.t(), map()) :: result()
  def create_exercise(ctx, attrs) do
    library_write(ctx, fn ->
      with {:ok, row} <- Exercise.insert_changeset(ctx.business_id, attrs) |> Repo.insert(),
           :ok <- replace_exercise_media(ctx, %{row | media: []}, encode(attrs)) do
        get_exercise(ctx, row.id)
      end
    end)
  end

  @spec update_exercise(Ctx.t(), String.t(), map()) :: result()
  def update_exercise(ctx, id, attrs) do
    mutate_exercise(ctx, id, fn row ->
      with {:ok, updated} <- Exercise.update_changeset(row, attrs) |> Repo.update(),
           :ok <- replace_exercise_media(ctx, updated, encode(attrs)) do
        get_exercise(ctx, id)
      end
    end)
  end

  @spec archive_exercise(Ctx.t(), String.t()) :: result()
  def archive_exercise(ctx, id),
    do: mutate_exercise(ctx, id, &(Exercise.archive_changeset(&1, DateTime.utc_now(:second)) |> Repo.update()))

  @spec restore_exercise(Ctx.t(), String.t()) :: result()
  def restore_exercise(ctx, id),
    do: mutate_exercise(ctx, id, &(Exercise.restore_changeset(&1) |> Repo.update()))

  @spec copy_exercise(Ctx.t(), String.t()) :: result()
  def copy_exercise(ctx, id) do
    with {:ok, row} <- get_exercise(ctx, id),
         do: library_write(ctx, fn -> duplicate_exercise(ctx, row) end)
  end

  defp duplicate_exercise(ctx, row) do
    attrs =
      row
      |> Map.take([:name, :instructions, :kind, :goals, :places, :equipment, :muscles])
      |> Map.put(:name, row.name <> " (copy)")
      |> Map.put(:metrics, Enum.map(row.metrics, &Ecto.embedded_dump(&1, :json)))

    with {:ok, copy} <- create_exercise(ctx, attrs) do
      Enum.each(row.media, fn media ->
        ExerciseMedia.insert_changeset(ctx.business_id, copy.id, media.attachment_id, %{caption: media.caption, position: media.position}) |> Repo.insert() |> unwrap()
      end)

      get_exercise(ctx, copy.id)
    end
  end

  defp mutate_exercise(ctx, id, operation) do
    library_write(ctx, fn ->
      with {:ok, row} <- Exercise.for_business(ctx.business_id) |> where([e], e.id == ^id) |> lock("FOR UPDATE") |> Exercise.include_media(ctx.business_id) |> Repo.one() |> found(),
           do: operation.(row)
    end)
  end

  defp exercise_archive_filter(query, true), do: where(query, [e], not is_nil(e.archived_at))
  defp exercise_archive_filter(query, _), do: Exercise.selectable(query)
  defp equipment_filter(query, value) when value in [nil, ""], do: query
  defp equipment_filter(query, value), do: where(query, [e], ilike(e.equipment, ^Easy.Search.like_pattern(value)))

  defp replace_exercise_media(ctx, row, %{"media" => values}) when is_list(values) do
    if Enum.all?(values, &(is_map(&1) and not is_struct(&1))),
      do: replace_media_rows(ctx, row, values),
      else: {:error, media_error(row, "must be an array of media objects")}
  end

  defp replace_exercise_media(_ctx, row, %{"media" => _}), do: {:error, media_error(row, "must be an array of media objects")}
  defp replace_exercise_media(_ctx, _row, _attrs), do: :ok

  defp replace_media_rows(ctx, row, values) do
    {:ok, _} = Repo.query("SET CONSTRAINTS exercise_media_position DEFERRED")
    current = Map.new(row.media, &{&1.id, &1})
    ids = Enum.map(values, & &1["id"]) |> Enum.reject(&is_nil/1)

    if Enum.uniq(ids) == ids and Enum.all?(ids, &Map.has_key?(current, &1)) do
      from(m in ExerciseMedia, where: m.business_id == ^ctx.business_id and m.exercise_id == ^row.id and m.id not in ^ids)
      |> Repo.delete_all()

      values
      |> Enum.with_index()
      |> Enum.each(fn {attrs, position} ->
        save_exercise_media(ctx, row, current[attrs["id"]], Map.put(attrs, "position", position)) |> unwrap()
      end)

      :ok
    else
      {:error, media_error(row, "must use distinct gallery ids from this exercise")}
    end
  end

  defp media_error(row, message), do: row |> Ecto.Changeset.change() |> Ecto.Changeset.add_error(:media, message)

  defp save_exercise_media(ctx, row, current, attrs) do
    with {:ok, attachment} <- media_attachment(ctx, current, attrs["url"]) do
      case current do
        nil -> ExerciseMedia.insert_changeset(ctx.business_id, row.id, attachment.id, attrs) |> Repo.insert()
        media -> media |> ExerciseMedia.update_changeset(attrs) |> Ecto.Changeset.put_change(:attachment_id, attachment.id) |> Repo.update()
      end
    end
  end

  defp media_attachment(_ctx, %{attachment: %{external_url: url} = attachment}, url), do: {:ok, attachment}
  defp media_attachment(ctx, _current, url), do: Attachment.external_link_changeset(ctx.business_id, url, {:coach, ctx.coach_id}) |> Repo.insert()

  @spec delete_exercise(Ctx.t(), String.t()) :: result()
  def delete_exercise(ctx, id) do
    with :ok <- Ctx.ensure_coach(ctx),
         do: Repo.transaction(fn -> delete_locked_exercise(ctx, id) end)
  end

  defp delete_locked_exercise(ctx, id) do
    row =
      Exercise.for_business(ctx.business_id)
      |> where([e], e.id == ^id)
      |> lock("FOR UPDATE")
      |> Repo.one()
      |> found()
      |> unwrap()

    if exercise_in_use?(ctx, row.id),
      do: Repo.rollback(:in_use),
      else: remove(row)
  end

  defp exercise_in_use?(ctx, id) do
    Repo.exists?(from(e in WorkoutExerciseReference, where: e.business_id == ^ctx.business_id and e.exercise_id == ^id)) or
      Repo.exists?(from(l in Easy.Workouts.ExerciseLog, where: l.business_id == ^ctx.business_id and l.exercise_id == ^id)) or
      Repo.exists?(from(s in Easy.Workouts.ExerciseSet, where: s.business_id == ^ctx.business_id and s.exercise_id == ^id))
  end

  @spec list_workouts(Ctx.t(), keyword()) :: result()
  def list_workouts(ctx, opts \\ []), do: with(:ok <- Ctx.ensure_coach(ctx), do: list_owned(ctx, nil, opts))
  @spec get_workout(Ctx.t(), String.t()) :: result()
  def get_workout(ctx, id), do: with(:ok <- Ctx.ensure_coach(ctx), do: workout(ctx, nil, id))
  @spec create_workout(Ctx.t(), map()) :: result()
  def create_workout(ctx, attrs), do: library_write(ctx, fn -> insert_workout(ctx, nil, attrs) end)
  @spec update_workout(Ctx.t(), String.t(), map()) :: result()
  def update_workout(ctx, id, attrs),
    do: library_write(ctx, fn -> with {:ok, row} <- workout(ctx, nil, id), do: edit_workout(ctx, row, attrs) end)

  @spec delete_workout(Ctx.t(), String.t()) :: result()
  def delete_workout(ctx, id),
    do: library_write(ctx, fn -> with {:ok, row} <- workout(ctx, nil, id), do: Repo.delete(row) end)

  @spec copy_workout(Ctx.t(), String.t()) :: result()
  def copy_workout(ctx, id),
    do:
      library_write(ctx, fn ->
        with {:ok, row} <- workout(ctx, nil, id),
             do: insert_workout(ctx, nil, Map.put(content(row), "name", row.name <> " (copy)"), row)
      end)

  @spec list_workouts_for_client(Ctx.t(), String.t(), keyword()) :: result()
  def list_workouts_for_client(ctx, client_id, opts \\ []),
    do: with(:ok <- access(ctx, client_id), do: list_owned(ctx, client_id, opts))

  @spec get_workout_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def get_workout_for_client(ctx, client_id, id),
    do: with(:ok <- access(ctx, client_id), do: workout(ctx, client_id, id, false))

  @spec create_workout_for_client(Ctx.t(), String.t(), map()) :: result()
  def create_workout_for_client(ctx, client_id, attrs),
    do: write(ctx, client_id, fn _ -> insert_workout(ctx, client_id, attrs) end)

  @spec update_workout_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_workout_for_client(ctx, client_id, id, attrs),
    do: write(ctx, client_id, fn today -> update_owned(ctx, client_id, id, attrs, today) end)

  @spec copy_workout_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def copy_workout_for_client(ctx, client_id, id),
    do:
      write(ctx, client_id, fn _ ->
        with {:ok, row} <- workout(ctx, client_id, id),
             do: insert_workout(ctx, client_id, Map.put(content(row), "name", row.name <> " (copy)"), row)
      end)

  @spec assign_workout_to_client(Ctx.t(), String.t(), String.t()) :: result()
  def assign_workout_to_client(ctx, client_id, id),
    do:
      write(ctx, client_id, fn _ ->
        with {:ok, row} <- workout(ctx, nil, id), do: insert_workout(ctx, client_id, content(row), row)
      end)

  @spec delete_workout_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def delete_workout_for_client(ctx, client_id, id),
    do: write(ctx, client_id, &delete_owned(ctx, client_id, id, &1))

  defp delete_owned(ctx, client_id, id, today) do
    with {:ok, row} <- workout(ctx, client_id, id) do
      rows = schedules(ctx, client_id, id, today)
      Enum.each(rows, &end_schedule(&1, today))

      if Enum.any?(rows, &Timing.last_fact(&1, today)) or logged?(ctx, row.id),
        do: save(Ecto.Changeset.change(row, archived_at: DateTime.utc_now(:second))),
        else: remove(row)

      {:ok, week(ctx, client_id, today, today)}
    end
  end

  @spec read_week_for_client(Ctx.t(), String.t(), keyword()) :: result()
  def read_week_for_client(ctx, client_id, opts \\ []) do
    with :ok <- access(ctx, client_id),
         {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, on} <- on_date(opts[:on], local_today(Repo.preload(client, :business))) do
      {:ok, week(ctx, client_id, on, local_today(Repo.preload(client, :business)))}
    end
  end

  @spec add_schedule_for_client(Ctx.t(), String.t(), map()) :: result()
  def add_schedule_for_client(ctx, client_id, attrs) do
    write(ctx, client_id, fn today ->
      attrs = encode(attrs)

      with {:ok, row} <- chosen_workout(ctx, client_id, attrs),
           :ok <- scheduling_content(ctx, row),
           do: merge_schedule(ctx, client_id, row.id, Map.put_new(attrs, "from_date", today), today)
    end)
  end

  @spec update_schedule_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_schedule_for_client(ctx, client_id, id, attrs),
    do: write(ctx, client_id, &update_schedule(ctx, client_id, id, attrs, &1))

  defp update_schedule(ctx, client_id, id, attrs, today) do
    with {:ok, row} <- schedule(ctx, client_id, id, today),
         true <- Timing.future?(row, today) || {:error, :not_found} do
      next = Map.merge(timing_attrs(row), encode(attrs)) |> Map.put("from_date", today)

      with {:ok, desired} <- validate_schedule(ctx, row, next),
           do: {:ok, merge_changed_schedule(ctx, row, desired, next, today)}
    end
  end

  @spec remove_schedule_for_client(Ctx.t(), String.t(), String.t(), integer() | nil) :: result()
  def remove_schedule_for_client(ctx, client_id, id, weekday \\ nil),
    do: write(ctx, client_id, &remove_schedule(ctx, client_id, id, weekday, &1))

  defp remove_schedule(ctx, client_id, id, weekday, today) do
    with {:ok, row} <- schedule(ctx, client_id, id, today),
         true <- Timing.future?(row, today) || {:error, :not_found},
         :ok <- valid_weekday(weekday) do
      mask = if weekday, do: row.weekdays_mask &&& bnot(Timing.bit(weekday)), else: 0

      if mask == 0,
        do: end_schedule(row, today),
        else: change_schedule(row, Map.put(timing_attrs(row), "weekdays_mask", mask), today)

      {:ok, week(ctx, client_id, today, today)}
    end
  end

  @spec undo_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def undo_for_client(ctx, client_id, token) do
    with :ok <- access(ctx, client_id) do
      Repo.transaction(fn ->
        today = local_today(lock_client(ctx, client_id))
        unwrap(Undo.restore(ctx, client_id, token, today))
        week(ctx, client_id, today, today)
      end)
    end
  end

  defp library_write(ctx, operation),
    do: with(:ok <- Ctx.ensure_coach(ctx), do: Repo.transaction(fn -> unwrap(operation.()) end))

  defp write(ctx, client_id, operation) do
    with :ok <- access(ctx, client_id) do
      Repo.transaction(fn ->
        today = local_today(lock_client(ctx, client_id))
        before = Undo.snapshot(ctx, client_id)
        value = unwrap(operation.(today))
        %{data: value, undo_token: Undo.token(ctx, client_id, before, today)}
      end)
    end
  end

  defp access(ctx, client_id),
    do: with(:ok <- Ctx.ensure_coach(ctx), do: ClientAccess.authorize_client_id(ctx, client_id))

  defp lock_client(ctx, id),
    do:
      Client.for_business(ctx.business_id)
      |> where([c], c.id == ^id)
      |> lock("FOR UPDATE")
      |> preload(:business)
      |> Repo.one()

  defp local_today(client), do: Client.local_date(client, DateTime.utc_now())
  defp on_date(nil, today), do: {:ok, today}
  defp on_date(%Date{} = on, _), do: {:ok, on}

  defp on_date(value, _) do
    case Date.from_iso8601(value) do
      {:ok, on} -> {:ok, on}
      _ -> {:error, :invalid_date}
    end
  end

  defp found(nil), do: {:error, :not_found}
  defp found(row), do: {:ok, row}
  defp unwrap({:ok, value}), do: value
  defp unwrap({:error, reason}), do: Repo.rollback(reason)
  defp save(cs), do: unwrap(Repo.update(cs))
  defp remove(row), do: unwrap(Repo.delete(row))
  defp encode(value), do: value |> Jason.encode!() |> Jason.decode!()
  defp valid_weekday(nil), do: :ok
  defp valid_weekday(day) when is_integer(day) and day in 1..7, do: :ok
  defp valid_weekday(_), do: {:error, :invalid_date}
  defp search(q, value) when value in [nil, ""], do: q
  defp search(q, value), do: where(q, [r], ilike(r.name, ^Easy.Search.like_pattern(value)))
  defp facet(q, _, value) when value in [nil, ""], do: q
  defp facet(q, key, value), do: where(q, [r], field(r, ^key) == ^value)
  defp tag(q, _, value) when value in [nil, ""], do: q
  defp tag(q, key, value), do: where(q, [r], ^value in field(r, ^key))

  defp page(q, opts) do
    limit = CursorPage.limit(opts)

    with :ok <- CursorPage.validate_options(opts),
         {:ok, paged} <- CursorPage.query(q, opts[:cursor] || "start", limit),
         do: {:ok, CursorPage.finish(Repo.all(paged), limit, Repo.aggregate(q, :count))}
  end

  defp list_owned(ctx, client_id, opts) do
    result =
      Workout.for_owner(ctx.business_id, client_id)
      |> Workout.active()
      |> Workout.include_content(ctx.business_id)
      |> search(opts[:search])
      |> facet(:type, opts[:type])
      |> page(opts)

    with {:ok, result} <- result,
         do: {:ok, Map.update!(result, :data, &Content.load_exercises(&1, ctx.business_id))}
  end

  defp workout(ctx, client_id, id, active \\ true) do
    query = Workout.for_owner(ctx.business_id, client_id) |> Workout.include_content(ctx.business_id)
    query = if active, do: Workout.active(query), else: query
    query = if Repo.in_transaction?(), do: lock(query, "FOR UPDATE"), else: query

    with {:ok, row} <- query |> Repo.get(id) |> found() do
      {:ok, hd(Content.load_exercises([row], ctx.business_id))}
    end
  end

  defp insert_workout(ctx, client_id, attrs, source \\ nil) do
    attrs = attrs |> encode() |> Content.fresh_ids()
    row = %Workout{business_id: ctx.business_id, client_id: client_id}

    with {:ok, changeset, video} <- prepare_workout(ctx, row, attrs, source) do
      persist_content(ctx, changeset, :insert, video)
    end
  end

  defp edit_workout(ctx, row, attrs) do
    with {:ok, changeset, video} <- prepare_workout(ctx, row, encode(attrs), row) do
      if Content.same?(Ecto.Changeset.apply_changes(changeset), row), do: {:ok, row}, else: persist_content(ctx, changeset, :update, video)
    end
  end

  defp prepare_workout(ctx, row, attrs, retained) do
    with {:ok, attrs, video} <- prepare_video(ctx, row, Map.delete(attrs, "video_id")) do
      old_ids = if retained, do: exercise_ids(content(retained)["groups"]), else: []
      groups = Map.get(attrs, "groups", content(row)["groups"])
      lookup = Content.exercises_by_id(ctx.business_id, exercise_ids(groups) ++ old_ids)
      changeset = Workout.update_changeset(row, attrs, lookup)

      changeset =
        if Enum.any?(exercise_ids(groups) -- old_ids, &archived?(lookup[&1])),
          do: Ecto.Changeset.add_error(changeset, :groups, "cannot select an archived exercise"),
          else: changeset

      if changeset.valid?, do: {:ok, changeset, video}, else: {:error, changeset}
    end
  end

  defp archived?(nil), do: false
  defp archived?(exercise), do: not is_nil(exercise.archived_at)

  defp prepare_video(ctx, row, %{"video_url" => url} = attrs) do
    cond do
      is_nil(url) ->
        {:ok, Map.put(attrs, "video_id", nil), nil}

      row.video_id && row.video.external_url == url ->
        {:ok, Map.put(attrs, "video_id", row.video_id), nil}

      true ->
        changeset = Attachment.external_link_changeset(ctx.business_id, url, {:coach, ctx.coach_id})

        with {:ok, video} <- Ecto.Changeset.apply_action(changeset, :insert),
             do: {:ok, Map.put(attrs, "video_id", video.id), changeset}
    end
  end

  defp prepare_video(_ctx, _row, attrs), do: {:ok, attrs, nil}

  defp persist_content(ctx, changeset, operation, video) do
    with :ok <- insert_video(video),
         {:ok, row} <- apply(Repo, operation, [changeset]) do
      :ok = Content.sync_references(row)
      workout(ctx, row.client_id, row.id)
    end
  end

  defp insert_video(nil), do: :ok
  defp insert_video(changeset), do: with({:ok, _} <- Repo.insert(changeset), do: :ok)

  defp content(row) do
    %{
      "name" => row.name,
      "description" => row.description,
      "type" => row.type,
      "groups" => Enum.map(row.groups, &Ecto.embedded_dump(&1, :json)) |> encode(),
      "video_url" => if(row.video_id, do: row.video.external_url, else: nil)
    }
  end

  defp exercise_ids(groups) when is_list(groups) do
    groups
    |> Enum.flat_map(&group_entries/1)
    |> Enum.flat_map(fn
      %{"exercise_id" => id} when is_binary(id) -> [id]
      _ -> []
    end)
    |> Enum.uniq()
  end

  defp exercise_ids(_), do: []
  defp group_entries(%{"exercises" => entries}) when is_list(entries), do: entries
  defp group_entries(_), do: []

  defp update_owned(ctx, client_id, id, attrs, today) do
    with {:ok, row} <- workout(ctx, client_id, id),
         {:ok, changeset, video} <- prepare_workout(ctx, row, encode(attrs), row) do
      if Content.same?(Ecto.Changeset.apply_changes(changeset), row),
        do: {:ok, row},
        else: persist_owned_edit(ctx, row, changeset, video, today)
    end
  end

  defp persist_owned_edit(ctx, row, changeset, video, today) do
    rows = schedules(ctx, row.client_id, row.id, today)
    changeset = if Enum.any?(rows, &Timing.future?(&1, today)), do: Workout.validate_content_for_schedule(changeset), else: changeset

    cond do
      not changeset.valid? ->
        {:error, changeset}

      Enum.any?(rows, &Timing.last_fact(&1, today)) or logged?(ctx, row.id) ->
        copy_owned(ctx, row, rows, changeset, video, today)

      true ->
        persist_content(ctx, changeset, :update, video)
    end
  end

  defp logged?(ctx, id), do: Repo.exists?(from(l in Easy.Workouts.WorkoutLog, where: l.business_id == ^ctx.business_id and l.workout_id == ^id))

  defp copy_owned(ctx, row, rows, changeset, video, today) do
    candidate = Ecto.Changeset.apply_changes(changeset)
    video = if is_nil(video) and candidate.video_id, do: Attachment.external_link_changeset(ctx.business_id, row.video.external_url, {:coach, ctx.coach_id}), else: video

    attrs =
      %{name: candidate.name, description: candidate.description, type: candidate.type, groups: Enum.map(candidate.groups, &Ecto.embedded_dump(&1, :json))}
      |> Content.fresh_ids()
      |> Map.put(:video_id, if(video, do: Ecto.Changeset.get_field(video, :id), else: nil))

    lookup = Content.exercises_by_id(ctx.business_id, exercise_ids(encode(attrs)["groups"]))
    copy_changeset = Workout.insert_changeset(ctx.business_id, row.client_id, attrs, lookup)

    with {:ok, copy} <- persist_content(ctx, copy_changeset, :insert, video) do
      Enum.each(rows, &move_schedule(&1, copy.id, today))
      save(Ecto.Changeset.change(row, archived_at: DateTime.utc_now(:second)))
      {:ok, copy}
    end
  end

  defp schedules(ctx, client_id, workout_id, today),
    do: WorkoutSchedule.for_client(ctx.business_id, client_id) |> where([s], s.workout_id == ^workout_id) |> claimed_on(today) |> Repo.all()

  defp schedule(ctx, client_id, id, today),
    do: WorkoutSchedule.for_client(ctx.business_id, client_id) |> claimed_on(today) |> Repo.get(id) |> found()

  defp claimed_on(query, today),
    do:
      select_merge(query, [s], %{
        claimed_today: fragment("EXISTS(SELECT 1 FROM workout_logs l WHERE l.schedule_id=? AND l.business_id=? AND l.scheduled_date=?)", s.id, s.business_id, ^today)
      })

  defp timing_attrs(row),
    do: row |> Map.take([:weekdays_mask, :from_date, :until_date, :time, :place, :meeting_url, :coach_id]) |> encode()

  defp chosen_workout(ctx, client_id, %{"library_workout_id" => id}),
    do: with({:ok, source} <- workout(ctx, nil, id), do: insert_workout(ctx, client_id, content(source), source))

  defp chosen_workout(ctx, client_id, %{"workout_id" => id}), do: workout(ctx, client_id, id)
  defp chosen_workout(_, _, _), do: {:error, :invalid_prescription}

  defp scheduling_content(ctx, row) do
    lookup = Content.exercises_by_id(ctx.business_id, exercise_ids(content(row)["groups"]))
    changeset = row |> Workout.update_changeset(%{}, lookup) |> Workout.validate_content_for_schedule()
    if changeset.valid?, do: :ok, else: {:error, changeset}
  end

  defp validate_schedule(ctx, row, attrs) do
    cs = WorkoutSchedule.update_changeset(row, attrs)
    id = Ecto.Changeset.get_field(cs, :coach_id)

    if id && not Repo.exists?(Coach.for_business(ctx.business_id) |> Coach.active() |> where([c], c.id == ^id)),
      do: {:error, :coach_not_active},
      else: Ecto.Changeset.apply_action(cs, :insert)
  end

  defp merge_schedule(ctx, client_id, workout_id, attrs, today) do
    cs = WorkoutSchedule.insert_changeset(ctx.business_id, client_id, workout_id, attrs, today)

    cs =
      case Ecto.Changeset.get_field(cs, :from_date) do
        %Date{} = date -> if Date.before?(date, today), do: Ecto.Changeset.add_error(cs, :from_date, "must not be before today"), else: cs
        _ -> cs
      end

    with {:ok, desired} <- Ecto.Changeset.apply_action(cs, :insert),
         {:ok, _} <- validate_schedule(ctx, desired, attrs) do
      existing =
        schedules(ctx, client_id, workout_id, today)
        |> Enum.find(&(Timing.future?(&1, today) and occasion(&1, today) == occasion(desired, today)))

      if existing,
        do:
          {:ok,
           change_schedule(
             existing,
             Map.put(timing_attrs(existing), "weekdays_mask", existing.weekdays_mask ||| desired.weekdays_mask),
             today
           )},
        else: Repo.insert(cs)
    end
  end

  defp merge_changed_schedule(ctx, row, desired, attrs, today) do
    other =
      schedules(ctx, row.client_id, row.workout_id, today)
      |> Enum.find(&(&1.id != row.id and Timing.future?(&1, today) and occasion(&1, today) == occasion(desired, today)))

    if other do
      end_schedule(row, today)

      change_schedule(
        other,
        Map.put(timing_attrs(other), "weekdays_mask", other.weekdays_mask ||| desired.weekdays_mask),
        today
      )
    else
      change_schedule(row, attrs, today)
    end
  end

  defp occasion(row, today) do
    row
    |> Map.take([:until_date, :time, :place, :meeting_url, :coach_id])
    |> Map.put(:from_date, if(Date.before?(row.from_date, today), do: today, else: row.from_date))
  end

  defp end_schedule(row, today) do
    case Timing.last_fact(row, today) do
      nil -> remove(row)
      last -> save(Ecto.Changeset.change(row, until_date: last))
    end
  end

  defp change_schedule(row, attrs, today) do
    if Timing.last_fact(row, today) do
      end_schedule(row, today)

      WorkoutSchedule.insert_changeset(
        row.business_id,
        row.client_id,
        row.workout_id,
        Map.put(attrs, "from_date", next_date(row, today)),
        today
      )
      |> Repo.insert()
      |> unwrap()
    else
      WorkoutSchedule.update_changeset(row, attrs) |> Repo.update() |> unwrap()
    end
  end

  defp move_schedule(row, workout_id, today) do
    if Timing.future?(row, today) do
      if Timing.last_fact(row, today) do
        end_schedule(row, today)

        WorkoutSchedule.insert_changeset(
          row.business_id,
          row.client_id,
          workout_id,
          Map.put(timing_attrs(row), "from_date", next_date(row, today)),
          today
        )
        |> Repo.insert()
        |> unwrap()
      else
        Ecto.Changeset.change(row, workout_id: workout_id) |> Repo.update() |> unwrap()
      end
    end
  end

  defp next_date(row, today), do: if(Timing.last_fact(row, today) == today, do: Date.add(today, 1), else: today)

  defp week(ctx, client_id, on, today) do
    current = Date.compare(on, today) != :lt

    schedules =
      WorkoutSchedule.for_client(ctx.business_id, client_id)
      |> order_by([s], asc_nulls_last: s.time, asc: s.id)
      |> Repo.all()
      |> Enum.filter(fn s -> if current, do: Timing.future?(s, on), else: Timing.applies?(s, on) end)

    workouts =
      Workout.for_owner(ctx.business_id, client_id)
      |> Workout.include_content(ctx.business_id)
      |> order_by([w], asc: w.name, asc: w.id)

    workouts =
      if current,
        do: Workout.active(workouts),
        else: where(workouts, [w], w.id in ^Enum.map(schedules, & &1.workout_id))

    workouts = workouts |> Repo.all() |> Content.load_exercises(ctx.business_id)
    active_ids = Enum.map(workouts, & &1.id)
    schedules = if current, do: Enum.filter(schedules, &(&1.workout_id in active_ids)), else: schedules

    coaches =
      Coach.for_business(ctx.business_id)
      |> Coach.active()
      |> order_by([c], asc: c.full_name, asc: c.id)
      |> Repo.all()
      |> Enum.map(&%{id: &1.id, name: Coach.full_name(&1)})

    %{today: today, workouts: workouts, schedules: schedules, coaches: coaches}
  end
end

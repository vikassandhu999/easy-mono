defmodule Easy.Training.CoreTrainingTest do
  use Easy.DataCase, async: true
  alias Easy.Clients.Client
  alias Easy.Ctx

  alias Easy.Plans.Plan, as: TrainingPlan
  alias Easy.Plans.Programming
  alias Easy.Plans.Reader, as: PlanReader
  alias Easy.Plans.Revision, as: PlanRevision
  alias Easy.Training.Content
  alias Easy.Training.Execution
  alias Easy.Training.History
  alias Easy.Training.Library
  alias Easy.Training.PerformedSets

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    exercise = insert(:exercise, business: coach.business)
    ctx = trainer_ctx(coach)
    client_ctx = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id}
    other = insert(:coach)

    %{
      coach: coach,
      client: client,
      exercise: exercise,
      ctx: ctx,
      client_ctx: client_ctx,
      foreign_ctx: trainer_ctx(other),
      today: Date.utc_today()
    }
  end

  defp document(exercise, day) do
    workout = Ecto.UUID.generate()

    %{
      workouts: [
        %{
          id: workout,
          name: "Strength",
          blocks: [
            %{
              id: Ecto.UUID.generate(),
              format: :superset,
              items: [
                %{
                  id: Ecto.UUID.generate(),
                  exercise_id: exercise.id,
                  exercise_name: "untrusted name",
                  sets: [
                    %{
                      id: Ecto.UUID.generate(),
                      kind: :working,
                      reps: %{type: :range, min: 6, max: 8},
                      load: %{kg: 20, entered_unit: :kg}
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      schedule: %{
        cycle_weeks: 1,
        entries: [
          %{id: Ecto.UUID.generate(), day: day, ref: workout},
          %{id: Ecto.UUID.generate(), day: day, ref: workout}
        ]
      }
    }
  end

  defp template(fixture) do
    assert {:ok, t} =
             Programming.create_template(fixture.ctx, :training, %{
               name: "Training",
               content: document(fixture.exercise, Date.day_of_week(fixture.today) - 1)
             })

    t
  end

  defp plan(fixture) do
    t = template(fixture)

    assert {:ok, p} =
             Programming.assign_template_to_client(fixture.ctx, fixture.client.id, :training, t.id, %{start_date: fixture.today})

    p
  end

  defp start(fixture, plan, occurrence \\ nil) do
    entry = List.first(plan.content["schedule"]["entries"])
    attrs = %{request_id: Ecto.UUID.generate(), plan_revision_id: plan.current_revision.id, workout_id: entry["ref"]}

    attrs =
      if occurrence, do: Map.merge(attrs, %{schedule_entry_id: entry["id"], occurrence_date: occurrence}), else: attrs

    assert {:ok, s} = Execution.start_client_session(fixture.client_ctx, attrs)
    s
  end

  defp set_attrs(fixture, session, extra \\ %{}) do
    item = hd(hd(session.prescription["blocks"])["items"])

    Map.merge(
      %{
        request_id: Ecto.UUID.generate(),
        exercise_id: fixture.exercise.id,
        item_id: item["id"],
        set_id: hd(item["sets"])["id"],
        reps: 8,
        load_value: 100,
        load_unit: :lb
      },
      extra
    )
  end

  test "whole document save freezes names, retains ids and supports two entries per day", f do
    t = template(f)
    item = hd(hd(hd(t.content["workouts"])["blocks"])["items"])
    assert item["exercise_name"] == f.exercise.name
    assert length(t.content["schedule"]["entries"]) == 2
    assert {:ok, p} = Programming.assign_template_to_client(f.ctx, f.client.id, :training, t.id, %{start_date: f.today})
    assert p.content == t.content
    assert p.current_revision.number == 1
    assert p.created_local_date == f.today

    assert {:ok, changed} =
             Programming.update_plan(f.ctx, :training, t.id, t.revision, %{name: "Changed template", content: Content.empty()})

    assert changed.content["workouts"] == []
    assert {:ok, copy} = PlanReader.get_plan(f.ctx, :training, p.id)
    assert copy.content == t.content
  end

  test "published revisions select date then number and future revision withdraws", f do
    p = plan(f)

    assert {:ok, future} =
             Programming.update_plan(f.ctx, :training, p.id, p.revision, %{
               content: Content.empty(),
               effective_on: Date.add(f.today, 5)
             })

    assert future.current_revision.id == p.current_revision.id
    [scheduled] = future.scheduled_revisions
    assert {:ok, today} = Programming.update_plan(f.ctx, :training, p.id, future.revision, %{content: p.content})
    assert today.current_revision.number == 3
    assert [scheduled] == today.scheduled_revisions
    assert PlanReader.revision_on(f.ctx, :training, p.id, Date.add(f.today, 5)).id == scheduled.id
    assert {:ok, withdrawn} = Programming.withdraw_revision(f.ctx, :training, p.id, scheduled.id, today.revision)
    assert withdrawn.scheduled_revisions == []

    assert {:error, :conflict} =
             Programming.withdraw_revision(f.ctx, :training, p.id, today.current_revision.id, withdrawn.revision)
  end

  test "revision and journal updates fail in Postgres", f do
    p = plan(f)
    assert {:ok, _} = Execution.start_client_session(f.client_ctx, %{})

    for table <- ["plan_revisions", "record_changes"] do
      assert {:error, %Postgrex.Error{postgres: %{message: message}}} =
               Repo.query("UPDATE #{table} SET id=id", [], mode: :savepoint)

      assert message =~ "rows never change"
    end

    assert Repo.aggregate(from(r in PlanRevision, where: r.plan_id == ^p.id), :count) == 1

    assert Repo.query!("SELECT count(*) FROM record_changes WHERE client_id=$1", [Ecto.UUID.dump!(f.client.id)]).rows ==
             [[1]]

    assert p.current_revision.number == 1
  end

  test "past publish and changed current start are rejected atomically", f do
    p = plan(f)

    assert {:error, :past_effective_date} =
             Programming.update_plan(f.ctx, :training, p.id, p.revision, %{
               name: "Not saved",
               content: Content.empty(),
               effective_on: Date.add(f.today, -1)
             })

    assert {:ok, original} = PlanReader.get_plan(f.ctx, :training, p.id)
    assert original.name == p.name

    assert {:error, %Ecto.Changeset{}} =
             Programming.update_plan(f.ctx, :training, p.id, p.revision, %{start_date: Date.add(f.today, 1)})

    assert {:error, %Ecto.Changeset{}} =
             Programming.update_plan(f.ctx, :training, p.id, p.revision, %{end_date: Date.add(f.today, -1)})
  end

  test "future dates may change; archive retains today's coverage and locks editing", f do
    t = template(f)

    assert {:ok, p} =
             Programming.assign_template_to_client(f.ctx, f.client.id, :training, t.id, %{start_date: Date.add(f.today, 5)})

    assert {:ok, p} = Programming.update_plan(f.ctx, :training, p.id, p.revision, %{start_date: Date.add(f.today, 3)})
    assert p.start_date == Date.add(f.today, 3)
    assert {:ok, _} = Programming.archive_plan(f.ctx, :training, p.id, p.revision)
    current = plan(f)
    assert {:ok, archived} = Programming.archive_plan(f.ctx, :training, current.id, current.revision)
    assert archived.end_date == f.today
    assert {:ok, %{plan: %{id: id}}} = PlanReader.resolve_client_coverage(f.client_ctx, :training, f.today)
    assert id == current.id

    assert {:error, :conflict} =
             Programming.update_plan(f.ctx, :training, current.id, archived.revision, %{content: Content.empty()})

    assert {:ok, nil} = PlanReader.resolve_client_coverage(f.client_ctx, :training, Date.add(f.today, 1))
  end

  test "overlap and stale assignment fail", f do
    p = plan(f)
    t = template(f)

    assert {:error, :plan_overlap} =
             Programming.assign_template_to_client(f.ctx, f.client.id, :training, t.id, %{start_date: f.today})

    assert {:error, %Ecto.Changeset{action: :stale_revision}} =
             Programming.assign_template_to_client(f.ctx, f.client.id, :training, t.id, %{expected_revision: t.revision + 1})

    assert Repo.aggregate(TrainingPlan, :count) == 1

    assert {:error, %Ecto.Changeset{action: :stale_revision}} =
             Programming.update_plan(f.ctx, :training, p.id, p.revision + 1, %{name: "stale"})
  end

  test "content rejects duplicate ids, dangling schedule refs, unsupported cycle, invalid range and foreign exercises",
       f do
    base = document(f.exercise, 0)
    [first, second] = base.schedule.entries

    cases = [
      put_in(base.schedule.entries, [first, %{second | id: first.id}]),
      put_in(base.schedule.entries, [%{first | ref: Ecto.UUID.generate()}]),
      put_in(base.schedule.cycle_weeks, 2)
    ]

    for content <- cases do
      assert {:error, _} = Programming.create_template(f.ctx, :training, %{name: "invalid", content: content})
    end

    foreign = insert(:exercise)

    assert {:error, :not_found} =
             Programming.create_template(f.ctx, :training, %{name: "foreign", content: document(foreign, 0)})
  end

  test "E6 uses stored creation date even after timezone changes", f do
    earlier = Date.add(f.today, -10)
    Repo.delete_all(from(t in Easy.CoachingTerms.CoachingTerm, where: t.client_id == ^f.client.id))
    insert(:coaching_term, client: f.client, starts_on: Date.add(earlier, -10), ends_on: earlier)
    insert(:coaching_term, client: f.client, starts_on: f.today)

    p =
      insert(:training_plan,
        business: f.coach.business,
        client: f.client,
        start_date: f.today,
        created_local_date: earlier
      )

    assert Repo.query!("SELECT plan_covers($1,$2)", [Ecto.UUID.dump!(p.id), f.today]).rows == [[false]]
    Repo.update!(change(f.client, timezone: "Pacific/Kiritimati"))
    assert Repo.query!("SELECT plan_covers($1,$2)", [Ecto.UUID.dump!(p.id), f.today]).rows == [[false]]
  end

  test "occurrences count once, earlier occurrence keeps original date, unscheduled work is extra", f do
    p = plan(f)
    earlier = Date.add(f.today, -7)
    Repo.update!(change(Repo.get!(TrainingPlan, p.id), start_date: earlier, created_local_date: earlier))
    s = start(f, p, earlier)
    assert s.local_date == f.today
    assert s.occurrence_date == earlier
    assert {:ok, _} = Execution.complete_client_session(f.client_ctx, s.id, %{})
    s2 = start(f, p, earlier)
    assert {:ok, _} = Execution.complete_client_session(f.client_ctx, s2.id, %{})
    assert {:ok, %{data: occurrences}} = History.client_occurrences(f.client_ctx, earlier, earlier)
    assert length(occurrences) == 2
    assert Enum.count(occurrences, & &1.session_id) == 1
    free = start(f, p)
    assert free.schedule_entry_id == nil
    assert {:ok, _} = Execution.complete_client_session(f.client_ctx, free.id, %{})
    assert {:ok, %{extra_sessions: [extra]}} = History.client_occurrences(f.client_ctx, f.today, f.today)
    assert extra.id == free.id
  end

  test "session references reject wrong revision, entry, workout, cross-client and future occurrence", f do
    p = plan(f)
    entry = hd(p.content["schedule"]["entries"])

    attrs = %{
      plan_revision_id: p.current_revision.id,
      workout_id: entry["ref"],
      schedule_entry_id: entry["id"],
      occurrence_date: Date.add(f.today, 1)
    }

    assert {:error, :invalid_occurrence} = Execution.start_client_session(f.client_ctx, attrs)

    assert {:error, :invalid_prescription} =
             Execution.start_client_session(f.client_ctx, Map.delete(attrs, :plan_revision_id))

    assert {:error, :invalid_occurrence} =
             Execution.start_client_session(f.client_ctx, %{
               attrs
               | occurrence_date: f.today,
                 schedule_entry_id: Ecto.UUID.generate()
             })

    assert {:error, :not_found} =
             Execution.start_client_session(f.client_ctx, %{
               attrs
               | occurrence_date: f.today,
                 workout_id: Ecto.UUID.generate()
             })

    stranger = insert(:client, business: f.coach.business, coach: f.coach)
    ctx = %{f.client_ctx | client_id: stranger.id, user_id: stranger.user_id}
    assert {:error, :not_found} = Execution.start_client_session(ctx, %{attrs | occurrence_date: f.today})
  end

  test "session retries retain id, active uniqueness applies, discarded session closes and leaves timeline", f do
    request = Ecto.UUID.generate()
    assert {:ok, s} = Execution.start_client_session(f.client_ctx, %{request_id: request})
    seq = Repo.get!(Client, f.client.id).last_change_seq
    assert {:ok, retry} = Execution.start_client_session(f.client_ctx, %{request_id: request})
    assert retry.id == s.id
    assert Repo.get!(Client, f.client.id).last_change_seq == seq
    assert {:error, %Ecto.Changeset{}} = Execution.start_client_session(f.client_ctx, %{})
    assert {:ok, discarded} = Execution.discard_client_session(f.client_ctx, s.id)
    assert discarded.state == :discarded
    assert discarded.ended_at != nil
    assert {:error, :conflict} = Execution.update_client_session(f.client_ctx, s.id, %{notes: "closed"})
    assert Repo.query!("SELECT count(*) FROM records WHERE id=$1", [Ecto.UUID.dump!(s.id)]).rows == [[0]]
  end

  test "sets convert units, preserve ids, journal corrections and retain retry tombstones", f do
    p = plan(f)
    s = start(f, p)
    attrs = set_attrs(f, s, %{distance_value: 1, distance_unit: :mi, outcome: :skipped})
    assert {:ok, set} = PerformedSets.create_client_performed_set(f.client_ctx, s.id, attrs)
    assert Decimal.to_float(set.load_kg) == 45.359
    assert Decimal.to_float(set.distance_m) == 1609.34
    assert {:ok, retry} = PerformedSets.create_client_performed_set(f.client_ctx, s.id, attrs)
    assert retry.id == set.id
    assert {:error, :conflict} = PerformedSets.create_client_performed_set(f.client_ctx, s.id, %{attrs | reps: 9})
    assert {:ok, _} = Execution.complete_client_session(f.client_ctx, s.id, %{})

    assert {:ok, corrected} =
             PerformedSets.update_client_performed_set(f.client_ctx, set.id, %{outcome: :done, reps: 10})

    assert corrected.reps == 10
    assert {:ok, _} = PerformedSets.delete_client_performed_set(f.client_ctx, set.id, %{})
    assert {:ok, %{performed_sets: []}} = Execution.get_client_session(f.client_ctx, s.id)

    assert {:ok, tombstone} =
             PerformedSets.create_client_performed_set(f.client_ctx, s.id, %{attrs | reps: 10, outcome: :done})

    assert tombstone.deleted_at != nil

    rows =
      Repo.query!("SELECT action,old_value,new_value FROM record_changes WHERE row_id=$1 ORDER BY seq", [
        Ecto.UUID.dump!(set.id)
      ]).rows

    assert [["added", nil, _], ["changed", old, new], ["removed", _, nil]] = rows
    assert old["reps"] == 8
    assert new["reps"] == 10
  end

  test "PR uses only done working undeleted completed sets and latest corrections", f do
    p = plan(f)
    s = start(f, p)

    for {outcome, kind, load} <- [
          {:done, :working, 40},
          {:failed, :working, 100},
          {:skipped, :working, 200},
          {:done, :warmup, 300},
          {:done, :drop, 400}
        ] do
      assert {:ok, _} =
               PerformedSets.create_client_performed_set(
                 f.client_ctx,
                 s.id,
                 set_attrs(f, s, %{outcome: outcome, kind: kind, load_unit: :kg, load_value: load})
               )
    end

    assert {:ok, %{bests: []}} = History.client_exercise_history(f.client_ctx, f.exercise.id)
    assert {:ok, _} = Execution.complete_client_session(f.client_ctx, s.id, %{})

    assert {:ok, %{bests: [%{reps: 8, best_kg: best}], sets: sets}} =
             History.exercise_history_for_client(f.ctx, f.client.id, f.exercise.id)

    assert Decimal.to_float(best) == 40
    assert length(sets) == 5
    assert Enum.all?(sets, &(&1.local_date == f.today))
    done = Enum.find(sets, &(&1.outcome == :done and &1.kind == :working))

    assert {:ok, _} =
             PerformedSets.update_client_performed_set(f.client_ctx, done.id, %{load_value: 50, load_unit: :kg})

    assert {:ok, %{bests: [%{best_kg: improved}]}} = History.client_exercise_history(f.client_ctx, f.exercise.id)
    assert Decimal.to_float(improved) == 50
    assert {:ok, _} = PerformedSets.delete_client_performed_set(f.client_ctx, done.id, %{})
    assert {:ok, %{bests: []}} = History.client_exercise_history(f.client_ctx, f.exercise.id)
  end

  test "free text, extra sets, invalid units and wrong prescribed ids are distinct", f do
    s = start(f, plan(f))

    assert {:ok, extra} =
             PerformedSets.create_client_performed_set(f.client_ctx, s.id, %{
               request_id: Ecto.UUID.generate(),
               exercise_name: "Walk",
               duration_s: 60,
               outcome: :done
             })

    assert extra.set_id == nil

    assert {:error, :invalid_unit} =
             PerformedSets.create_client_performed_set(f.client_ctx, s.id, set_attrs(f, s, %{load_unit: :stone}))

    assert {:error, :invalid_prescription} =
             PerformedSets.create_client_performed_set(
               f.client_ctx,
               s.id,
               set_attrs(f, s, %{set_id: Ecto.UUID.generate()})
             )

    assert {:error, %Ecto.Changeset{}} =
             PerformedSets.create_client_performed_set(f.client_ctx, s.id, set_attrs(f, s, %{reps: -1}))
  end

  test "all coach boundaries deny foreign tenant and unassigned coach", f do
    p = plan(f)
    t = template(f)
    s = start(f, p)

    for ctx <- [f.foreign_ctx, trainer_ctx(insert(:coach, business: f.coach.business))] do
      assert {:error, :not_found} = PlanReader.get_plan(ctx, :training, p.id)
      assert {:error, :not_found} = PlanReader.list_plan_page_for_client(ctx, f.client.id, :training)
      assert {:error, :not_found} = Programming.update_plan(ctx, :training, p.id, p.revision, %{name: "denied"})
      assert {:error, :not_found} = Programming.archive_plan(ctx, :training, p.id, p.revision)
      assert {:error, :not_found} = Programming.assign_template_to_client(ctx, f.client.id, :training, t.id, %{})
      assert {:error, :not_found} = Execution.get_session_for_client(ctx, f.client.id, s.id)
      assert {:error, :not_found} = Execution.list_session_page_for_client(ctx, f.client.id)
      assert {:error, :not_found} = History.occurrences_for_client(ctx, f.client.id, f.today, f.today)
      assert {:error, :not_found} = History.exercise_history_for_client(ctx, f.client.id, f.exercise.id)
    end

    assert {:error, :not_found} = PlanReader.get_template(f.foreign_ctx, :training, t.id)
    assert {:error, :not_found} = Programming.update_plan(f.foreign_ctx, :training, t.id, t.revision, %{name: "denied"})
    assert {:error, :forbidden} = Programming.delete_plan(f.foreign_ctx, :training, t.id, t.revision)
    assert {:ok, %{data: []}} = PlanReader.list_template_page(f.foreign_ctx, :training)
  end

  test "client boundaries deny another client's records and coach cannot record", f do
    p = plan(f)
    s = start(f, p)
    assert {:ok, set} = PerformedSets.create_client_performed_set(f.client_ctx, s.id, set_attrs(f, s))
    other = insert(:client, business: f.coach.business, coach: f.coach)
    ctx = %{f.client_ctx | client_id: other.id, user_id: other.user_id}
    assert {:error, :not_found} = PlanReader.get_client_plan(ctx, :training, p.id)
    assert {:error, :not_found} = Execution.get_client_session(ctx, s.id)
    assert {:error, :not_found} = Execution.update_client_session(ctx, s.id, %{})
    assert {:error, :not_found} = PerformedSets.create_client_performed_set(ctx, s.id, set_attrs(f, s))
    assert {:error, :not_found} = PerformedSets.update_client_performed_set(ctx, set.id, %{})
    assert {:error, :not_found} = PerformedSets.delete_client_performed_set(ctx, set.id, %{})
    assert {:error, :not_found} = Execution.start_client_session(f.ctx, %{})
    assert {:error, :not_found} = Programming.create_template(f.client_ctx, :training, %{name: "denied", content: Content.empty()})
  end

  test "record contexts retain reads and leave coaching eligibility to the HTTP gate", f do
    s = start(f, plan(f))

    Repo.update_all(from(t in Easy.CoachingTerms.CoachingTerm, where: t.client_id == ^f.client.id),
      set: [ends_on: Date.add(f.today, -1)]
    )

    assert {:ok, _} = Execution.get_client_session(f.client_ctx, s.id)
    assert {:ok, _} = Execution.update_client_session(f.client_ctx, s.id, %{})
    assert {:ok, _} = PerformedSets.create_client_performed_set(f.client_ctx, s.id, set_attrs(f, s))
  end

  test "exercise measures/bodyweight are fixed, library archiving keeps reference history", f do
    assert {:ok, e} =
             Library.update_exercise(f.ctx, f.exercise.id, %{measures: [:duration], bodyweight: true, name: "Renamed"})

    assert e.measures == [:reps, :load]
    assert e.bodyweight == false
    assert {:ok, archived} = Library.delete_exercise(f.ctx, e.id)
    assert archived.archived_at != nil
    assert {:ok, _} = Library.get_exercise(f.ctx, e.id)
    assert {:error, :not_found} = Library.update_exercise(f.foreign_ctx, e.id, %{name: "denied"})
    assert {:error, :not_found} = Library.delete_exercise(f.foreign_ctx, e.id)
  end

  test "cursor session and template pages retain timestamp ties, filters and all rows", f do
    now = DateTime.utc_now(:second)

    attrs = [business: f.coach.business, client: f.client, state: :completed, inserted_at: now]
    sessions = insert_list(25, :workout_session, attrs)

    assert {:ok, first} = Execution.list_client_session_page(f.client_ctx, limit: 20)
    assert first.count == 25
    assert first.next_cursor
    assert {:ok, last} = Execution.list_client_session_page(f.client_ctx, limit: 20, cursor: first.next_cursor)
    assert last.next_cursor == nil
    assert MapSet.new(first.data ++ last.data, & &1.id) == MapSet.new(sessions, & &1.id)
    discarded = insert(:workout_session, business: f.coach.business, client: f.client, state: :discarded)
    assert {:ok, %{data: [row]}} = Execution.list_client_session_page(f.client_ctx, state: :discarded)
    assert row.id == discarded.id
    assert {:ok, %{data: [], count: 0}} = Execution.list_client_session_page(f.client_ctx, search: "no match")
    assert {:error, :invalid_cursor} = Execution.list_client_session_page(f.client_ctx, cursor: "bad")
    templates = for _ <- 1..25, do: insert(:training_plan, business: f.coach.business, inserted_at: now)
    assert {:ok, first} = PlanReader.list_template_page(f.ctx, :training)
    assert first.count == 25
    assert {:ok, last} = PlanReader.list_template_page(f.ctx, :training, cursor: first.next_cursor)
    returned = MapSet.new(first.data ++ last.data, & &1.id)
    assert returned == MapSet.new(templates, & &1.id)

    assert {:error, :cursor_incompatible} =
             PlanReader.list_template_page(f.ctx, :training, cursor: first.next_cursor, offset: 20)
  end

  test "complete/discard replay keeps revision and journal; completed notes reach Messages once", f do
    assert {:ok, session} = Execution.start_client_session(f.client_ctx, %{})

    assert {:ok, done} =
             Execution.complete_client_session(f.client_ctx, session.id, %{
               expected_revision: session.revision,
               notes: "First note"
             })

    seq = Repo.get!(Client, f.client.id).last_change_seq

    assert {:ok, replayed} =
             Execution.complete_client_session(f.client_ctx, session.id, %{
               expected_revision: session.revision,
               notes: "First note"
             })

    assert replayed.revision == done.revision
    assert Repo.get!(Client, f.client.id).last_change_seq == seq
    messages = Repo.all(from(m in Easy.Chat.Message, where: m.business_id == ^f.ctx.business_id))
    assert Enum.map(messages, & &1.body) == ["First note"]
    assert hd(messages).embed_snapshot["revision"] == done.revision

    assert {:ok, corrected} =
             Execution.update_client_session(f.client_ctx, session.id, %{
               expected_revision: done.revision,
               notes: "Corrected note"
             })

    assert corrected.revision == done.revision + 1

    messages =
      Repo.all(
        from(m in Easy.Chat.Message,
          where: m.business_id == ^f.ctx.business_id,
          order_by: [asc: m.inserted_at, asc: m.body]
        )
      )

    assert MapSet.new(messages, & &1.body) == MapSet.new(["First note", "Corrected note"])
    assert {:ok, s} = Execution.start_client_session(f.client_ctx, %{})
    assert {:ok, discarded} = Execution.discard_client_session(f.client_ctx, s.id)
    seq = Repo.get!(Client, f.client.id).last_change_seq
    assert {:ok, replay} = Execution.discard_client_session(f.client_ctx, s.id)
    assert replay.revision == discarded.revision
    assert Repo.get!(Client, f.client.id).last_change_seq == seq
  end

  test "restoring an unscheduled plan cannot violate one-unscheduled constraint", f do
    t = template(f)
    assert {:ok, a} = Programming.assign_template_to_client(f.ctx, f.client.id, :training, t.id, %{})
    assert {:ok, a} = Programming.archive_plan(f.ctx, :training, a.id, a.revision)
    assert {:ok, _b} = Programming.assign_template_to_client(f.ctx, f.client.id, :training, t.id, %{})
    assert {:error, %Ecto.Changeset{}} = Programming.restore_plan(f.ctx, :training, a.id, a.revision)
    assert {:ok, unchanged} = PlanReader.get_plan(f.ctx, :training, a.id)
    assert unchanged.archived_at == a.archived_at
  end

  test "archived templates cannot assign", f do
    t = template(f)
    assert {:ok, t} = Programming.archive_plan(f.ctx, :training, t.id, t.revision)
    assert {:error, :conflict} = Programming.assign_template_to_client(f.ctx, f.client.id, :training, t.id, %{})
  end
end

defmodule Easy.Training.ProgrammingPrescriptionTest do
  use Easy.DataCase, async: true

  alias Easy.Repo
  alias Easy.Training.{PrescribedExercise, Programming, TrainingPlan, TrainingWorkout, WorkoutSchedule}

  describe "replace_prescription/4" do
    test "casts string-keyed nested input without accepting tenant or parent overrides" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      exercise = insert(:exercise, business: coach.business)
      foreign_id = Ecto.UUID.generate()

      attrs = %{
        "workouts" => [
          %{
            "local_ref" => "lower",
            "name" => "Lower",
            "position" => "2",
            "business_id" => foreign_id,
            "training_plan_id" => foreign_id,
            "prescribed_exercises" => [
              %{
                "local_ref" => "squat",
                "exercise_id" => exercise.id,
                "position" => "3",
                "business_id" => foreign_id,
                "training_workout_id" => foreign_id,
                "prescribed_sets" => [%{"reps" => "5", "rest_seconds" => "60"}]
              }
            ]
          }
        ],
        "schedule" => Enum.map(WorkoutSchedule.weekdays(), &%{"weekday" => to_string(&1), "workout_ref" => "lower"})
      }

      assert {:ok, replaced} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)
      assert [workout] = replaced.workouts
      assert workout.position == 2
      assert workout.business_id == coach.business_id
      assert workout.training_plan_id == template.id
      assert [item] = workout.prescribed_exercises
      assert item.position == 3
      assert item.business_id == coach.business_id
      assert item.training_workout_id == workout.id
      assert [%{reps: "5", rest_seconds: 60}] = item.prescribed_sets
      assert length(replaced.workout_schedule) == 7
      assert Enum.all?(replaced.workout_schedule, &(&1.training_workout_id == workout.id))
    end

    test "creates an explicitly ordered complete Prescription and resolves local references" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      squat = insert(:exercise, business: coach.business, name: "Back Squat")
      press = insert(:exercise, business: coach.business, name: "Press")

      attrs = %{
        workouts: [
          workout_input("upper", "Upper", 30, [
            exercise_input("press", press.id, 20, [
              %{set_type: "warmup", reps: "10", rest_seconds: 60, notes: "Controlled"}
            ])
          ]),
          workout_input("lower", "Lower", 10, [
            exercise_input("squat", squat.id, 40, [
              %{set_type: "working", reps: "5", load_value: "100", load_unit: "kg", rpe: "8.5"}
            ])
          ])
        ],
        schedule: schedule(%{monday: {:ref, "lower"}, wednesday: {:ref, "lower"}, friday: {:ref, "upper"}})
      }

      assert {:ok, replaced} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)
      assert replaced.revision == 2

      assert [lower, upper] = replaced.workouts
      assert lower.name == "Lower"
      assert lower.position == 10
      assert upper.name == "Upper"
      assert upper.position == 30

      assert [%{position: 40, exercise_id: squat_id, prescribed_sets: [set]}] = lower.prescribed_exercises
      assert squat_id == squat.id
      assert set.set_type == :working
      assert set.reps == "5"
      assert Decimal.equal?(set.load_value, Decimal.new("100"))
      assert set.load_unit == :kg
      assert Decimal.equal?(set.rpe, Decimal.new("8.5"))

      assert Enum.map(replaced.workout_schedule, &{&1.weekday, &1.training_workout_id}) == [
               {:monday, lower.id},
               {:wednesday, lower.id},
               {:friday, upper.id}
             ]
    end

    test "retains persisted identities, sparse positions, reorders nodes, and deletes omitted nodes" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      exercise = insert(:exercise, business: coach.business)
      first = insert(:workout, business: coach.business, plan: template, name: "First", position: 0)
      second = insert(:workout, business: coach.business, plan: template, name: "Second", position: 1)
      omitted_workout = insert(:workout, business: coach.business, plan: template, name: "Omitted", position: 2)
      kept = insert(:prescribed_exercise, business: coach.business, workout: first, exercise: exercise, position: 0)
      omitted = insert(:prescribed_exercise, business: coach.business, workout: first, exercise: exercise, position: 1)

      insert(:workout_schedule,
        business: coach.business,
        plan: template,
        workout: first,
        weekday: :tuesday
      )

      attrs = %{
        workouts: [
          persisted_workout_input(first.id, "First revised", 20, [
            persisted_exercise_input(kept.id, exercise.id, 50, [%{reps: "12"}])
          ]),
          persisted_workout_input(second.id, "Second revised", 10, [])
        ],
        schedule: schedule(%{monday: {:id, second.id}, sunday: {:id, first.id}})
      }

      assert {:ok, replaced} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)

      assert Enum.map(replaced.workouts, &{&1.id, &1.name, &1.position}) == [
               {second.id, "Second revised", 10},
               {first.id, "First revised", 20}
             ]

      reloaded_first = Enum.find(replaced.workouts, &(&1.id == first.id))
      assert [%{id: kept_id, position: 50, prescribed_sets: [%{reps: "12"}]}] = reloaded_first.prescribed_exercises
      assert kept_id == kept.id
      assert Repo.get(PrescribedExercise, omitted.id) == nil
      assert Repo.get(TrainingWorkout, omitted_workout.id) == nil
      assert Enum.map(replaced.workout_schedule, & &1.weekday) == [:monday, :sunday]
    end

    test "moves a retained workout to max position while deleting an omitted max-position workout" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      retained = insert(:workout, business: coach.business, plan: template, name: "Retained", position: 0)
      omitted = insert(:workout, business: coach.business, plan: template, name: "Omitted", position: 2_147_483_647)

      attrs = %{
        workouts: [
          persisted_workout_input(retained.id, "Retained at max", 2_147_483_647, [])
        ],
        schedule: schedule(%{monday: {:id, retained.id}})
      }

      assert {:ok, replaced} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)

      assert [%{id: retained_id, name: "Retained at max", position: 2_147_483_647}] = replaced.workouts
      assert retained_id == retained.id
      assert Repo.get(TrainingWorkout, omitted.id) == nil
      assert Repo.get!(TrainingWorkout, retained.id).position == 2_147_483_647
    end

    test "keeps retained workout positions when staging but final positions equal original positions" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      first = insert(:workout, business: coach.business, plan: template, name: "First", position: 1)
      second = insert(:workout, business: coach.business, plan: template, name: "Second", position: 2)

      attrs = %{
        workouts: [
          persisted_workout_input(first.id, "First renamed", 1, []),
          persisted_workout_input(second.id, "Second renamed", 2, []),
          workout_input("new", "New", 3, [])
        ],
        schedule: schedule(%{monday: {:id, first.id}, tuesday: {:id, second.id}, wednesday: {:ref, "new"}})
      }

      assert {:ok, replaced} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)

      assert Enum.map(replaced.workouts, &{&1.name, &1.position}) == [
               {"First renamed", 1},
               {"Second renamed", 2},
               {"New", 3}
             ]

      assert Repo.get!(TrainingWorkout, first.id).position == 1
      assert Repo.get!(TrainingWorkout, second.id).position == 2
    end

    test "moves a retained Prescribed Exercise to max position while deleting an omitted max-position exercise" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      exercise = insert(:exercise, business: coach.business)
      workout = insert(:workout, business: coach.business, plan: template, name: "Lower", position: 0)

      retained =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: workout,
          exercise: exercise,
          position: 0
        )

      omitted =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: workout,
          exercise: exercise,
          position: 2_147_483_647
        )

      attrs = %{
        workouts: [
          persisted_workout_input(workout.id, "Lower", 0, [
            persisted_exercise_input(retained.id, exercise.id, 2_147_483_647, [%{reps: "5"}])
          ])
        ],
        schedule: schedule(%{monday: {:id, workout.id}})
      }

      assert {:ok, replaced} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)

      assert [%{prescribed_exercises: [%{id: retained_id, position: 2_147_483_647}]}] = replaced.workouts
      assert retained_id == retained.id
      assert Repo.get(PrescribedExercise, omitted.id) == nil
      assert Repo.get!(PrescribedExercise, retained.id).position == 2_147_483_647
    end

    test "keeps retained Prescribed Exercise positions when staging but final positions equal originals" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      squat = insert(:exercise, business: coach.business)
      press = insert(:exercise, business: coach.business)
      row = insert(:workout, business: coach.business, plan: template, name: "Lower", position: 0)
      first = insert(:prescribed_exercise, business: coach.business, workout: row, exercise: squat, position: 1)
      second = insert(:prescribed_exercise, business: coach.business, workout: row, exercise: press, position: 2)

      attrs = %{
        workouts: [
          persisted_workout_input(row.id, "Lower", 0, [
            persisted_exercise_input(first.id, squat.id, 1, [%{reps: "5"}]),
            persisted_exercise_input(second.id, press.id, 2, [%{reps: "8"}]),
            exercise_input("new", squat.id, 3, [%{reps: "10"}])
          ])
        ],
        schedule: schedule(%{monday: {:id, row.id}})
      }

      assert {:ok, replaced} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)

      assert [
               %{
                 prescribed_exercises: [
                   %{id: first_id, position: 1},
                   %{id: second_id, position: 2},
                   %{position: 3}
                 ]
               }
             ] = replaced.workouts

      assert first_id == first.id
      assert second_id == second.id
      assert Repo.get!(PrescribedExercise, first.id).position == 1
      assert Repo.get!(PrescribedExercise, second.id).position == 2
    end

    test "accepts partial valid Prescribed Sets" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      squat = insert(:exercise, business: coach.business, name: "Back Squat")

      attrs = %{
        workouts: [
          workout_input("lower", "Lower", 0, [
            exercise_input("squat", squat.id, 0, [
              %{reps: "5", duration_seconds: 0, rest_seconds: 0}
            ])
          ])
        ],
        schedule: schedule()
      }

      assert {:ok, replaced} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)

      assert [%{prescribed_exercises: [%{prescribed_sets: [set]}]}] = replaced.workouts
      assert set.reps == "5"
      assert set.duration_seconds == 0
      assert set.rest_seconds == 0
    end

    test "rejects stale revisions without changing the Prescription" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user, revision: 4)
      workout = insert(:workout, business: coach.business, plan: template, position: 0)

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %TrainingPlan{revision: 4}}} =
               Programming.replace_prescription(trainer_ctx(coach), template.id, 3, %{
                 workouts: [],
                 schedule: schedule()
               })

      assert Repo.get!(TrainingWorkout, workout.id)
    end

    test "rejects malformed exercise collections before replacing existing prescription rows" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      workout = insert(:workout, business: coach.business, plan: template, position: 0)

      for exercises <- [nil, %{}, [nil], ["invalid"], [42]] do
        attrs = %{workouts: [workout_input("new", "New", 0, exercises)], schedule: schedule()}

        assert {:error, changeset} =
                 Programming.replace_prescription(trainer_ctx(coach), template.id, template.revision, attrs)

        assert Keyword.has_key?(changeset.errors, :workouts)
        assert Repo.get!(TrainingWorkout, workout.id).name == workout.name
        assert Repo.get!(TrainingPlan, template.id).revision == template.revision
      end
    end

    test "rejects malformed set collections without changing existing prescription rows" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      workout = insert(:workout, business: coach.business, plan: template, position: 0)
      exercise = insert(:exercise, business: coach.business)
      item = insert(:prescribed_exercise, business: coach.business, workout: workout, exercise: exercise, position: 0)

      for sets <- [nil, %{}, [nil], ["invalid"], [42]] do
        attrs = %{
          workouts: [
            persisted_workout_input(workout.id, "Changed", 0, [
              persisted_exercise_input(item.id, exercise.id, 0, sets)
            ])
          ],
          schedule: schedule()
        }

        assert {:error, %Ecto.Changeset{valid?: false} = changeset} =
                 Programming.replace_prescription(trainer_ctx(coach), template.id, template.revision, attrs)

        assert Keyword.has_key?(changeset.errors, :workouts)
        assert Repo.get!(TrainingWorkout, workout.id).name == workout.name
        assert Repo.get!(PrescribedExercise, item.id).prescribed_sets == item.prescribed_sets
        assert Repo.get!(TrainingPlan, template.id).revision == template.revision
      end
    end

    test "rejects duplicate local references, invalid positions, and duplicate weekdays atomically" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)

      invalid_requests = [
        %{
          workouts: [workout_input("same", "One", 0, []), workout_input("same", "Two", 1, [])],
          schedule: schedule()
        },
        %{
          workouts: [workout_input("one", "One", -1, [])],
          schedule: schedule()
        },
        %{
          workouts: [workout_input("one", "One", 1, []), workout_input("two", "Two", 1, [])],
          schedule: schedule()
        },
        %{
          workouts: [
            workout_input("one", "One", 1, [
              exercise_input("squat", insert(:exercise, business: coach.business).id, -1, [])
            ])
          ],
          schedule: schedule()
        },
        %{
          workouts: [workout_input("one", "One", 0, [])],
          schedule: List.replace_at(schedule(%{monday: {:ref, "one"}}), 1, schedule_entry(:monday, {:ref, "one"}))
        }
      ]

      for attrs <- invalid_requests do
        assert {:error, %Ecto.Changeset{valid?: false}} =
                 Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)

        assert Repo.aggregate(TrainingWorkout, :count, :id) == 0
        assert Repo.get!(TrainingPlan, template.id).revision == 1
      end
    end

    test "rejects cross-plan schedule references and invisible exercises without partial writes" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      other_template = insert(:training_plan, business: coach.business, creator: coach.user)
      other_workout = insert(:workout, business: coach.business, plan: other_template, position: 0)
      hidden_exercise = insert(:exercise)

      requests = [
        %{
          workouts: [workout_input("one", "One", 0, [])],
          schedule: schedule(%{monday: {:id, other_workout.id}})
        },
        %{
          workouts: [workout_input("one", "One", 0, [exercise_input("hidden", hidden_exercise.id, 0, [])])],
          schedule: schedule()
        }
      ]

      for attrs <- requests do
        assert {:error, reason} = Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)
        assert reason == :not_found or match?(%Ecto.Changeset{valid?: false}, reason)
        assert Repo.aggregate(TrainingWorkout.for_plan(template.id), :count, :id) == 0
        assert Repo.get!(TrainingPlan, template.id).revision == 1
      end
    end

    test "rolls back structural writes when a Prescribed Set is invalid" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      exercise = insert(:exercise, business: coach.business)
      workout = insert(:workout, business: coach.business, plan: template, position: 0)
      item = insert(:prescribed_exercise, business: coach.business, workout: workout, exercise: exercise, position: 0)

      attrs = %{
        workouts: [
          persisted_workout_input(workout.id, "Changed", 0, [
            persisted_exercise_input(item.id, exercise.id, 0, [%{rest_seconds: -1}])
          ])
        ],
        schedule: schedule(%{monday: {:id, workout.id}})
      }

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_prescription(trainer_ctx(coach), template.id, 1, attrs)

      assert Repo.get!(TrainingWorkout, workout.id).name != "Changed"
      assert Repo.get!(TrainingWorkout, workout.id).position == 0
      assert Repo.get!(TrainingPlan, template.id).revision == 1
      assert Repo.aggregate(WorkoutSchedule.for_plan(template.id), :count, :id) == 0
    end
  end

  defp workout_input(ref, name, position, exercises) do
    %{local_ref: ref, name: name, position: position, prescribed_exercises: exercises}
  end

  defp persisted_workout_input(id, name, position, exercises) do
    %{id: id, name: name, position: position, prescribed_exercises: exercises}
  end

  defp exercise_input(ref, exercise_id, position, sets) do
    %{local_ref: ref, exercise_id: exercise_id, position: position, prescribed_sets: sets}
  end

  defp persisted_exercise_input(id, exercise_id, position, sets) do
    %{id: id, exercise_id: exercise_id, position: position, prescribed_sets: sets}
  end

  defp schedule(overrides \\ %{}) do
    Enum.map(WorkoutSchedule.weekdays(), fn weekday ->
      schedule_entry(weekday, Map.get(overrides, weekday))
    end)
  end

  defp schedule_entry(weekday, nil), do: %{weekday: weekday}
  defp schedule_entry(weekday, {:id, id}), do: %{weekday: weekday, workout_id: id}
  defp schedule_entry(weekday, {:ref, ref}), do: %{weekday: weekday, workout_ref: ref}
end

unless Mix.env() == :dev, do: raise("Development fixtures only")
Logger.configure(level: :warning)

defmodule Easy.Repo.Seeds.WorkoutWeek do
  import Ecto.Query

  alias Easy.Billing.BusinessBilling
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Easy.Workouts
  alias Easy.Workouts.{Exercise, Workout, WorkoutSchedule}

  @spec reset() :: :ok
  def reset do
    handles = ["workout-week-375", "workout-week-1280"]
    ids = Repo.all(from(b in Business, where: b.handle in ^handles, select: b.id))

    {:ok, :ok} =
      Repo.transaction(fn ->
        Enum.each([WorkoutSchedule, Workout, Exercise], fn schema ->
          Repo.delete_all(from(row in schema, where: row.business_id in ^ids))
        end)
      end)

    :ok
  end

  @spec run(integer()) :: map()
  def run(width) do
    now = DateTime.utc_now(:second)
    email = "workout-coach-#{width}@example.test"
    owner = get_or_insert(User, %{email: email}, %{full_name: "Sam", email_confirmed_at: now})
    business = get_or_insert(Business, %{handle: "workout-week-#{width}"}, %{name: "Workout week #{width}", timezone: "Etc/UTC", owner_user_id: owner.id})
    get_or_insert(BusinessBilling, %{business_id: business.id}, %{free_seats: 3})
    coach = get_or_insert(Coach, %{business_id: business.id, email: email}, %{user_id: owner.id, full_name: owner.full_name})
    client_user = get_or_insert(User, %{email: "workout-client-#{width}@example.test"}, %{full_name: "Maya Patel", email_confirmed_at: now})

    client =
      get_or_insert(Client, %{business_id: business.id, email: client_user.email}, %{
        coach_id: coach.id,
        user_id: client_user.id,
        full_name: "Maya Patel",
        preferred_name: "Maya",
        unit_system: :metric
      })

    get_or_insert(CoachingTerm, %{client_id: client.id}, %{starts_on: Date.add(Date.utc_today(), -45)})
    ctx = %Ctx{business_id: business.id, user_id: owner.id, coach_id: coach.id, owner?: true}
    rows = seed_week(ctx, client.id, width)
    Map.merge(rows, %{coachEmail: email, clientId: client.id, coachId: coach.id, today: Date.to_iso8601(Date.utc_today())})
  end

  defp seed_week(ctx, client_id, width) do
    squat = builtin("Back squat")
    plank = builtin("Plank")

    lower = %{
      name: "Lower A",
      type: :prescribed,
      description: "Warm up 10 minutes before you start. Stop a set if your form breaks down.",
      groups: [
        %{name: "Main lift", rounds: 4, exercises: [item(squat.id, %{"reps" => exact(5), "weight" => exact(80)}, exact(180))]},
        %{name: "Core", rounds: 3, exercises: [item(plank.id, %{"duration" => exact(30)}, exact(45))]}
      ]
    }

    {:ok, %{data: workout}} = Workouts.create_workout_for_client(ctx, client_id, lower)
    {:ok, %{data: schedule}} = Workouts.add_schedule_for_client(ctx, client_id, %{workout_id: workout.id, weekdays_mask: 9})
    schedule |> Ecto.Changeset.change(from_date: Date.add(Date.utc_today(), -30)) |> Repo.update!()
    {:ok, %{data: session}} = Workouts.create_workout_for_client(ctx, client_id, %{name: "PT session", type: :open})
    {:ok, _} = Workouts.add_schedule_for_client(ctx, client_id, %{workout_id: session.id, weekdays_mask: 4, time: "18:00", place: "Iron Works gym", coach_id: ctx.coach_id})
    {:ok, library} = Workouts.create_workout(ctx, %{lower | name: "Full body B"})
    {:ok, builder} = Workouts.create_workout(ctx, %{name: "Builder practice #{width}", type: :prescribed, groups: []})
    %{pastWorkoutId: workout.id, pastScheduleId: schedule.id, libraryWorkoutId: library.id, builderWorkoutId: builder.id, libraryName: library.name, pastName: workout.name}
  end

  defp item(id, targets, rest), do: %{exercise_id: id, targets_mode: :same_for_all, targets: [targets], rest: [rest]}
  defp exact(value), do: %{"mode" => "exact", "value" => value}
  defp builtin(name), do: Repo.one!(from(e in Exercise, where: is_nil(e.business_id) and e.name == ^name))
  defp get_or_insert(schema, identity, attrs), do: Repo.get_by(schema, identity) || Repo.insert!(struct(schema, Map.merge(identity, attrs)))
end

if "--reset" in System.argv(), do: Easy.Repo.Seeds.WorkoutWeek.reset()
fixtures = Map.new([375, 1280], fn width -> {to_string(width), Easy.Repo.Seeds.WorkoutWeek.run(width)} end)
destination = Path.expand("../../../.scratch/workout/browser-fixtures.json", __DIR__)
File.write!(destination, Jason.encode!(fixtures, pretty: true))
IO.puts("Workout week fixtures saved to #{destination}")

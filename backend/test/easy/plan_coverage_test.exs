defmodule Easy.PlanCoverageTest do
  use Easy.DataCase, async: true

  alias Easy.Clients.Client
  alias Easy.PlanCoverage

  for factory <- [:training_plan, :nutrition_plan] do
    @factory factory

    test "#{factory}: a prepared plan waits and covers acceptance through the inclusive term end" do
      today = Date.utc_today()
      plan = coverage_plan(@factory, today, [], inserted_on: Date.add(today, -7))
      assert_coverage(plan, today, :waiting)

      insert(:coaching_term, client_id: plan.client_id, starts_on: today, ends_on: Date.add(today, 7))
      plan = Repo.preload(plan, [client: [:business, :terms]], force: true)
      assert_coverage(plan, today, :current)
      assert_coverage(plan, Date.add(today, 7), :current)
      assert_coverage(plan, Date.add(today, 8), :ended)
      assert PlanCoverage.stopped_on(plan, Date.add(today, 8)) == Date.add(today, 7)
      assert PlanCoverage.effective_end(plan) == Date.add(today, 7)
    end

    test "#{factory}: a plan created during earlier coaching stays stopped even when scheduled after that term" do
      today = Date.utc_today()
      ended = Date.add(today, -10)
      terms = [build(:coaching_term, starts_on: Date.add(today, -30), ends_on: ended), build(:coaching_term, starts_on: today)]
      plan = coverage_plan(@factory, today, terms, inserted_on: Date.add(today, -20))

      assert_coverage(plan, today, :ended)
      assert PlanCoverage.stopped_on(plan, today) == ended
      assert PlanCoverage.effective_end(plan) == ended
    end

    test "#{factory}: a plan created between terms becomes current when coaching returns" do
      today = Date.utc_today()
      terms = [build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -10)), build(:coaching_term, starts_on: today)]
      plan = coverage_plan(@factory, Date.add(today, -5), terms, inserted_on: Date.add(today, -5))

      assert_coverage(plan, Date.add(today, -1), :waiting)
      assert_coverage(plan, today, :current)
      assert PlanCoverage.stopped_on(plan, today) == nil
      assert PlanCoverage.effective_end(plan) == nil
    end

    test "#{factory}: own plan dates bound coverage before a later coaching end" do
      today = Date.utc_today()
      terms = [build(:coaching_term, starts_on: Date.add(today, -7), ends_on: Date.add(today, 7))]
      plan = coverage_plan(@factory, today, terms, inserted_on: Date.add(today, -7), end_date: today)

      assert_coverage(plan, Date.add(today, -1), :upcoming)
      assert_coverage(plan, today, :current)
      assert_coverage(plan, Date.add(today, 1), :ended)
      assert PlanCoverage.stopped_on(plan, Date.add(today, 8)) == nil
      assert PlanCoverage.effective_end(plan) == today
    end

    test "#{factory}: creation uses the client timezone with business fallback at midnight" do
      today = Date.utc_today()
      created = Date.add(today, -10)
      ending = Date.add(created, -1)
      business = insert(:business, timezone: "America/Los_Angeles")
      inserted_at = DateTime.new!(created, ~T[00:30:00], "Etc/UTC")

      for {timezone, expected} <- [{nil, :ended}, {"Pacific/Kiritimati", :current}] do
        terms = [build(:coaching_term, starts_on: Date.add(today, -30), ends_on: ending), build(:coaching_term, starts_on: today)]
        client = insert(:client, business: business, timezone: timezone, terms: terms)

        plan =
          insert(@factory,
            business: business,
            client: client,
            start_date: today,
            inserted_at: inserted_at,
            created_local_date: Client.local_date(%{client | business: business}, inserted_at)
          )

        plan = Repo.preload(plan, client: [:business, :terms])

        assert_coverage(plan, today, expected)
        assert PlanCoverage.stopped_on(plan, today) == if(expected == :ended, do: ending)
      end
    end
  end

  defp coverage_plan(factory, start_date, terms, opts) do
    client = insert(:client, timezone: "Etc/UTC", terms: terms)
    inserted_at = DateTime.new!(Keyword.fetch!(opts, :inserted_on), ~T[12:00:00], "Etc/UTC")

    attrs = [
      business: client.business,
      client: client,
      start_date: start_date,
      end_date: opts[:end_date],
      inserted_at: inserted_at,
      created_local_date: Keyword.fetch!(opts, :inserted_on)
    ]

    factory
    |> insert(attrs)
    |> Repo.preload(client: [:business, :terms])
  end

  defp assert_coverage(plan, date, expected) do
    assert PlanCoverage.lifecycle(plan, date) == expected
    query = from(p in plan.__struct__, where: p.id == ^plan.id, select: p.id)
    assert query |> PlanCoverage.in_force(date) |> Repo.all() == if(expected == :current, do: [plan.id], else: [])
  end
end

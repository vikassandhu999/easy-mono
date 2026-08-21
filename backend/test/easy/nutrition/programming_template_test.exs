defmodule Easy.Nutrition.ProgrammingTemplateTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{DayPattern, Plan, Programming, WeekSchedule}
  alias Easy.Repo

  describe "create_template/2 and list_templates/2" do
    test "creates a Template with one empty Everyday Day Pattern assigned to every weekday" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      assert {:ok, template} =
               Programming.create_template(ctx, %{
                 "name" => "  Cut Block  ",
                 "description" => "Reusable cutting Template",
                 "target_calories" => 2000.0,
                 "target_protein_g" => 150.0
               })

      assert template.kind == :template
      assert template.name == "Cut Block"
      assert template.description == "Reusable cutting Template"
      assert template.revision == 1
      assert template.archived_at == nil
      assert template.client_id == nil
      assert template.source_template_id == nil
      assert template.start_date == nil
      assert template.end_date == nil
      assert template.target_calories == 2000.0
      assert template.target_protein_g == 150.0
      assert template.business_id == coach.business_id
      assert template.creator_id == coach.user_id

      assert [%DayPattern{name: "Everyday", position: 0, id: pattern_id}] = template.day_patterns
      assert length(template.week_schedule) == 7

      assert Enum.map(template.week_schedule, & &1.weekday) == WeekSchedule.weekdays()
      assert Enum.all?(template.week_schedule, &(&1.nutrition_day_pattern_id == pattern_id))
    end

    test "lists only matching Templates from the business" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "High Protein"})
      insert(:plan, business: coach.business, creator: coach.user, name: "Recovery")
      other = insert(:coach)
      insert(:plan, business: other.business, creator: other.user, name: "Other High Protein")

      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan
      )

      assert {:ok, %{count: 1, templates: [listed]}} =
               Programming.list_templates(ctx, search: "protein", limit: 20, offset: 0)

      assert listed.id == template.id
      assert listed.kind == :template
    end

    test "rejects Client Plan fields and invalid names" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      assert {:error, relationship_fields} =
               Programming.create_template(ctx, %{
                 "name" => "Invalid",
                 "client_id" => Ecto.UUID.generate(),
                 "start_date" => "2026-08-15"
               })

      assert %{client_id: [_], start_date: [_]} = errors_on(relationship_fields)

      assert {:error, blank_name} = Programming.create_template(ctx, %{"name" => "   "})
      assert %{name: ["can't be blank"]} = errors_on(blank_name)

      assert {:error, negative} =
               Programming.create_template(ctx, %{"name" => "Invalid", "target_calories" => -1})

      assert %{target_calories: [_]} = errors_on(negative)
    end
  end

  describe "duplicate_template/3" do
    test "duplicates an active Template, including its Everyday Day Pattern and Week Schedule" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      assert {:ok, template} =
               Programming.create_template(ctx, %{
                 "name" => "Strength Base",
                 "target_protein_g" => 140.0
               })

      assert {:ok, copy} = Programming.duplicate_template(ctx, template.id, 1)
      assert copy.id != template.id
      assert copy.kind == :template
      assert copy.name == "Strength Base (Copy)"
      assert copy.revision == 1
      assert copy.target_protein_g == 140.0
      assert [%{name: "Everyday", position: 0, id: pattern_id}] = copy.day_patterns
      assert length(copy.week_schedule) == 7
      assert Enum.all?(copy.week_schedule, &(&1.nutrition_day_pattern_id == pattern_id))
      assert Repo.get!(Plan, template.id).revision == 1
    end

    test "rejects an archived Template, a Client Plan, and a stale source revision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Source"})
      assert {:ok, archived} = Programming.archive_template(ctx, template.id, 1)

      assert {:error, :not_found} = Programming.duplicate_template(ctx, archived.id, 2)

      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      client_plan =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan
        )

      assert {:error, :not_found} = Programming.duplicate_template(ctx, client_plan.id, 1)

      assert {:ok, active} = Programming.create_template(ctx, %{"name" => "Fresh"})

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Plan{revision: 1}}} =
               Programming.duplicate_template(ctx, active.id, 9)
    end
  end

  describe "list_templates/2 assigned_client_count" do
    test "counts distinct active Client Plans that still point at the Template" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      one = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      two = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      gone = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      for client <- [one, two] do
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          source_template: template,
          kind: :client_plan,
          start_date: ~D[2026-09-01],
          end_date: ~D[2026-09-30]
        )
      end

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: one,
        source_template: template,
        kind: :client_plan,
        start_date: ~D[2026-10-01],
        end_date: ~D[2026-10-31]
      )

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: gone,
        source_template: template,
        kind: :client_plan,
        archived_at: ~U[2026-08-15 12:00:00Z]
      )

      assert {:ok, %{count: 1, templates: [listed]}} = Programming.list_templates(ctx)
      assert listed.id == template.id
      assert listed.assigned_client_count == 2
    end
  end
end

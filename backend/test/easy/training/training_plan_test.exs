defmodule Easy.Training.TrainingPlanTest do
  use Easy.SchemaCase

  alias Easy.Training.TrainingPlan

  describe "create_changeset/3" do
    test "sets trusted business and author ids from arguments" do
      business_id = Ecto.UUID.generate()
      author_id = Ecto.UUID.generate()

      changeset =
        TrainingPlan.create_changeset(business_id, author_id, %{
          "name" => "Strength Template",
          "description" => "Four day split",
          "status" => "active",
          "rest_days" => ["saturday", "sunday"]
        })

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :business_id) == business_id
      assert Ecto.Changeset.get_field(changeset, :author_id) == author_id
      assert Ecto.Changeset.get_field(changeset, :name) == "Strength Template"
      assert Ecto.Changeset.get_field(changeset, :rest_days) == ["saturday", "sunday"]
    end

    test "rejects trusted relationship ids from attrs" do
      business_id = Ecto.UUID.generate()
      author_id = Ecto.UUID.generate()

      changeset =
        TrainingPlan.create_changeset(business_id, author_id, %{
          "name" => "Strength Template",
          "business_id" => Ecto.UUID.generate(),
          "author_id" => Ecto.UUID.generate(),
          "client_id" => Ecto.UUID.generate(),
          "original_template_id" => Ecto.UUID.generate()
        })

      assert %{
               business_id: ["cannot be set directly"],
               author_id: ["cannot be set directly"],
               client_id: ["cannot be set directly"],
               original_template_id: ["cannot be set directly"]
             } = errors_on(changeset)
    end

    test "requires a name" do
      changeset = TrainingPlan.create_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), %{})

      assert %{name: ["can't be blank"]} = errors_on(changeset)
    end
  end

  describe "update_changeset/2" do
    test "updates editable fields" do
      plan = build(:training_plan)

      changeset =
        TrainingPlan.update_changeset(plan, %{
          "name" => "Updated Template",
          "description" => "New description",
          "status" => "archived",
          "rest_days" => ["monday"]
        })

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :name) == "Updated Template"
      assert Ecto.Changeset.get_field(changeset, :description) == "New description"
      assert Ecto.Changeset.get_field(changeset, :status) == :archived
      assert Ecto.Changeset.get_field(changeset, :rest_days) == ["monday"]
    end

    test "rejects trusted relationship ids from attrs" do
      plan = build(:training_plan)

      changeset =
        TrainingPlan.update_changeset(plan, %{
          "business_id" => Ecto.UUID.generate(),
          "author_id" => Ecto.UUID.generate(),
          "client_id" => Ecto.UUID.generate(),
          "original_template_id" => Ecto.UUID.generate()
        })

      assert %{
               business_id: ["cannot be set directly"],
               author_id: ["cannot be set directly"],
               client_id: ["cannot be set directly"],
               original_template_id: ["cannot be set directly"]
             } = errors_on(changeset)
    end

    test "accepts the seven supported rest days" do
      plan = build(:training_plan)

      changeset =
        TrainingPlan.update_changeset(plan, %{
          "rest_days" => [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday"
          ]
        })

      assert changeset.valid?
    end

    test "rejects unknown rest days" do
      plan = build(:training_plan)

      changeset = TrainingPlan.update_changeset(plan, %{"rest_days" => ["restday"]})

      assert %{rest_days: ["must contain valid day names"]} = errors_on(changeset)
    end

    test "rejects duplicate rest days" do
      plan = build(:training_plan)

      changeset = TrainingPlan.update_changeset(plan, %{"rest_days" => ["monday", "monday"]})

      assert %{rest_days: ["must not contain duplicates"]} = errors_on(changeset)
    end

    test "requires dates when the existing plan is assigned to a client" do
      plan =
        build(:training_plan,
          business_id: Ecto.UUID.generate(),
          author_id: Ecto.UUID.generate(),
          client_id: Ecto.UUID.generate(),
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-01-31]
        )

      changeset =
        TrainingPlan.update_changeset(plan, %{
          "start_date" => nil,
          "end_date" => nil
        })

      assert %{
               start_date: ["assigned plan must have a start date"],
               end_date: ["assigned plan must have an end date"]
             } = errors_on(changeset)
    end

    test "rejects end date before start date for assigned plans" do
      plan =
        build(:training_plan,
          business_id: Ecto.UUID.generate(),
          author_id: Ecto.UUID.generate(),
          client_id: Ecto.UUID.generate(),
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-01-31]
        )

      changeset =
        TrainingPlan.update_changeset(plan, %{
          "start_date" => ~D[2026-02-01],
          "end_date" => ~D[2026-01-31]
        })

      assert %{end_date: ["must be after or equal to start date"]} = errors_on(changeset)
    end
  end
end

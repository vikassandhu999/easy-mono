defmodule Easy.Training.TrainingPlanTest do
  use Easy.SchemaCase

  alias Easy.Training.TrainingPlan

  describe "insert_changeset/3" do
    test "sets trusted business and creator ids from arguments" do
      business_id = Ecto.UUID.generate()
      creator_id = Ecto.UUID.generate()

      changeset =
        TrainingPlan.insert_changeset(business_id, creator_id, %{
          "name" => "Strength Template",
          "description" => "Four day split"
        })

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :kind) == :template
      assert Ecto.Changeset.get_field(changeset, :business_id) == business_id
      assert Ecto.Changeset.get_field(changeset, :creator_id) == creator_id
      assert Ecto.Changeset.get_field(changeset, :name) == "Strength Template"
    end

    test "ignores trusted relationship ids supplied in attrs" do
      business_id = Ecto.UUID.generate()
      creator_id = Ecto.UUID.generate()

      changeset =
        TrainingPlan.insert_changeset(business_id, creator_id, %{
          "name" => "Strength Template",
          "business_id" => Ecto.UUID.generate(),
          "creator_id" => Ecto.UUID.generate(),
          "client_id" => Ecto.UUID.generate(),
          "source_template_id" => Ecto.UUID.generate()
        })

      assert Ecto.Changeset.get_field(changeset, :business_id) == business_id
      assert Ecto.Changeset.get_field(changeset, :creator_id) == creator_id
      assert is_nil(Ecto.Changeset.get_field(changeset, :client_id))
      assert is_nil(Ecto.Changeset.get_field(changeset, :source_template_id))
    end

    test "requires a name" do
      changeset = TrainingPlan.insert_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), %{})

      assert %{name: ["can't be blank"]} = errors_on(changeset)
    end
  end

  describe "update_changeset/2" do
    test "updates editable fields" do
      plan = build(:training_plan)

      changeset =
        TrainingPlan.update_changeset(plan, %{
          "name" => "Updated Template",
          "description" => "New description"
        })

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :name) == "Updated Template"
      assert Ecto.Changeset.get_field(changeset, :description) == "New description"
    end

    test "ignores trusted relationship ids supplied in attrs" do
      plan = build(:training_plan, business_id: Ecto.UUID.generate(), creator_id: Ecto.UUID.generate())

      changeset =
        TrainingPlan.update_changeset(plan, %{
          "business_id" => Ecto.UUID.generate(),
          "creator_id" => Ecto.UUID.generate(),
          "client_id" => Ecto.UUID.generate(),
          "source_template_id" => Ecto.UUID.generate()
        })

      assert Ecto.Changeset.get_field(changeset, :business_id) == plan.business_id
      assert Ecto.Changeset.get_field(changeset, :creator_id) == plan.creator_id
      assert is_nil(Ecto.Changeset.get_field(changeset, :client_id))
      assert is_nil(Ecto.Changeset.get_field(changeset, :source_template_id))
    end

    test "permits an open period when the existing plan is assigned to a client" do
      plan =
        build(:training_plan,
          kind: :client_plan,
          business_id: Ecto.UUID.generate(),
          creator_id: Ecto.UUID.generate(),
          client_id: Ecto.UUID.generate(),
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-01-31]
        )

      changeset =
        TrainingPlan.update_changeset(plan, %{
          "start_date" => nil,
          "end_date" => nil
        })

      assert changeset.valid?
      assert {:ok, nil} = Ecto.Changeset.fetch_change(changeset, :start_date)
      assert {:ok, nil} = Ecto.Changeset.fetch_change(changeset, :end_date)
    end

    test "rejects end date before start date for assigned plans" do
      plan =
        build(:training_plan,
          kind: :client_plan,
          business_id: Ecto.UUID.generate(),
          creator_id: Ecto.UUID.generate(),
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

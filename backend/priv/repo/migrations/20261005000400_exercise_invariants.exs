defmodule Easy.Repo.Migrations.ExerciseInvariants do
  use Ecto.Migration

  def change do
    drop unique_index(:exercises, [:name, :business_id],
           name: :training_exercises_name_business_id_index
         )

    execute(
      "CREATE UNIQUE INDEX training_exercises_name_business_id_index ON exercises(business_id,name) NULLS NOT DISTINCT",
      "DROP INDEX training_exercises_name_business_id_index"
    )

    create constraint(:exercises, :exercises_name_not_blank, check: "btrim(name)<>''")
  end
end

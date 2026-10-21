defmodule Easy.Repo.Migrations.TrainingCoverageRange do
  use Ecto.Migration

  def up do
    execute("""
    CREATE FUNCTION plan_coverage_range(client uuid, starting date, ending date, created date) RETURNS daterange LANGUAGE sql STABLE AS $$
      SELECT CASE WHEN starting IS NULL OR plan_coverage_end(client,created,ending)<starting THEN 'empty'::daterange
        ELSE daterange(starting,plan_coverage_end(client,created,ending),'[]') END;
    $$
    """)
  end

  def down, do: execute("DROP FUNCTION plan_coverage_range(uuid,date,date,date)")
end

defmodule Easy.Repo.Migrations.SharedProspectiveOverlap do
  use Ecto.Migration

  def up do
    execute("""
    CREATE FUNCTION plan_coaching_stop(client uuid, created date, as_of date) RETURNS date LANGUAGE sql STABLE AS $$
      SELECT min(t.ends_on) FROM coaching_terms t WHERE t.client_id=client AND t.ends_on>=created
        AND (as_of IS NULL OR t.ends_on<as_of);
    $$
    """)

    execute("""
    CREATE OR REPLACE FUNCTION plan_coverage_end(client uuid, created date, ending date) RETURNS date LANGUAGE sql STABLE AS $$
      SELECT least(ending,plan_coaching_stop(client,created,NULL));
    $$
    """)

    execute("""
    CREATE OR REPLACE FUNCTION plan_coverage_range(client uuid, starting date, ending date, created date) RETURNS daterange LANGUAGE sql STABLE AS $$
      SELECT CASE WHEN starting IS NULL OR bound<starting THEN 'empty'::daterange ELSE daterange(starting,bound,'[]') END
      FROM (SELECT least(ending,plan_coaching_stop(client,created,
        (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(NULLIF(c.timezone,''),b.timezone))::date)) AS bound
        FROM clients c JOIN businesses b ON b.id=c.business_id WHERE c.id=client) period;
    $$
    """)
  end

  def down, do: raise("Prototype reset required")
end

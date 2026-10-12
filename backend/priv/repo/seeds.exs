# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Seeds are modular and idempotent - safe to run multiple times, and this is the
# path the release runs on deploy (Easy.Release.seed/0). Training reference
# data is shared. Each business has its own food and nutrient catalogues.

seeds_dir = Path.join(__DIR__, "seeds")

IO.puts("\n Running database seeds...\n")

Code.eval_file(Path.join(seeds_dir, "training_seeds.exs"))
Easy.Repo.Seeds.Training.run()
Easy.Repo.Seeds.Training.run_exercises()

Code.eval_file(Path.join(seeds_dir, "food_seeds.exs"))
Easy.Repo.Seeds.Foods.run()

if Mix.env() == :dev, do: Code.eval_file(Path.join(__DIR__, "dev_nutrition_week.exs"))

IO.puts("\n Seeds completed!\n")

{:ok, _} = Easy.Trackers.Defaults.seed_builtins()
import Ecto.Query

for business <- Easy.Repo.all(from(b in Easy.Orgs.Business, where: is_nil(b.default_tracker_template_id))) do
  coach = Easy.Repo.one(from(c in Easy.Orgs.Coach, where: c.business_id == ^business.id, limit: 1))

  if coach do
    {:ok, _} = Easy.Trackers.Defaults.create_default(%Easy.Ctx{business_id: business.id, coach_id: coach.id, user_id: coach.user_id, owner?: true})
  end
end

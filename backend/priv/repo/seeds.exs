# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Seeds are modular and idempotent - safe to run multiple times, and this is the
# path the release runs on deploy (Easy.Release.seed/0). It seeds the SYSTEM
# library a fresh business needs: muscles/equipment, exercises, and a curated
# foods subset. (Measurement-unit and subscription-plan seeds are intentionally
# omitted — those schemas don't exist yet; billing is deferred.)
#
# The full foods database (priv/repo/foods_database.csv, ~126k rows) is excluded
# from the Docker image; locally it's used automatically when present, otherwise
# the shipped curated subset (foods_seed.csv) seeds.

seeds_dir = Path.join(__DIR__, "seeds")

IO.puts("\n Running database seeds...\n")

Code.eval_file(Path.join(seeds_dir, "training_seeds.exs"))
Easy.Repo.Seeds.Training.run()
Easy.Repo.Seeds.Training.run_exercises()

Code.eval_file(Path.join(seeds_dir, "food_seeds.exs"))
Easy.Repo.Seeds.Foods.run()

IO.puts("\n Seeds completed!\n")

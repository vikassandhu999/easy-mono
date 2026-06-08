# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Seeds are modular and idempotent - safe to run multiple times.
#
# NOTE: This only seeds lightweight reference data (muscles, equipment).
# For large data imports (exercises from JSON, foods from CSV),
# run separately on your local machine:
#
#     mix run priv/repo/seeds_data.exs

seeds_dir = Path.join(__DIR__, "seeds")

IO.puts("\n Running database seeds...\n")

Code.eval_file(Path.join(seeds_dir, "training_seeds.exs"))
Easy.Repo.Seeds.Training.run()

IO.puts("\n Seeds completed!\n")

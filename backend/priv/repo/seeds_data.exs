# Large data imports — run manually on your local machine:
#
#     mix run priv/repo/seeds_data.exs
#
# Requires these files in priv/repo/:
#   - exercises.json (~1.2 MB, ~800 exercises)
#   - foods_database.csv (~249 MB, ~100k foods)
#
# These files are excluded from the Docker image to keep it small.
# Seeds are idempotent — safe to run multiple times.

seeds_dir = Path.join(__DIR__, "seeds")

IO.puts("\n Running large data seeds...\n")

Code.eval_file(Path.join(seeds_dir, "training_seeds.exs"))
Easy.Repo.Seeds.Training.run_exercises()

Code.eval_file(Path.join(seeds_dir, "food_seeds.exs"))
Easy.Repo.Seeds.Foods.run()

IO.puts("\n Data seeds completed!\n")

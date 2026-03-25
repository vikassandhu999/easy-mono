# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Seeds are modular and idempotent - safe to run multiple times.

seeds_dir = Path.join(__DIR__, "seeds")

IO.puts("\n🌱 Running database seeds...\n")

Code.eval_file(Path.join(seeds_dir, "training_seeds.exs"))
Easy.Repo.Seeds.Training.run()

Code.eval_file(Path.join(seeds_dir, "food_seeds.exs"))
Easy.Repo.Seeds.Foods.run()

IO.puts("\n✅ Seeds completed!\n")

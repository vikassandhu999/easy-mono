# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Seeds are modular and idempotent - safe to run multiple times.

seeds_dir = Path.join(__DIR__, "seeds")

# Load all seed modules
Code.require_file("plans_seeds.exs", seeds_dir)
Code.require_file("measurement_units_seeds.exs", seeds_dir)
Code.require_file("training_seeds.exs", seeds_dir)

IO.puts("\n🌱 Running database seeds...\n")

# Run seeds in order (some may depend on others)
Easy.Repo.Seeds.Plans.run()
Easy.Repo.Seeds.MeasurementUnits.run()
Easy.Repo.Seeds.Training.run()

IO.puts("\n✅ Seeds completed!\n")

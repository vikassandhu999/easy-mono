defmodule Mix.Tasks.SeedFoods do
  use Boundary, classify_to: Easy
  use Mix.Task

  @shortdoc "Seeds the foods database from priv/repo/foods_database.csv"

  @impl Mix.Task
  def run(_args) do
    Mix.Task.run("app.start")

    seeds_path = Path.join(:code.priv_dir(:easy), "repo/seeds/food_seeds.exs")
    Code.eval_file(seeds_path)
    Code.eval_string("Easy.Repo.Seeds.Foods.run()")
  end
end

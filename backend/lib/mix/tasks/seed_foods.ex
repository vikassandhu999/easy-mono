defmodule Mix.Tasks.SeedFoods do
  use Mix.Task

  @shortdoc "Seeds the foods database from priv/repo/foods_database.csv"

  @impl Mix.Task
  def run(_args) do
    Mix.Task.run("app.start")

    seeds_path = Path.join(:code.priv_dir(:easy), "repo/seeds/food_seeds.exs")
    Code.eval_file(seeds_path)
    apply(Easy.Repo.Seeds.Foods, :run, [])
  end
end

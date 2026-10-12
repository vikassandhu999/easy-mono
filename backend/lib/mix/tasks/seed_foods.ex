defmodule Mix.Tasks.SeedFoods do
  use Mix.Task

  @shortdoc "Seeds the tenant food and nutrient catalogues"

  @impl Mix.Task
  @spec run([String.t()]) :: {term(), keyword()}
  def run(_args) do
    Mix.Task.run("app.start")

    seeds_path = Path.join(:code.priv_dir(:easy), "repo/seeds/food_seeds.exs")
    Code.eval_file(seeds_path)
    Code.eval_string("Easy.Repo.Seeds.Foods.run()")
  end
end

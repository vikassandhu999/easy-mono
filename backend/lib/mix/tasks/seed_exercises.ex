defmodule Mix.Tasks.SeedExercises do
  use Mix.Task

  @shortdoc "Seeds muscles, equipment, and exercises from priv/repo/exercises.json"

  @impl Mix.Task
  def run(_args) do
    Mix.Task.run("app.start")

    seeds_path = Path.join(:code.priv_dir(:easy), "repo/seeds/training_seeds.exs")
    Code.eval_file(seeds_path)
    apply(Easy.Repo.Seeds.Training, :run_exercises, [])
  end
end

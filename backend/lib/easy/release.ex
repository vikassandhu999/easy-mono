defmodule Easy.Release do
  @app :easy

  @spec migrate() :: {:ok, [term()]}
  def migrate do
    load_app()

    migration_results =
      for repo <- repos() do
        {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
      end

    {:ok, seed_results} = seed()
    {:ok, migration_results ++ seed_results}
  end

  @spec seed() :: {:ok, [term()]}
  def seed do
    load_app()

    results =
      for repo <- repos() do
        {:ok, _, _} =
          Ecto.Migrator.with_repo(repo, fn _repo ->
            seed_file = Path.join([:code.priv_dir(@app), "repo", "seeds.exs"])

            if File.exists?(seed_file) do
              Code.eval_file(seed_file)
            end
          end)
      end

    {:ok, results}
  end

  @spec rollback(module(), integer()) :: {:ok, [integer()]}
  def rollback(repo, version) do
    load_app()
    {:ok, _, result} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
    {:ok, result}
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end

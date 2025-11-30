defmodule Easy.Release do
  @moduledoc """
  Release tasks for database migrations and other release-time operations.

  Usage:
    bin/easy eval "Easy.Release.migrate"
    bin/easy eval "Easy.Release.rollback(Easy.Repo, 20210101000000)"
  """

  @app :easy

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end

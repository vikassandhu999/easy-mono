defmodule Easy.MixProject do
  use Mix.Project

  def project do
    [
      app: :easy,
      version: "0.1.0",
      elixir: "~> 1.19",
      elixirc_paths: elixirc_paths(Mix.env()),
      test_ignore_filters: ["test/e2e/seed.exs"],
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      releases: releases(),
      listeners: [Phoenix.CodeReloader]
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Easy.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  def cli do
    [
      preferred_envs: [precommit: :test]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:phoenix, "~> 1.8.9"},
      {:phoenix_ecto, "~> 4.5"},
      {:ecto_sql, "~> 3.13"},
      {:telemetry, "~> 1.3"},
      {:postgrex, ">= 0.0.0"},
      {:swoosh, "~> 1.28.0"},
      {:req, "~> 0.5"},
      {:jason, "~> 1.2"},
      {:bandit, "~> 1.12.5"},
      {:joken, "~> 2.6"},
      {:cors_plug, "~> 3.0"},
      {:open_api_spex, "~> 3.22"},
      {:nimble_csv, "~> 1.2"},
      {:tzdata, "~> 1.1"},
      {:ex_machina, "~> 2.8", only: :test},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["deps.get", "ecto.setup"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"],
      precommit: [
        "compile --warnings-as-errors",
        "deps.unlock --unused",
        "format",
        "typed_routes.gen --check",
        "credo --strict",
        "test"
      ],
      check: [
        "format --check-formatted",
        "compile --warnings-as-errors",
        "typed_routes.gen --check",
        "credo --strict"
      ]
    ]
  end

  defp releases do
    [
      easy: [
        include_executables_for: [:unix],
        # Typed routes read typespecs at runtime, including in packaged releases.
        strip_beams: [keep: ["Dbgi"]],
        applications: [runtime_tools: :permanent],
        vm_args: "rel/vm.args.eex"
      ]
    ]
  end
end

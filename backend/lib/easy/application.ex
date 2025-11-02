defmodule Easy.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Easy.Repo,
      {DNSCluster, query: Application.get_env(:easy, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Easy.PubSub},
      # Start a worker by calling: Easy.Worker.start_link(arg)
      # {Easy.Worker, arg},
      # Start to serve requests, typically the last entry
      CoachApp.Endpoint,
      ClientApp.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Easy.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    CoachApp.Endpoint.config_change(changed, removed)
    ClientApp.Endpoint.config_change(changed, removed)
    :ok
  end
end

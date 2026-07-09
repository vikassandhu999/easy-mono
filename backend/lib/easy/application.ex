defmodule Easy.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children =
      [
        Easy.Repo,
        {Phoenix.PubSub, name: Easy.PubSub},
        {Task.Supervisor, name: Easy.TaskSupervisor}
      ] ++ sweeper_child() ++ [EasyWeb.Endpoint]

    opts = [strategy: :one_for_one, name: Easy.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    EasyWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp sweeper_child do
    if Application.get_env(:easy, :start_subscription_sweeper, true),
      do: [Easy.SubscriptionSweeper],
      else: []
  end
end

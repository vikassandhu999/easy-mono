defmodule Easy.Application do
  use Application

  @impl true
  @spec start(Application.start_type(), term()) :: Supervisor.on_start()
  def start(_type, _args) do
    children =
      [
        Easy.Repo,
        {Phoenix.PubSub, name: Easy.PubSub},
        {Task.Supervisor, name: Easy.TaskSupervisor}
      ] ++ sweeper_children() ++ [EasyWeb.Endpoint]

    opts = [strategy: :one_for_one, name: Easy.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  @spec config_change(keyword(), keyword(), [atom()]) :: :ok
  def config_change(changed, _new, removed) do
    EasyWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp sweeper_children do
    []
    |> maybe_add_sweeper(:start_subscription_sweeper, Easy.SubscriptionSweeper)
    |> maybe_add_sweeper(:start_check_in_sweeper, Easy.CheckInSweeper)
  end

  defp maybe_add_sweeper(children, config_key, module) do
    if Application.get_env(:easy, config_key, true), do: children ++ [module], else: children
  end
end

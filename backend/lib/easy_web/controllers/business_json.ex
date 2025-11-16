defmodule EasyWeb.BusinessJSON do
  alias EasyWeb.ResponseHelpers

  def show(%{business: business}) do
    %{business: ResponseHelpers.format_business(business)}
  end

  def update(%{business: business}), do: show(%{business: business})

  def list_coaches(%{coaches: coaches}) do
    %{coaches: Enum.map(coaches, &ResponseHelpers.format_coach/1)}
  end

  def list_clients(%{clients: clients, pagination: pagination}) do
    %{
      clients: Enum.map(clients, &ResponseHelpers.format_client/1),
      pagination: pagination
    }
  end

  def show_subscription(%{subscription: subscription}) do
    %{subscription: ResponseHelpers.format_subscription(subscription)}
  end
end

defmodule EasyWeb.CoachJSON do
  alias EasyWeb.ResponseHelpers

  def show(%{coach: coach}) do
    %{coach: ResponseHelpers.format_coach(coach)}
  end

  def update(%{coach: coach}), do: show(%{coach: coach})

  def list_clients(%{clients: clients}) do
    %{clients: Enum.map(clients, &ResponseHelpers.format_client/1)}
  end

  def assign_client(%{assignment: assignment}) do
    %{assignment: ResponseHelpers.format_assignment(assignment)}
  end

  def unassign_client(%{message: message}) do
    %{message: message}
  end
end

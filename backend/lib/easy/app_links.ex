defmodule Easy.AppLinks do
  @spec client_invitation(String.t()) :: String.t()
  def client_invitation(token), do: client_url("/invite/#{token}")

  @spec check_in(String.t()) :: String.t()
  def check_in(assignment_id), do: client_url("/check-ins/#{assignment_id}")

  @spec coach_invitation(String.t()) :: String.t()
  def coach_invitation(token) do
    base_url = Application.get_env(:easy, :frontend_url, "http://localhost:2020")
    "#{base_url}/accept-invite?token=#{token}"
  end

  defp client_url(path) do
    base_url = Application.get_env(:easy, :client_frontend_url, "http://localhost:1314")
    base_url <> path
  end
end

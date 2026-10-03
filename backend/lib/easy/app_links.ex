defmodule Easy.AppLinks do
  @spec client_invitation(String.t()) :: String.t()
  def client_invitation(token), do: client_url("/invite/#{token}")

  @spec coach_invitation(String.t()) :: String.t()
  def coach_invitation(token) do
    base_url = Application.get_env(:easy, :frontend_url, "http://localhost:2022")
    "#{base_url}/accept-invite?token=#{token}"
  end

  defp client_url(path) do
    base_url = Application.get_env(:easy, :client_frontend_url, "http://localhost:1315")
    base_url <> path
  end
end

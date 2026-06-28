defmodule EasyWeb.Cors do
  # Allowed CORS origins. In prod, CORS_ALLOWED_ORIGINS (parsed in runtime.exs into
  # :easy/:cors_origins) governs. When unset/empty we fall back to permissive "*" so a
  # missing env never silently blocks every frontend — restrictive prod CORS is opt-in.
  # ponytail: permissive fallback; set CORS_ALLOWED_ORIGINS to lock it down.

  @spec origins() :: String.t() | [String.t()]
  def origins do
    case Application.get_env(:easy, :cors_origins) do
      [_ | _] = origins -> origins
      _ -> "*"
    end
  end
end

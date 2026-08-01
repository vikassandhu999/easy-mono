defmodule EasyWeb.Plugs.EnsureRole do
  require Logger
  alias Easy.Identity.Token
  alias EasyWeb.FallbackController

  @spec init(any()) :: any()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), any()) :: Plug.Conn.t()
  def call(conn, opts) do
    required_role = opts[:role]
    claims = conn.assigns[:claims] || %{}

    with :ok <- validate_role(claims, required_role),
         :ok <- validate_business_context(claims, required_role) do
      conn
    else
      {:error, reason} ->
        Logger.warning("Authorization failed: #{reason} required_role=#{required_role} role=#{claims[:role]}")

        FallbackController.send_unauthorized_response(conn, "Insufficient permissions")
    end
  end

  @spec validate_role(Token.claims(), atom()) :: :ok | {:error, atom()}
  defp validate_role(%{role: current_role}, required_role) do
    if current_role == required_role, do: :ok, else: {:error, :role_mismatch}
  end

  defp validate_role(_claims, _required), do: {:error, :missing_role}

  defp validate_business_context(%{business_id: nil}, role) when role in [:coach, :client] do
    {:error, :missing_business_id}
  end

  defp validate_business_context(_claims, _role), do: :ok
end

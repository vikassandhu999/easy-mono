defmodule EasyWeb.Plugs.EnsureRole do
  require Logger
  alias Easy.Identity.Token
  alias EasyWeb.FallbackController

  def init(opts), do: opts

  def call(conn, opts) do
    required_role = opts[:role]
    claims = conn.assigns[:claims] || %{}

    # We use a `with` statement to define the "happy path".
    # If any step returns {:error, ...}, it jumps to the `else` block.
    with :ok <- validate_role(claims, required_role),
         :ok <- validate_business_context(claims, required_role) do
      conn
    else
      {:error, reason} ->
        Logger.warning("Authorization failed: #{reason}")
        conn |> FallbackController.send_unauthorized_response("Insufficient permissions")
    end
  end

  @spec validate_role(Token.claims(), atom()) :: :ok | {:error, String.t()}
  defp validate_role(%{role: current_role}, required_role) do
    # Convert atom option to string for comparison to avoid creating dynamic atoms

    if current_role == required_role do
      :ok
    else
      {:error, "Expected role #{required_role}, got #{current_role}"}
    end
  end

  defp validate_role(_claims, _required), do: {:error, "No role found in claims"}

  # 2. Validate Business ID (Only for Coach and Client)
  defp validate_business_context(%{business_id: nil}, role) when role in [:coach, :client] do
    {:error, "Missing business_id in claims for role #{role}"}
  end

  # If business_id exists (or role is not coach/client), we pass
  defp validate_business_context(_claims, _role), do: :ok
end

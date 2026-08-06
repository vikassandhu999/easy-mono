defmodule EasyWeb.Coaches.WorkbenchJSON do
  @spec index(map()) :: map()
  def index(%{counts: counts}) do
    %{
      data: %{
        check_ins: counts.check_ins,
        replies: counts.replies,
        programming: counts.programming,
        expiring: counts.expiring,
        new_clients: counts.new_clients,
        quiet: counts.quiet
      }
    }
  end
end

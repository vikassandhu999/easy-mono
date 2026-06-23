defmodule EasyWeb.Clients.ThreadJSON do
  alias EasyWeb.Coaches.ThreadJSON

  @spec index(map()) :: map()
  defdelegate index(assigns), to: ThreadJSON

  @spec show(map()) :: map()
  defdelegate show(assigns), to: ThreadJSON

  @spec message(map()) :: map()
  defdelegate message(assigns), to: ThreadJSON
end

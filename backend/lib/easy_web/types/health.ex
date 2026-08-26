defmodule EasyWeb.Types.Health do
  use EasyWeb.Type

  @type t :: %{
          required(:status) => String.t(),
          required(:service) => String.t(),
          required(:timestamp) => String.t(),
          required(:version) => String.t()
        }
end

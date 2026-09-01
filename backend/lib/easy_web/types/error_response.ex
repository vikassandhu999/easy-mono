defmodule EasyWeb.Types.ErrorResponse do
  use EasyWeb.Type

  @type t :: %{
          required(:error_code) => String.t(),
          required(:error_message) => String.t(),
          optional(:error_detail) => EasyWeb.TypedRoute.Types.json() | nil
        }
end

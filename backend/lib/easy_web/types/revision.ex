defmodule EasyWeb.Types.Revision do
  use EasyWeb.Type

  @type t :: %{required(:expected_revision) => pos_integer()}
end

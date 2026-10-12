defmodule EasyWeb.Types.TypedLocal do
  use EasyWeb.Type

  @type t :: %{required(:name) => String.t()}
  @type index :: %{required(:data) => [t()]}
  @type bounds :: %{optional(:min) => number()}
  @type write :: %{required(:targets) => %{optional(String.t()) => bounds()}}
end

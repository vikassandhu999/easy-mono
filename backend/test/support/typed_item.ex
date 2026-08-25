defmodule EasyWeb.Types.TypedItem do
  use EasyWeb.Type

  @type t :: %{required(:id) => String.t(), required(:name) => String.t()}
  @type create :: %{required(:name) => String.t()}

  @type list_query :: %{
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer()
        }
end

defmodule EasyWeb.Types.Training.Muscle do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:description) => String.t() | nil
        }

  @type list_query :: %{optional(:search) => String.t()}
end

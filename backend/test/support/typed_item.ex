defmodule EasyWeb.Types.TypedItem do
  use EasyWeb.Type

  @type t :: %{required(:id) => String.t(), required(:name) => String.t()}
  @type create :: %{required(:name) => String.t()}

  @type list_query :: %{
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer()
        }
end

defmodule EasyWeb.Types.TypedDictionary do
  use EasyWeb.Type

  @type t :: %{String.t() => String.t()}
end

defmodule EasyWeb.Types.TypedComputed do
  use EasyWeb.Type

  @type t :: %{required(:public_url) => String.t()}

  @spec format(map()) :: map()
  def format(%{raw_url: raw_url}), do: %{public_url: raw_url}
end

defmodule EasyWeb.TypedStructInput do
  defstruct [:raw_url]

  @type t :: %__MODULE__{raw_url: String.t()}
end

defmodule EasyWeb.Types.TypedStructComputed do
  use EasyWeb.Type

  @type t :: %{required(:public_url) => String.t()}

  @spec format(EasyWeb.TypedStructInput.t()) :: t()
  def format(%EasyWeb.TypedStructInput{raw_url: raw_url}), do: %{public_url: raw_url}
end

defmodule EasyWeb.Types.CoachingTerm do
  use EasyWeb.Type
  @type t :: %{required(:id) => String.t(), required(:starts_on) => Date.t(), required(:ends_on) => Date.t() | nil}
  @type update :: %{required(:ends_on) => Date.t() | nil}
end

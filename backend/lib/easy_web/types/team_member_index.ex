defmodule EasyWeb.Types.TeamMemberIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.TeamMember.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

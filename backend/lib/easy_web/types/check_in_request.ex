defmodule EasyWeb.Types.CheckInRequest do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:client_id) => String.t(),
          required(:form_name) => String.t(),
          required(:status) => :assigned | :in_progress | :missed | :completed | :dismissed,
          required(:priority) => :normal | :high,
          required(:due_date) => Date.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:latest_submission_id) => String.t() | nil
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:status) => :all | :outstanding | :missed | :completed | :dismissed
        }
end

defmodule EasyWeb.Types.CheckInRequestIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.CheckInRequest.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

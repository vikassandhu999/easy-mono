defmodule EasyWeb.Types.Business do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:handle) => String.t(),
          required(:about) => String.t() | nil,
          required(:default_weight_unit) => :kg | :lbs,
          required(:dashboard_setup_hidden_at) => DateTime.t() | nil,
          required(:dashboard_setup_hidden_reason) => :dismissed | :completed | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          required(:handle) => String.t(),
          optional(:about) => String.t() | nil,
          optional(:default_weight_unit) => :kg | :lbs
        }

  @type update :: %{
          optional(:name) => String.t(),
          optional(:handle) => String.t(),
          optional(:about) => String.t() | nil,
          optional(:default_weight_unit) => :kg | :lbs
        }

  @type update_dashboard_setup :: %{
          required(:dashboard_setup_hidden_reason) => :dismissed | :completed | nil
        }
end

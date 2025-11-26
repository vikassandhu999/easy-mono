defmodule Easy.Training.Schema do
  @moduledoc """
  Shared kernel schema for the Training domain.
  Enforces binary_id (UUID) primary keys and standard timestamp configuration.
  """
  defmacro __using__(_) do
    quote do
      use Ecto.Schema
      import Ecto.Changeset
      import Ecto.Query

      @primary_key {:id, :binary_id, autogenerate: true}
      @foreign_key_type :binary_id
      @timestamps_opts [type: :utc_datetime_usec]
    end
  end
end

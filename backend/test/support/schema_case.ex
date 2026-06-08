defmodule Easy.SchemaCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      alias Easy.Repo

      import Ecto
      import Ecto.Changeset
      import Ecto.Query
      import Easy.DataCase
      import Easy.Factory
    end
  end

  setup tags do
    Easy.DataCase.setup_sandbox(tags)
    :ok
  end
end

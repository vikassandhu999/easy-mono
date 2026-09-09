defmodule Easy.Utils do
  import Ecto.Query, only: [from: 2]

  @spec safe_to_atom(any(), [atom()]) :: atom() | nil
  def safe_to_atom(binary, allowed) when is_binary(binary) do
    Enum.find(allowed, &(Atom.to_string(&1) == binary))
  end

  def safe_to_atom(_, _), do: nil

  # For update_change/3 on string fields: cast turns "" into nil, so the trim
  # must pass non-binaries through untouched instead of crashing.
  @spec trim(any()) :: any()
  def trim(value) when is_binary(value), do: String.trim(value)
  def trim(value), do: value

  @spec paginate(Ecto.Queryable.t(), keyword()) :: Ecto.Query.t()
  def paginate(query, opts) do
    {offset, limit} = pagination_bounds(opts, 0)
    paginate(query, offset, limit)
  end

  @spec pagination_bounds(keyword(), 0 | 1) :: {non_neg_integer(), non_neg_integer()}
  def pagination_bounds(opts, minimum) when minimum in [0, 1] do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(minimum) |> min(100)
    {offset, limit}
  end

  @spec paginate(Ecto.Queryable.t(), non_neg_integer(), non_neg_integer()) :: Ecto.Query.t()
  def paginate(query, offset, limit) do
    from(q in query, offset: ^offset, limit: ^limit)
  end
end

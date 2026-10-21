defmodule Easy.Trackers.Templates do
  import Ecto.Query
  alias Easy.{Ctx, Repo, Revision, Trackers}
  alias Easy.Trackers.{Content, Template}
  @type result :: {:ok, Template.t()} | {:error, atom() | Ecto.Changeset.t()}

  @spec get_template(Ctx.t(), String.t()) :: {:ok, Template.t()} | {:error, atom()}
  def get_template(ctx, id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      case Repo.get(Template.for_business(ctx.business_id), id) do
        nil -> {:error, :not_found}
        row -> {:ok, row}
      end
    end
  end

  @spec list_template_page(Ctx.t(), keyword()) :: {:ok, map()} | {:error, atom()}
  def list_template_page(ctx, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      query = Template.for_business(ctx.business_id) |> filter_archived(opts[:archived]) |> search(opts[:search])
      Trackers.page(query, opts, &Function.identity/1)
    end
  end

  @spec create_template(Ctx.t(), map()) :: {:ok, Template.t()} | {:error, atom() | Ecto.Changeset.t()}
  def create_template(ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, content} <- Content.validate(ctx, value(attrs, :content) || Content.empty()) do
      attrs = Map.put(string_keys(attrs), "content", content)
      Template.insert_changeset(ctx.business_id, ctx.coach_id, attrs) |> Repo.insert()
    end
  end

  @spec update_template(Ctx.t(), String.t(), pos_integer(), map()) :: result()
  def update_template(ctx, id, expected, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         do: Revision.locked(Template.for_business(ctx.business_id), id, expected, &save(ctx, &1, attrs))
  end

  defp save(ctx, row, attrs) do
    with true <- is_nil(row.archived_at) || {:error, :conflict},
         {:ok, content} <- Content.validate(ctx, value(attrs, :content) || row.content) do
      Template.update_changeset(row, Map.put(string_keys(attrs), "content", content)) |> Repo.update()
    end
  end

  defp filter_archived(q, true), do: where(q, [t], not is_nil(t.archived_at))
  defp filter_archived(q, false), do: where(q, [t], is_nil(t.archived_at))
  defp filter_archived(q, _), do: q
  defp search(q, value) when value in [nil, ""], do: q
  defp search(q, value), do: where(q, [t], ilike(t.name, ^Easy.Search.like_pattern(value)))
  defp value(attrs, key), do: Map.get(string_keys(attrs), to_string(key))
  defp string_keys(attrs), do: Map.new(attrs, fn {key, value} -> {to_string(key), value} end)
end

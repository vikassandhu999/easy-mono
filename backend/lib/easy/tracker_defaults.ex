defmodule Easy.Trackers.Defaults do
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Plans.Template
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Trackers.Assignments
  alias Easy.Trackers.Tracker
  import Ecto.Query

  @builtins [
    {"Body weight", :number, "kg", nil},
    {"Waist", :number, "cm", nil},
    {"Sleep hours", :number, "hours", nil},
    {"Steps", :number, "steps", nil},
    {"Water", :number, "ml", nil},
    {"Energy", :rating, nil, 5},
    {"Soreness", :rating, nil, 5},
    {"Hunger", :rating, nil, 5},
    {"Bloating", :rating, nil, 5},
    {"Reflection", :text, nil, nil},
    {"Progress photo front", :photo, nil, nil},
    {"Progress photo side", :photo, nil, nil},
    {"Progress photo back", :photo, nil, nil},
    {"Blood report", :document, nil, nil},
    {"Supplements taken", :yes_no, nil, nil},
    {"10k steps reached", :yes_no, nil, nil},
    {"Alcohol-free day", :yes_no, nil, nil}
  ]

  @spec seed_builtins() :: {:ok, term()} | {:error, term()}
  def seed_builtins do
    Result.traverse(Enum.with_index(@builtins, 1), fn {{name, kind, unit, scale}, n} ->
      id = "a0000000-0000-4000-8000-" <> String.pad_leading(Integer.to_string(n), 12, "0")
      nil |> Tracker.insert_changeset(%{name: name, kind: kind, base_unit: unit, scale_max: scale}) |> Ecto.Changeset.put_change(:id, id) |> Repo.insert(on_conflict: :nothing)
    end)
  end

  @spec create_default(Ctx.t()) :: {:ok, Business.t()} | {:error, term()}
  def create_default(ctx) do
    with {:ok, _} <- seed_builtins(),
         {:ok, template} <-
           Template.insert_changeset(ctx.business_id, ctx.coach_id, :trackers, %{
             name: "Weekly Reflection",
             content: %{"items" => [%{"tracker_id" => "a0000000-0000-4000-8000-000000000010", "timing" => "weekly", "weekday" => 6}]}
           })
           |> Repo.insert() do
      Repo.get(Business, ctx.business_id) |> Ecto.Changeset.change(default_tracker_template_id: template.id) |> Repo.update()
    end
  end

  @spec copy_first_term(Ctx.t(), Client.t(), CoachingTerm.t()) :: {:ok, term()} | {:error, term()}
  def copy_first_term(ctx, client, term) do
    first? = Repo.aggregate(from(t in CoachingTerm, where: t.client_id == ^client.id), :count) == 1
    template_id = Repo.get(Business, ctx.business_id).default_tracker_template_id

    if first? and template_id do
      with {:ok, content} <- Assignments.template_content(ctx, template_id), do: Assignments.match(ctx, client.id, term.starts_on, content)
    else
      {:ok, []}
    end
  end

  @spec get_settings(Ctx.t()) :: {:ok, map()} | {:error, term()}
  def get_settings(ctx) do
    with :ok <- Ctx.ensure_coach(ctx) do
      case Repo.get(Business, ctx.business_id) do
        nil -> {:error, :not_found}
        row -> {:ok, %{default_tracker_template_id: row.default_tracker_template_id}}
      end
    end
  end

  @spec update_settings(Ctx.t(), map()) :: {:ok, map()} | {:error, term()}
  def update_settings(%Ctx{owner?: false}, _), do: {:error, :not_owner}

  def update_settings(ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.transact(fn -> update_locked(ctx, attrs) end)
    end
  end

  defp update_locked(ctx, attrs) do
    id = Map.get(attrs, :default_tracker_template_id, Map.get(attrs, "default_tracker_template_id"))
    apply? = Map.get(attrs, :apply_to_existing, Map.get(attrs, "apply_to_existing", false))
    business = Repo.one(from(b in Business, where: b.id == ^ctx.business_id, lock: "FOR UPDATE"))

    with {:ok, content} <- if(id, do: Assignments.template_content(ctx, id), else: {:ok, %{"items" => []}}),
         {:ok, _} <- business |> Ecto.Changeset.change(default_tracker_template_id: id) |> Repo.update(),
         {:ok, _} <- apply_existing(ctx, content, apply?) do
      {:ok, %{default_tracker_template_id: id}}
    end
  end

  defp apply_existing(_ctx, _content, false), do: {:ok, []}

  defp apply_existing(ctx, content, true) do
    clients = Repo.all(from(c in Client, where: c.business_id == ^ctx.business_id, order_by: c.id, lock: "FOR UPDATE")) |> Repo.preload(:business)
    Result.traverse(clients, fn client -> Assignments.match(ctx, client.id, Client.local_date(client, DateTime.utc_now()), content) end)
  end
end

# Dev-only, idempotent seed: one client per client-detail lifecycle state so
# the design-pro style-diff manifest (design-handoff/manifests/CD-OV.json) can
# reach every state deterministically. Companion to dev_rich_client.exs
# (which makes Rowan White data-rich for the "active" state).
#
#   cd backend && mix run priv/repo/dev_client_states.exs
#

import Ecto.Query
alias Easy.Repo
alias Easy.Clients.Client
alias Easy.Chat.{Conversation, Message}

rich_id = "f9e0ba52-2974-45b9-bf29-ffc3e081f7bd"
rich = Repo.get!(Client, rich_id)
today = Date.utc_today()

ensure = fn email, attrs ->
  case Repo.get_by(Client, email: email, business_id: rich.business_id) do
    nil ->
      c =
        Repo.insert!(
          struct!(
            Client,
            Map.merge(
              %{
                email: email,
                business_id: rich.business_id,
                creator_id: rich.creator_id,
                assigned_coach_id: rich.assigned_coach_id,
                stage: :coaching
              },
              attrs
            )
          )
        )

      IO.puts("created #{c.first_name} #{c.last_name} (#{c.status}) #{c.id}")
      c

    c ->
      c = Repo.update!(Ecto.Changeset.change(c, attrs))
      IO.puts("exists  #{c.first_name} #{c.last_name} (#{c.status}) #{c.id}")
      c
  end
end

fresh =
  ensure.("freya.newman@state.dev", %{
    first_name: "Freya",
    last_name: "Newman",
    phone: "+44 7700 900321",
    status: :active
  })

inactive_manual =
  ensure.("marco.vale@state.dev", %{
    first_name: "Marco",
    last_name: "Vale",
    phone: "+44 7700 900322",
    status: :inactive,
    inactive_reason: :manual
  })

inactive_seat =
  ensure.("sana.kade@state.dev", %{
    first_name: "Sana",
    last_name: "Kade",
    phone: "+44 7700 900323",
    status: :inactive,
    inactive_reason: :awaiting_seat
  })

expiring =
  ensure.("nora.field@state.dev", %{
    first_name: "Nora",
    last_name: "Field",
    phone: "+44 7700 900324",
    status: :active,
    subscription_started_on: Date.add(today, -60),
    subscription_ends_on: Date.add(today, 5)
  })

# Keep the fresh client free of training and nutrition plans on every run.
{dropped_t, _} = Repo.delete_all(from p in Easy.Training.TrainingPlan, where: p.client_id == ^fresh.id)
{dropped_n, _} = Repo.delete_all(from p in Easy.Nutrition.Plan, where: p.client_id == ^fresh.id)

if dropped_t + dropped_n > 0 do
  IO.puts("removed #{dropped_t} training + #{dropped_n} nutrition plan(s) from the fresh fixture")
end

# Ensure Rowan's conversation has 2 unread client messages (header Message
# badge). Re-marking coach_last_read_at nil keeps it unread across runs.
conv =
  Repo.get_by(Conversation, client_id: rich_id) ||
    Repo.insert!(%Conversation{business_id: rich.business_id, client_id: rich_id})

msg_count = Repo.aggregate(from(m in Message, where: m.conversation_id == ^conv.id and m.sender_type == :client), :count)

if msg_count < 2 do
  for body <- ["Left knee felt fine on today's squats!", "Should I keep the same protein target this week?"] do
    now = DateTime.utc_now()

    Repo.insert!(%Message{
      conversation_id: conv.id,
      business_id: rich.business_id,
      body: body,
      sender_type: :client,
      sender_id: rich_id,
      inserted_at: now
    })

    Repo.update!(Ecto.Changeset.change(conv, last_message_at: now, last_message_preview: body))
  end

  IO.puts("seeded 2 client messages")
end

Repo.update!(Ecto.Changeset.change(conv, coach_last_read_at: nil))
IO.puts("conversation marked unread for coach")

IO.puts("""

manifest routes:
  active:            /clients/#{rich_id}
  fresh:             /clients/#{fresh.id}
  expiring:          /clients/#{expiring.id}
  inactive-manual:   /clients/#{inactive_manual.id}
  inactive-seat:     /clients/#{inactive_seat.id}
""")

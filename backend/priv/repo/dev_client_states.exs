# Local prototype fixtures for the coaching-terms browser journeys.
# Run with: rtk mix run priv/repo/dev_client_states.exs
alias Easy.{Repo, Ctx}
alias Easy.Clients.Client
alias Easy.Billing.BusinessBilling
alias Easy.CoachingTerms.CoachingTerm
alias Easy.Identity.User
alias Easy.Orgs.{Business, Coach}

unless Mix.env() == :dev, do: raise("Development fixtures only")
now = DateTime.utc_now(:second)
today = Date.utc_today()
run = System.system_time(:millisecond)

fixtures =
  for width <- [375, 1280], into: %{} do
    email = "coaching-owner-#{width}-#{run}@example.test"
    owner = Repo.insert!(%User{email: email, full_name: "Coaching Owner", email_confirmed_at: now})
    business = Repo.insert!(%Business{name: "Coaching Terms #{width}", handle: "coaching-#{width}-#{run}", timezone: "Etc/UTC", owner_user_id: owner.id})
    Repo.insert!(%BusinessBilling{business_id: business.id, free_seats: 3})
    coach = Repo.insert!(%Coach{business_id: business.id, user_id: owner.id, email: email, full_name: owner.full_name})
    ctx = Ctx.new(business.id, owner.id, coach.id, true)

    clients =
      for state <- [:active, :ending_soon, :joined, :ended], into: %{} do
        name = state |> to_string() |> String.replace("_", " ") |> String.capitalize()
        email = "coaching-#{state}-#{width}-#{run}@example.test"
        user = Repo.insert!(%User{email: email, full_name: "#{name} Client", email_confirmed_at: now})

        client =
          Repo.insert!(%Client{business_id: business.id, coach_id: coach.id, user_id: user.id, email: email, full_name: user.full_name, preferred_name: name, unit_system: :metric})

        if state != :joined do
          ends_on =
            case state do
              :ending_soon -> Date.add(today, 7)
              :ended -> Date.add(today, -1)
              _ -> nil
            end

          Repo.insert!(%CoachingTerm{client_id: client.id, starts_on: Date.add(today, -30), ends_on: ends_on})
        end

        {:ok, conversation} = Easy.Chat.get_or_create_conversation_for_client(ctx, client.id)
        {:ok, _} = Easy.Chat.send_message(ctx, conversation.id, %{body: "Your coaching history stays here."})

        if state == :ended do
          Repo.insert!(%Easy.Training.TrainingSession{
            business_id: business.id,
            client_id: client.id,
            kind: :freestyle,
            state: :completed,
            date: Date.add(today, -2),
            started_at: DateTime.add(now, -172_800),
            closed_at: DateTime.add(now, -172_000),
            notes: "Coaching term history"
          })
        end

        {state, %{id: client.id, full_name: client.full_name, preferred_name: client.preferred_name, email: email}}
      end

    teammate_user = Repo.insert!(%User{email: "teammate-#{width}-#{run}@example.test", full_name: "Team Coach", email_confirmed_at: now})
    teammate = Repo.insert!(%Coach{business_id: business.id, user_id: teammate_user.id, email: teammate_user.email, full_name: "Team Coach"})
    {:ok, _} = Easy.ClientInvitations.invite(ctx, %{full_name: "Teammate Invite", email: "teammate-client-#{width}-#{run}@example.test", coach_id: teammate.id})
    {to_string(width), %{coach_email: owner.email, business_id: business.id, clients: clients, teammate: %{id: teammate.id, email: teammate.email, full_name: teammate.full_name}}}
  end

File.write!("../.scratch/coaching-terms/browser-fixtures.json", Jason.encode!(fixtures, pretty: true))
IO.puts("Coaching fixtures saved to .scratch/coaching-terms/browser-fixtures.json")

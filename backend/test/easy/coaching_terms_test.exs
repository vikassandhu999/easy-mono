defmodule Easy.CoachingTermsTest do
  use Easy.DataCase, async: true
  alias Easy.{ClientInvitations, Clients, CoachingTerms, Ctx, Repo}
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm

  defp ctx(business, coach), do: %Ctx{business_id: business.id, user_id: coach.user_id, coach_id: coach.id, owner?: true}

  setup do
    business = insert(:business, billing: build(:business_billing, business: nil, free_seats: 1))
    coach = insert(:coach, business: business, user: business.owner)
    %{business: business, coach: coach, ctx: ctx(business, coach)}
  end

  test "invites are free; acceptance links a full business without starting a term", %{business: business, ctx: ctx} do
    insert(:client, business: business)
    assert {:ok, invite} = ClientInvitations.create(ctx, %{full_name: "New Client", email: "new@example.test"})
    assert invite.state == :invited
    assert invite.terms == []
    user = insert(:user)
    assert {:ok, joined} = CoachingTerms.accept_invite(%Ctx{business_id: invite.business_id, user_id: user.id}, invite, user.email)
    assert joined.user_id == user.id
    assert joined.invite_token == nil
    assert Client.state(joined, Date.utc_today()) == :joined
    assert CoachingTerms.used_seats(%Easy.Ctx{business_id: business.id, user_id: business.owner_user_id}) == {:ok, 1}
    assert {:error, :seat_limit_reached} = CoachingTerms.start_term_for_client(ctx, joined.id)
  end

  test "acceptance with room starts today and cannot be replayed", %{business: business, ctx: ctx} do
    {:ok, invite} = ClientInvitations.create(ctx, %{full_name: "New Client", email: "new@example.test"})
    user = insert(:user)
    assert {:ok, client} = CoachingTerms.accept_invite(%Ctx{business_id: invite.business_id, user_id: user.id}, invite, user.email)
    assert client.state == :active
    assert client.current_term.starts_on == Client.local_date(client, DateTime.utc_now())
    assert CoachingTerms.used_seats(%Easy.Ctx{business_id: business.id, user_id: business.owner_user_id}) == {:ok, 1}
    assert {:error, :race_lost} = CoachingTerms.accept_invite(%Ctx{business_id: invite.business_id, user_id: user.id}, invite, user.email)
    assert {:error, :term_already_active} = CoachingTerms.start_term_for_client(ctx, client.id)
  end

  test "end today remains active; moving or clearing end preserves start", %{business: business, ctx: ctx} do
    client = insert(:client, business: business, terms: [])
    {:ok, term} = CoachingTerms.start_term_for_client(ctx, client.id)
    today = term.starts_on
    assert {:ok, ending} = CoachingTerms.update_term(ctx, term.id, %{ends_on: today, starts_on: Date.add(today, -30)})
    assert ending.starts_on == today
    assert CoachingTerm.covers?(ending, today)
    refute CoachingTerm.covers?(ending, Date.add(today, 1))
    assert {:error, _} = CoachingTerms.update_term(ctx, term.id, %{ends_on: Date.add(today, -1)})
    assert {:ok, open} = CoachingTerms.update_term(ctx, term.id, %{ends_on: nil})
    assert open.ends_on == nil
  end

  test "historical terms cannot be revived and returning clients keep history", %{business: business, ctx: ctx} do
    client = insert(:client, business: business, terms: [])
    today = Date.utc_today()
    past = insert(:coaching_term, client: client, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1))
    assert {:error, :term_ended} = CoachingTerms.update_term(ctx, past.id, %{ends_on: nil})
    assert {:ok, new} = CoachingTerms.start_term_for_client(ctx, client.id)
    assert new.id != past.id
    assert {:ok, loaded} = Clients.get_client_with_preloads(ctx, client.id)
    assert length(loaded.terms) == 2
    assert loaded.state == :active
  end

  test "database rejects overlapping and reversed dates", %{business: business} do
    client = insert(:client, business: business, terms: [])
    today = Date.utc_today()
    insert(:coaching_term, client: client, starts_on: today, ends_on: Date.add(today, 3))
    assert {:error, changeset} = client.id |> CoachingTerm.insert_changeset(Date.add(today, 3)) |> Repo.insert()
    assert changeset.errors[:starts_on]
    assert {:error, changeset} = client.id |> CoachingTerm.insert_changeset(Date.add(today, 4)) |> Ecto.Changeset.put_change(:ends_on, today) |> Repo.insert()
    assert changeset.errors[:ends_on]
  end

  test "SQL filters return all five derived states with timezone fallback", %{business: business, ctx: ctx} do
    today = Easy.LocalCalendar.to_local_date(DateTime.utc_now(), business.timezone)
    active = insert(:client, business: business, full_name: "Active Client")
    ending = insert(:client, business: business, terms: [build(:coaching_term, starts_on: today, ends_on: Date.add(today, 14))])
    joined = insert(:client, business: business, terms: [])
    invited = insert(:client, business: business, user: nil)
    ended = insert(:client, business: business, terms: [build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1))])

    for {state, expected} <- [active: active, ending_soon: ending, joined: joined, invited: invited, ended: ended] do
      assert {:ok, %{clients: [client], count: 1}} = Clients.list_clients(ctx, state: state)
      assert client.id == expected.id
      assert client.state == state
    end

    assert {:ok, %{summary: summary, clients: [found]}} = Clients.list_clients(ctx, q: "Active Client")
    assert summary == %{active: 1, ending_soon: 1, joined: 1, invited: 1, ended: 1}
    assert found.id == active.id
    assert CoachingTerms.used_seats(%Easy.Ctx{business_id: business.id, user_id: business.owner_user_id}) == {:ok, 2}
  end

  test "local dates determine end boundaries without writes" do
    now = ~U[2026-01-02 01:00:00Z]
    term = build(:coaching_term, starts_on: ~D[2026-01-01], ends_on: ~D[2026-01-01])
    business = build(:business, timezone: "America/Los_Angeles")
    client = build(:client, user_id: Ecto.UUID.generate(), timezone: nil, business: business, terms: [term])
    assert Client.derive(client, now).state == :ending_soon
    assert Client.derive(%{client | timezone: "Asia/Kolkata"}, now).state == :ended
  end

  test "tenant and trainer boundaries protect term starts and edits", %{ctx: ctx} do
    foreign = insert(:client, terms: [])
    term = insert(:coaching_term, client: foreign)
    assert {:error, :not_found} = CoachingTerms.start_term_for_client(ctx, foreign.id)
    assert {:error, :not_found} = CoachingTerms.update_term(ctx, term.id, %{ends_on: nil})
  end
end

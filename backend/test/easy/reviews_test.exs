defmodule Easy.ReviewsTest do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Nutrition.Diary
  alias Easy.Repo
  alias Easy.Reviews
  alias Easy.Reviews.Reply
  alias Easy.Reviews.Review
  alias Easy.Reviews.Roster
  alias Easy.Reviews.Settings
  alias Easy.Trackers
  alias Easy.Trackers.Reader
  alias Easy.Trackers.Records
  use Easy.DataCase, async: false
  import Ecto.Query

  setup do
    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)
    client = insert(:client, business: business, coach: coach, timezone: "Etc/UTC")
    ctx = %Ctx{business_id: business.id, coach_id: coach.id, user_id: coach.user_id, owner?: true}
    {:ok, tracker} = Trackers.create_tracker(ctx, %{name: "Reflection", kind: :text})

    %{
      business: business,
      coach: coach,
      client: client,
      ctx: ctx,
      tracker: tracker,
      today: Date.utc_today(),
      client_ctx: %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}
    }
  end

  defp screen(f), do: Reviews.screen_for_client(f.ctx, f.client.id)

  defp save(f, screen, attrs \\ %{}),
    do:
      Reviews.create_for_client(
        f.ctx,
        f.client.id,
        Map.merge(%{snapshot_token: screen.snapshot_token, assessment: :on_track}, attrs)
      )

  defp entry(f, text),
    do:
      Records.create_for_client(f.client_ctx, f.client.id, %{
        tracker_id: f.tracker.id,
        local_date: Date.add(f.today, -2),
        request_id: Ecto.UUID.generate(),
        text_value: text
      })

  test "due has no review this term, exact frequency boundary and overdue count", f do
    {:ok, client} = Clients.get_client_with_preloads(f.ctx, f.client.id)
    assert Review.due(client, nil, f.today).due
    date = Date.add(f.today, -7)
    review = %Review{reviewed_at: DateTime.new!(date, ~T[23:59:00], "Etc/UTC")}
    assert %{due: false, overdue_days: 0} = Review.due(client, review, Date.add(f.today, -1))
    assert %{due: true, overdue_days: 0} = Review.due(client, review, f.today)
    assert %{due: true, overdue_days: 14} = Review.due(client, review, Date.add(f.today, 14))
    assert %{due: false, due_on: nil} = Review.due(%{client | current_term: nil}, review, f.today)
  end

  test "review dates use the client timezone at the frequency boundary", f do
    {:ok, client} = Clients.get_client_with_preloads(f.ctx, f.client.id)
    client = %{client | timezone: "America/Los_Angeles"}
    review = %Review{reviewed_at: DateTime.new!(Date.add(f.today, -6), ~T[00:30:00], "Etc/UTC")}
    assert Review.due(client, review, f.today).due_on == f.today
    refute Review.due(client, review, Date.add(f.today, -1)).due
  end

  test "successive reviews select the latest time and preserve its watermark", f do
    {:ok, first_screen} = screen(f)
    {:ok, first} = save(f, first_screen)
    {:ok, _} = entry(f, "New record")
    {:ok, second_screen} = screen(f)
    {:ok, second} = save(f, second_screen)
    assert DateTime.compare(second.reviewed_at, first.reviewed_at) == :gt
    {:ok, third_screen} = screen(f)
    assert third_screen.last_review.id == second.id
    assert third_screen.last_review.reviewed_through_seq == 1
    assert third_screen.changes == []
  end

  test "nutrition averages preserve unknown days and ignore empty meal headers", f do
    for {offset, nutrients} <- [{-2, %{"energy_kcal" => 400, "protein_g" => 20}}, {-1, %{"energy_kcal" => 500}}] do
      meal = %{
        id: Ecto.UUID.generate(),
        request_id: Ecto.UUID.generate(),
        expected_revision: 0,
        name: "Meal",
        plan_revision_id: nil,
        slot_id: nil,
        chosen_meal_id: nil,
        entries: [
          %{
            id: Ecto.UUID.generate(),
            request_id: Ecto.UUID.generate(),
            planned_item_id: nil,
            source: nil,
            portion: nil,
            name: "Food",
            nutrients: nutrients
          }
        ]
      }

      assert {:ok, _} = Diary.save_client_nutrition_day(f.client_ctx, Date.add(f.today, offset), %{meals: [meal]})
    end

    empty = %{
      id: Ecto.UUID.generate(),
      request_id: Ecto.UUID.generate(),
      expected_revision: 0,
      name: "Empty",
      plan_revision_id: nil,
      slot_id: nil,
      chosen_meal_id: nil,
      entries: []
    }

    assert {:ok, _} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [empty]})
    assert {:ok, result} = Reviews.screen_for_client(f.ctx, f.client.id, from: Date.add(f.today, -2), to: f.today)
    assert result.nutrition_summary.days_logged == 2
    assert result.nutrition_summary.days_count == 3
    assert result.nutrition_summary.average["protein_g"] == %{value: nil, known_entries: 1, total_entries: 2}
  end

  test "returning clients ignore earlier review and stale term token", f do
    {:ok, before} = screen(f)
    {:ok, review} = save(f, before)
    Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^f.client.id), set: [ends_on: Date.add(f.today, -1)])
    insert(:coaching_term, client: f.client, starts_on: f.today)
    {:ok, current} = Clients.get_client_with_preloads(f.ctx, f.client.id)
    old = %Review{reviewed_at: DateTime.add(review.reviewed_at, -86_400)}
    assert Review.due(current, old, f.today).due
    assert {:error, :conflict} = save(f, before, %{private_note: "Different request"})
    {:ok, next} = screen(f)
    assert next.last_review.id == review.id
    assert {:ok, _} = save(f, next)
  end

  test "snapshot watermark includes corrections and removals and ignores lower sequences", f do
    {:ok, original} = entry(f, "Old")
    {:ok, first} = screen(f)
    assert [%{record_id: id, changes: [%{action: "added"}]}] = first.changes
    assert id == original.id && first.reviewed_through_seq == 1
    {:ok, saved} = save(f, first)

    {:ok, updated} =
      Records.update_for_client(f.client_ctx, f.client.id, original.id, %{
        request_id: Ecto.UUID.generate(),
        expected_revision: 1,
        text_value: "New"
      })

    {:ok, _} = Records.remove_for_client(f.client_ctx, f.client.id, original.id, updated.revision)
    {:ok, next} = screen(f)
    assert [%{changes: [changed, removed]}] = next.changes
    assert changed.old_value["text_value"] == "Old" && changed.new_value["text_value"] == "New"
    assert removed.action == "removed" && removed.old_value["text_value"] == "New" && removed.new_value == nil
    assert changed.seq > saved.reviewed_through_seq && removed.seq > changed.seq
  end

  test "save retries preserve review and reply identity, changed payload conflicts", f do
    {:ok, screen} = screen(f)
    {:ok, first} = save(f, screen, %{reply: "Keep going"})
    assert {:ok, replay} = save(f, screen, %{reply: "Keep going"})
    assert replay.id == first.id && replay.reply.id == first.reply.id
    assert Repo.aggregate(Review, :count) == 1
    assert {:error, :conflict} = save(f, screen, %{reply: "Changed"})
  end

  test "reply edit and deletion update chat and notify after commit; facts do not change", f do
    {:ok, screen} = screen(f)
    {:ok, saved} = save(f, screen, %{private_note: "Private", reply: "Hello"})
    Phoenix.PubSub.subscribe(Easy.PubSub, "conversation:#{saved.reply.conversation_id}")

    assert {:ok, edited} =
             Reviews.update_for_client(f.ctx, f.client.id, saved.id, %{
               assessment: :at_risk,
               private_note: "Changed",
               reply: "Hello again",
               reviewed_through_seq: 999
             })

    assert edited.reviewed_at == saved.reviewed_at && edited.reviewed_through_seq == saved.reviewed_through_seq &&
             edited.seen_at == saved.seen_at

    assert edited.reply.id == saved.reply.id && edited.reply.edited_at && edited.reply.body == "Hello again"
    assert_receive {:chat_message_updated, %{body: "Hello again"}}
    assert {:ok, %{data: [reply]}} = Reply.list_client_replies(f.client_ctx)
    assert reply.id == saved.reply.id && reply.embed_type == :review
    assert {:ok, %{reply: nil}} = Reviews.update_for_client(f.ctx, f.client.id, saved.id, %{reply: nil})
    assert_receive {:chat_message_deleted, _}
    assert {:ok, %{data: []}} = Reply.list_client_replies(f.client_ctx)
    assert Repo.get(Easy.Chat.Message, saved.reply.id) == nil
    assert Repo.get!(Easy.Chat.Conversation, saved.reply.conversation_id).last_message_at == nil
  end

  test "invalid reply rolls back review and message changes", f do
    {:ok, screen} = screen(f)
    assert {:error, _} = save(f, screen, %{reply: String.duplicate("a", 4001)})
    assert {:error, _} = save(f, screen, %{reply: 123})
    assert Repo.aggregate(Review, :count) == 0
    assert Repo.aggregate(Easy.Chat.Message, :count) == 0
  end

  for field <- [:reviewed_at, :reviewed_through_seq, :seen_at] do
    @field field
    test "database preserves #{@field}", f do
      {:ok, screen} = screen(f)
      {:ok, review} = save(f, screen)
      value = if @field == :reviewed_through_seq, do: 999, else: DateTime.add(Map.fetch!(review, @field), 1)

      assert_raise Postgrex.Error, fn ->
        Repo.update_all(from(r in Review, where: r.id == ^review.id), set: [{@field, value}])
      end
    end
  end

  test "read and write access rejects other coaches and tenants and client private access", f do
    colleague = insert(:coach, business: f.business)
    foreign = insert(:coach)
    {:ok, screen} = screen(f)
    {:ok, saved} = save(f, screen)

    for ctx <- [
          %{f.ctx | owner?: false, coach_id: colleague.id, user_id: colleague.user_id},
          %Ctx{business_id: foreign.business_id, coach_id: foreign.id, user_id: foreign.user_id}
        ] do
      assert {:error, :not_found} = Reviews.screen_for_client(ctx, f.client.id)
      assert {:error, :not_found} = Reviews.history_for_client(ctx, f.client.id)
      assert {:error, :not_found} = Reviews.update_for_client(ctx, f.client.id, saved.id, %{reply: "bad"})

      assert {:error, :not_found} =
               Reviews.create_for_client(ctx, f.client.id, %{
                 snapshot_token: screen.snapshot_token,
                 assessment: :on_track
               })

      assert {:ok, %{data: []}} = Roster.list(ctx)
    end

    assert {:error, _} = Reviews.screen_for_client(f.client_ctx, f.client.id)
    assert {:error, _} = Reviews.history_for_client(f.client_ctx, f.client.id)
  end

  test "ended terms keep history but cannot save a new review", f do
    {:ok, screen} = screen(f)
    {:ok, _} = save(f, screen, %{reply: "History"})
    Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^f.client.id), set: [ends_on: Date.add(f.today, -1)])
    {:ok, ended} = screen(f)
    assert {:error, :coaching_required} = save(f, ended)
    assert {:ok, %{count: 1}} = Reviews.history_for_client(f.ctx, f.client.id)
    assert {:ok, %{count: 1}} = Reply.list_client_replies(f.client_ctx)
  end

  test "default frequency applies to new clients and optionally existing clients in tenant", f do
    foreign = insert(:client)
    assert {:ok, _} = Settings.update(f.ctx, %{default_review_frequency_days: 14})
    assert Repo.get!(Client, f.client.id).review_frequency_days == 7
    assert {:ok, invited} = Easy.ClientInvitations.create(f.ctx, %{full_name: "New", email: "review-new@example.com"})
    assert invited.review_frequency_days == 14
    assert {:ok, _} = Settings.update(f.ctx, %{default_review_frequency_days: 3, apply_to_existing: true})
    assert Repo.get!(Client, invited.id).review_frequency_days == 3
    assert Repo.get!(Client, f.client.id).review_frequency_days == 3
    assert Repo.get!(Client, foreign.id).review_frequency_days == 7
    assert {:error, _} = Settings.update(f.ctx, %{default_review_frequency_days: 2})
    assert {:error, :not_owner} = Settings.update(%{f.ctx | owner?: false}, %{default_review_frequency_days: 1})
    assert {:ok, %{focus: "Walk daily"}} = Clients.update_client(f.ctx, f.client.id, %{focus: "Walk daily"})
    assert {:error, _} = Clients.update_client(f.ctx, f.client.id, %{focus: "two\nlines"})
  end

  test "roster every sort supports cursor and filters", f do
    other = insert(:client, business: f.business, coach: f.coach, full_name: "Aaron")
    {:ok, screen} = screen(f)
    {:ok, _} = save(f, screen, %{assessment: :needs_attention})
    {:ok, _} = Reader.request_for_client(f.ctx, f.client.id, %{tracker_id: f.tracker.id})
    {:ok, _} = Easy.Chat.send_client_message(f.client_ctx, %{body: "Unread"})

    for sort <- [:name, :due, :last_reviewed, :assessment, :unread_chat, :waiting_since], direction <- [:asc, :desc] do
      assert {:ok, first} = Roster.list(f.ctx, sort: sort, direction: direction, limit: 1)
      assert first.count == 2 && first.next_cursor
      assert {:ok, second} = Roster.list(f.ctx, sort: sort, direction: direction, limit: 1, cursor: first.next_cursor)
      assert MapSet.new(Enum.map(first.data ++ second.data, & &1.client_id)) == MapSet.new([f.client.id, other.id])
      assert second.next_cursor == nil
    end

    assert {:ok, %{data: [due]}} = Roster.list(f.ctx, due: :due)
    assert due.client_id == other.id

    assert {:ok, %{data: [reviewed]}} =
             Roster.list(f.ctx,
               due: :not_due,
               assessment: :needs_attention,
               unread: true,
               waiting: true,
               last_reviewed: :reviewed
             )

    assert reviewed.client_id == f.client.id && reviewed.waiting_since && reviewed.unread_chat == 1
    assert {:error, :invalid_cursor} = Roster.list(f.ctx, cursor: "bad")
  end
end

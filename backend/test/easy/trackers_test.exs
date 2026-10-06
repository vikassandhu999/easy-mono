defmodule Easy.TrackersTest do
  alias Easy.Attachments.Attachment
  alias Easy.ClientInvitations
  alias Easy.Clients.Client
  alias Easy.CoachingTerms
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Nutrition.DiaryMeal
  alias Easy.Plans.Programming
  alias Easy.Plans.Template
  alias Easy.Repo
  alias Easy.Trackers
  alias Easy.Trackers.Assignment
  alias Easy.Trackers.Assignments
  alias Easy.Trackers.Defaults
  alias Easy.Trackers.Reader
  alias Easy.Trackers.Records
  alias Easy.Trackers.Request
  alias Easy.Units
  use Easy.DataCase, async: false
  import Ecto.Query

  setup do
    business = insert(:business, billing: build(:business_billing, business: nil, free_seats: 20))
    coach = insert(:coach, business: business, user: business.owner)
    client = insert(:client, business: business, coach: coach)
    ctx = %Ctx{business_id: business.id, user_id: coach.user_id, coach_id: coach.id, owner?: true}
    client_ctx = %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}
    {:ok, _} = Defaults.seed_builtins()
    today = Client.local_date(%{client | business: business}, DateTime.utc_now())
    %{business: business, coach: coach, client: client, ctx: ctx, client_ctx: client_ctx, today: today}
  end

  defp custom(ctx, kind \\ :text, extra \\ %{}) do
    {:ok, row} = Trackers.create_tracker(ctx, Map.merge(%{name: "Custom", kind: kind}, extra))
    row
  end

  defp entry(tracker, date, values), do: Map.merge(%{tracker_id: tracker.id, request_id: Ecto.UUID.generate(), local_date: date}, values)

  defp builtin(ctx, n) do
    {:ok, row} = Trackers.get_tracker(ctx, "a0000000-0000-4000-8000-" <> String.pad_leading(to_string(n), 12, "0"))
    row
  end

  defp changes(client_id),
    do:
      Repo.all(
        from(c in "record_changes",
          where: c.client_id == type(^client_id, :binary_id),
          order_by: [asc: c.seq],
          select: map(c, [:seq, :record_type, :row_type, :action, :changed_by_type, :old_value, :new_value])
        )
      )

  test "library fixed definition, built-in protection, search and cursor pagination", %{ctx: ctx} do
    row = custom(ctx, :number, %{base_unit: "cups"})
    assert {:error, cs} = Trackers.update_tracker(ctx, row.id, %{kind: :text, base_unit: "kg"})
    assert cs.errors[:kind] && cs.errors[:base_unit]
    assert {:ok, renamed} = Trackers.update_tracker(ctx, row.id, %{name: "New custom"})
    assert renamed.name == "New custom"
    assert {:error, :forbidden} = Trackers.archive_tracker(ctx, builtin(ctx, 1).id)
    assert {:error, :forbidden} = Trackers.update_tracker(ctx, builtin(ctx, 1).id, %{name: "Changed"})
    assert {:ok, %{data: [one], next_cursor: cursor, count: 18}} = Trackers.list_trackers(ctx, limit: 1)
    assert is_binary(cursor)
    assert {:ok, %{data: [two]}} = Trackers.list_trackers(ctx, limit: 1, cursor: cursor)
    refute one.id == two.id
    assert {:ok, %{count: 1}} = Trackers.list_trackers(ctx, search: "New custom")
  end

  test "SQL rejects changes to kind unit and scale", %{ctx: ctx} do
    tracker = custom(ctx, :number, %{base_unit: "kg"})
    assert_raise Postgrex.Error, fn -> Repo.query!("UPDATE trackers SET base_unit='lb' WHERE id=$1", [Ecto.UUID.dump!(tracker.id)]) end
  end

  test "rating definition and value require a bounded scale", %{ctx: ctx, client: client, today: today} do
    assert {:error, _} = Trackers.create_tracker(ctx, %{name: "Bad", kind: :rating})
    row = custom(ctx, :rating, %{scale_max: 5})
    assert {:error, _} = Trackers.update_tracker(ctx, row.id, %{scale_max: 10})
    assert {:error, _} = Records.create_for_client(ctx, client.id, entry(row, today, %{rating_value: 6}))
    assert {:ok, saved} = Records.create_for_client(ctx, client.id, entry(row, today, %{rating_value: 5}))
    assert saved.rating_value == 5
  end

  test "unused deletion prunes templates and assignments; used tracker archives with history", %{ctx: ctx, client: client, today: today} do
    row = custom(ctx)
    {:ok, template} = Programming.create_template(ctx, :trackers, %{name: "List", content: %{items: [%{tracker_id: row.id, timing: :daily}]}})
    {:ok, _} = Assignments.add_for_client(ctx, client.id, %{tracker_id: row.id, timing: :daily})
    assert {:ok, _} = Trackers.delete_tracker(ctx, row.id)
    assert Repo.get!(Template, template.id).content == %{"items" => []}
    assert Repo.aggregate(Assignment, :count) == 0
    used = custom(ctx)
    {:ok, saved} = Records.create_for_client(ctx, client.id, entry(used, today, %{text_value: "Kept"}))
    assert {:error, :in_use} = Trackers.delete_tracker(ctx, used.id)
    assert {:ok, %{archived_at: at}} = Trackers.archive_tracker(ctx, used.id)
    assert at
    assert {:ok, %{data: [read]}} = Reader.entries_for_client(ctx, client.id)
    assert read.id == saved.id
    assert {:error, :conflict} = Records.create_for_client(ctx, client.id, entry(used, today, %{text_value: "Blocked"}))
    assert {:ok, %{archived_at: nil}} = Trackers.restore_tracker(ctx, used.id)
  end

  test "same-day timing changes retain empty rows and SQL stops overlaps", %{ctx: ctx, client: client, today: today} do
    tracker = custom(ctx)
    {:ok, a} = Assignments.add_for_client(ctx, client.id, %{tracker_id: tracker.id, timing: :daily})
    {:ok, b} = Assignments.change_for_client(ctx, client.id, a.id, %{timing: :weekly, weekday: 6})
    assert {:ok, c} = Assignments.change_for_client(ctx, client.id, b.id, %{timing: :after_workout})
    assert a.id != b.id && b.id != c.id
    assert Repo.get!(Assignment, a.id).ends_on == Date.add(today, -1)
    assert Repo.get!(Assignment, b.id).ends_on == Date.add(today, -1)
    assert {:ok, [current]} = Assignments.list_for_client(ctx, client.id)
    assert current.id == c.id
    assert {:error, cs} = Assignments.add_for_client(ctx, client.id, %{tracker_id: tracker.id, timing: :daily})
    assert cs.errors[:starts_on]
    assert {:ok, _} = Assignments.end_for_client(ctx, client.id, c.id)
    assert {:ok, []} = Assignments.list_for_client(ctx, client.id)
  end

  test "templates validate duplicate archived and foreign items, then match atomically", %{ctx: ctx, client: client} do
    tracker = custom(ctx)
    item = %{tracker_id: tracker.id, timing: :daily}
    duplicate = %{name: "Duplicate", content: %{items: [item, item]}}
    assert {:error, :invalid_tracker} = Programming.create_template(ctx, :trackers, duplicate)
    foreign = insert(:business)
    foreign_coach = insert(:coach, business: foreign)
    other = custom(%Ctx{business_id: foreign.id, user_id: foreign_coach.user_id, coach_id: foreign_coach.id})
    assert {:error, :not_found} = Programming.create_template(ctx, :trackers, %{name: "Foreign", content: %{items: [%{item | tracker_id: other.id}]}})
    {:ok, template} = Programming.create_template(ctx, :trackers, %{name: "One", content: %{items: [item]}})
    assert {:ok, [a]} = Assignments.apply_for_client(ctx, client.id, template.id, 1)
    assert {:ok, [same]} = Assignments.apply_for_client(ctx, client.id, template.id, 1)
    assert a.id == same.id
    {:ok, _} = Trackers.archive_tracker(ctx, tracker.id)
    assert {:error, _} = Assignments.apply_for_client(ctx, client.id, template.id, 1)
    assert Repo.aggregate(Assignment, :count) == 1
    assert Repo.aggregate(Easy.Plans.Plan, :count) == 0
  end

  test "coach-start copies default once and returns do not copy it again", %{ctx: ctx, business: business, coach: coach, today: today} do
    {:ok, _} = Defaults.create_default(ctx)
    client = insert(:client, business: business, coach: coach, terms: [])
    assert {:ok, term} = CoachingTerms.start_term_for_client(ctx, client.id)
    assert {:ok, [a]} = Assignments.list_for_client(ctx, client.id)
    assert a.tracker.name == "Reflection" && a.timing == :weekly && a.weekday == 6
    Repo.update_all(from(t in CoachingTerm, where: t.id == ^term.id), set: [starts_on: Date.add(today, -2), ends_on: Date.add(today, -1)])
    {:ok, _} = Assignments.end_for_client(ctx, client.id, a.id)
    assert {:ok, _} = CoachingTerms.start_term_for_client(ctx, client.id)
    assert {:ok, []} = Assignments.list_for_client(ctx, client.id)
  end

  test "acceptance copies default inside transaction and invalid content rolls acceptance back", %{ctx: ctx} do
    {:ok, business} = Defaults.create_default(ctx)
    {:ok, invitation} = ClientInvitations.create(ctx, %{full_name: "Invited", email: "tracker-accept@test.test"})
    user = insert(:user)
    accept = %Ctx{business_id: ctx.business_id, user_id: user.id}
    template = Repo.get!(Template, business.default_tracker_template_id)
    Repo.update!(Ecto.Changeset.change(template, content: %{"items" => [%{"tracker_id" => Ecto.UUID.generate(), "timing" => "daily"}]}))
    assert {:error, :not_found} = CoachingTerms.accept_invite(accept, invitation, user.email)
    assert Repo.get!(Client, invitation.id).user_id == nil
    refute Repo.exists?(from(t in CoachingTerm, where: t.client_id == ^invitation.id))
    Repo.update!(Ecto.Changeset.change(Repo.get!(Template, template.id), content: template.content))
    assert {:ok, client} = CoachingTerms.accept_invite(accept, invitation, user.email)
    assert {:ok, [assignment]} = Assignments.list_for_client(ctx, client.id)
    assert assignment.weekday == 6
  end

  test "new businesses receive weekly Reflection default", %{business: business} do
    user = insert(:user)
    assert {:ok, created} = Easy.Orgs.create_business(%Ctx{user_id: user.id, business_id: nil}, %{name: "New trackers", handle: business.handle <> "-new", full_name: "Owner"})
    template = Repo.get!(Template, created.default_tracker_template_id)
    assert template.domain == :trackers
    assert [%{"weekday" => 6, "timing" => "weekly"}] = template.content["items"]
  end

  test "owner default apply-to-existing is atomic and optional", %{ctx: ctx, client: client} do
    tracker = custom(ctx)
    {:ok, template} = Programming.create_template(ctx, :trackers, %{name: "Daily", content: %{items: [%{tracker_id: tracker.id, timing: :daily}]}})
    assert {:ok, _} = Defaults.update_settings(ctx, %{default_tracker_template_id: template.id})
    assert {:ok, []} = Assignments.list_for_client(ctx, client.id)
    assert {:ok, _} = Defaults.update_settings(ctx, %{default_tracker_template_id: template.id, apply_to_existing: true})
    assert {:ok, [_]} = Assignments.list_for_client(ctx, client.id)
    assert {:error, :not_owner} = Defaults.update_settings(%{ctx | owner?: false}, %{default_tracker_template_id: nil})
  end

  test "coach and client writes journal added changed removed and exact retries do not advance sequence", %{ctx: ctx, client_ctx: cc, client: client, today: today, coach: coach} do
    tracker = custom(ctx)
    attrs = entry(tracker, today, %{text_value: "First"})
    assert {:ok, row} = Records.create_for_client(ctx, client.id, attrs)
    assert row.recorded_by_type == :coach && row.recorded_by_id == coach.id
    assert {:ok, retry} = Records.create_for_client(ctx, client.id, attrs)
    assert retry.id == row.id
    assert Repo.get!(Client, client.id).last_change_seq == 1
    assert {:error, :conflict} = Records.create_for_client(ctx, client.id, %{attrs | text_value: "Wrong"})
    correction = %{request_id: Ecto.UUID.generate(), expected_revision: 1, local_date: today, text_value: "Corrected"}
    assert {:ok, updated} = Records.update_for_client(cc, client.id, row.id, correction)
    assert updated.revision == 2 && updated.recorded_by_type == :coach
    assert {:ok, _} = Records.update_for_client(cc, client.id, row.id, correction)
    assert Repo.get!(Client, client.id).last_change_seq == 2
    assert {:ok, _} = Records.remove_for_client(cc, client.id, row.id, 2)
    assert {:ok, _} = Records.remove_for_client(cc, client.id, row.id, 2)
    assert {:ok, _} = Records.create_for_client(ctx, client.id, attrs)
    assert [added, changed, removed] = changes(client.id)
    assert added.action == "added" && added.changed_by_type == "coach" && added.record_type == "tracker_entry"
    assert changed.action == "changed" && changed.changed_by_type == "client" && changed.old_value["text_value"] == "First" && changed.new_value["text_value"] == "Corrected"
    assert removed.action == "removed" && removed.new_value == nil
    assert {:ok, %{count: 0}} = Reader.entries_for_client(cc, client.id)
    assert Repo.query!("SELECT count(*) FROM records WHERE kind='tracker_entry' AND client_id=$1", [Ecto.UUID.dump!(client.id)]).rows == [[0]]
  end

  test "unit conversion is shared and custom units stay literal", %{ctx: ctx, client: client, today: today} do
    for {n, unit, value, expected} <- [{1, "lb", 200, 90.718474}, {2, "in", 30, 76.2}, {5, "fl_oz", 10, 295.735295625}] do
      tracker = builtin(ctx, n)
      assert {:ok, row} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{number_value: value, entered_unit: unit}))
      assert_in_delta row.number_value, expected, 0.00000001
      assert row.entered_unit == unit
    end

    custom = custom(ctx, :number, %{base_unit: "kg"})
    {:ok, tracker} = Trackers.get_tracker(ctx, custom.id)
    assert Units.tracker_options(tracker) == [%{unit: "kg", to_base_factor: 1.0}]
    assert {:error, :invalid_unit} = Records.create_for_client(ctx, client.id, entry(custom, today, %{number_value: 200, entered_unit: "lb"}))
    assert {:ok, row} = Records.create_for_client(ctx, client.id, entry(custom, today, %{number_value: 3, entered_unit: "kg"}))
    assert row.number_value == 3.0
  end

  test "yes/no false is a value; kinds reject unrelated values", %{ctx: ctx, client: client, today: today} do
    tracker = custom(ctx, :yes_no)
    assert {:ok, %{yes_no_value: false}} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{yes_no_value: false}))
    assert {:error, _} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{yes_no_value: true, text_value: "wrong"}))
  end

  test "ordered PDF/image attachments journal changes and reject foreign duplicates and PDF photos", %{ctx: ctx, client: client, business: business, today: today} do
    tracker = custom(ctx, :document)
    pdf = insert(:attachment, client: client, business: business, content_type: "application/pdf", captured_on: today)
    photo = insert(:attachment, client: client, business: business)
    foreign = insert(:attachment)
    attrs = entry(tracker, today, %{attachment_ids: [pdf.id, photo.id]})
    assert {:ok, row} = Records.create_for_client(ctx, client.id, attrs)
    assert Enum.map(row.attachments, & &1.id) == [pdf.id, photo.id]
    assert hd(row.attachments).captured_on == today

    assert {:ok, corrected} =
             Records.update_for_client(ctx, client.id, row.id, %{request_id: Ecto.UUID.generate(), expected_revision: 1, local_date: today, attachment_ids: [photo.id, pdf.id]})

    assert Enum.map(corrected.attachments, & &1.position) == [0, 1]
    assert Enum.map(corrected.attachments, & &1.id) == [photo.id, pdf.id]
    assert Enum.count(changes(client.id), &(&1.row_type == "attachment")) == 4
    assert {:error, :invalid_attachments} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{attachment_ids: [foreign.id]}))
    assert {:error, :invalid_attachments} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{attachment_ids: [pdf.id, pdf.id]}))
    photo_tracker = custom(ctx, :photo)
    assert {:error, :invalid_attachments} = Records.create_for_client(ctx, client.id, entry(photo_tracker, today, %{attachment_ids: [pdf.id]}))
  end

  test "PDF upload allows 15 MiB and captured_on", %{ctx: ctx, client: client, today: today} do
    attrs = %{content_type: "application/pdf", byte_size: 15 * 1024 * 1024, captured_on: today}
    cs = Attachment.insert_changeset(ctx.business_id, :coach, ctx.coach_id, client.id, Ecto.UUID.generate(), attrs)
    assert cs.valid?
    assert Ecto.Changeset.get_field(cs, :captured_on) == today
    assert String.ends_with?(Ecto.Changeset.get_field(cs, :storage_key), ".pdf")
    refute Attachment.insert_changeset(ctx.business_id, :coach, ctx.coach_id, client.id, Ecto.UUID.generate(), %{attrs | byte_size: attrs.byte_size + 1}).valid?
  end

  test "due is today only, weekly timing, tombstones and coaching gating", %{ctx: ctx, client: client, today: today} do
    daily = custom(ctx)
    weekly = custom(ctx)
    off_day = custom(ctx)
    {:ok, _} = Assignments.add_for_client(ctx, client.id, %{tracker_id: daily.id, timing: :daily})
    {:ok, _} = Assignments.add_for_client(ctx, client.id, %{tracker_id: weekly.id, timing: :weekly, weekday: Date.day_of_week(today) - 1})
    {:ok, _} = Assignments.add_for_client(ctx, client.id, %{tracker_id: off_day.id, timing: :weekly, weekday: rem(Date.day_of_week(today), 7)})
    {:ok, _} = Records.create_for_client(ctx, client.id, entry(daily, Date.add(today, -1), %{text_value: "Yesterday"}))
    assert {:ok, %{due: due}} = Reader.today_for_client(ctx, client.id)
    assert MapSet.new(Enum.map(due, & &1.tracker.id)) == MapSet.new([daily.id, weekly.id])
    {:ok, row} = Records.create_for_client(ctx, client.id, entry(daily, today, %{text_value: "Today"}))
    assert {:ok, %{due: [_]}} = Reader.today_for_client(ctx, client.id)
    {:ok, _} = Records.remove_for_client(ctx, client.id, row.id, 1)
    assert {:ok, %{due: [_, _]}} = Reader.today_for_client(ctx, client.id)
    Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^client.id), set: [ends_on: Date.add(today, -1)])
    assert {:ok, %{due: [], requests: []}} = Reader.today_for_client(ctx, client.id)
  end

  test "requests close since request time, tombstones reopen, cancelled and earlier-term requests stay closed", %{ctx: ctx, client: client, today: today} do
    tracker = custom(ctx)
    {:ok, _} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{text_value: "Before"}))
    {:ok, request} = Reader.request_for_client(ctx, client.id, %{tracker_id: tracker.id})
    assert {:ok, [_]} = Reader.requests_for_client(ctx, client.id)
    {:ok, row} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{text_value: "After"}))
    assert {:ok, []} = Reader.requests_for_client(ctx, client.id)
    {:ok, _} = Records.remove_for_client(ctx, client.id, row.id, 1)
    assert {:ok, [_]} = Reader.requests_for_client(ctx, client.id)
    {:ok, _} = Reader.cancel_for_client(ctx, client.id, request.id)
    assert {:ok, []} = Reader.requests_for_client(ctx, client.id)
    {:ok, old} = Reader.request_for_client(ctx, client.id, %{tracker_id: tracker.id})
    Repo.update_all(from(r in Request, where: r.id == ^old.id), set: [requested_at: DateTime.add(DateTime.utc_now(), -400 * 86_400)])
    assert {:ok, []} = Reader.requests_for_client(ctx, client.id)
  end

  test "event links, prompts and coverage count distinct completed events only while assigned", %{ctx: ctx, client: client, business: business, today: today} do
    tracker = custom(ctx, :rating, %{scale_max: 5})
    {:ok, _} = Assignments.add_for_client(ctx, client.id, %{tracker_id: tracker.id, timing: :after_workout})
    session = insert(:workout_session, business: business, client: client, state: :completed, local_date: today)
    insert(:workout_session, business: business, client: client, state: :completed, local_date: Date.add(today, -1))
    insert(:workout_session, business: business, client: client, state: :active, local_date: today)
    assert {:ok, [_]} = Reader.prompts_for_client(ctx, client.id, %{about_session_id: session.id})

    for _ <- 1..2 do
      assert {:ok, _} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{rating_value: 4, about_session_id: session.id}))
    end

    assert {:ok, []} = Reader.prompts_for_client(ctx, client.id, %{about_session_id: session.id})
    assert {:ok, metrics} = Reader.metrics_for_client(ctx, client.id, tracker.id)
    assert metrics.workout_coverage == %{recorded: 1, total: 1}
    other_client = insert(:client)
    foreign = insert(:workout_session, business: other_client.business, client: other_client, state: :completed)
    assert {:error, :not_found} = Records.create_for_client(ctx, client.id, entry(tracker, today, %{rating_value: 3, about_session_id: foreign.id}))

    assert {:error, :invalid_tracker_value} =
             Records.create_for_client(ctx, client.id, entry(tracker, today, %{rating_value: 3, about_session_id: session.id, about_meal_id: Ecto.UUID.generate()}))
  end

  test "numeric and photo metrics supply server series and previous photo", %{ctx: ctx, client: client, business: business, today: today} do
    tracker = builtin(ctx, 1)

    for {date, value} <- [{Date.add(today, -2), 80}, {Date.add(today, -1), 82}, {today, 84}] do
      {:ok, _} = Records.create_for_client(ctx, client.id, entry(tracker, date, %{number_value: value, entered_unit: "kg"}))
    end

    assert {:ok, metrics} = Reader.metrics_for_client(ctx, client.id, tracker.id, from: Date.add(today, -1), to: today)
    assert metrics.count == 2 && metrics.min == 82 && metrics.max == 84 && metrics.average == 83 && metrics.change == 4
    assert Enum.map(metrics.series, & &1.value) == [82.0, 84.0]
    photo = custom(ctx, :photo)
    attachment = insert(:attachment, client: client, business: business)
    {:ok, first} = Records.create_for_client(ctx, client.id, entry(photo, Date.add(today, -1), %{attachment_ids: [attachment.id]}))
    {:ok, latest} = Records.create_for_client(ctx, client.id, entry(photo, today, %{attachment_ids: [attachment.id]}))
    assert {:ok, metrics} = Reader.metrics_for_client(ctx, client.id, photo.id)
    assert metrics.latest.id == latest.id && metrics.previous.id == first.id && metrics.first.id == first.id
  end

  test "client and coach scopes protect all target operations and entry counts", %{ctx: ctx, client_ctx: cc, client: client, business: business, today: today} do
    other = insert(:client, business: business)
    tracker = builtin(ctx, 10)
    {:ok, _} = Records.create_for_client(ctx, other.id, entry(tracker, today, %{text_value: "Private"}))
    assert {:ok, value} = Trackers.describe_tracker(cc, tracker.id)
    assert value.entry_count == 0
    coach_ctx = %{ctx | owner?: false}
    assert {:ok, value} = Trackers.describe_tracker(coach_ctx, tracker.id)
    assert value.entry_count == 0

    for context <- [cc, coach_ctx] do
      assert {:error, :not_found} = Reader.entries_for_client(context, other.id)
      assert {:error, :not_found} = Reader.metrics_for_client(context, other.id, tracker.id)
      assert {:error, :not_found} = Reader.requests_for_client(context, other.id)
      assert {:error, :not_found} = Reader.today_for_client(context, other.id)
      assert {:error, :not_found} = Records.create_for_client(context, other.id, entry(tracker, today, %{text_value: "Denied"}))
      assert {:error, :not_found} = Assignments.list_for_client(context, other.id)
    end

    assert {:ok, _} = Records.create_for_client(cc, client.id, entry(tracker, today, %{text_value: "Mine"}))
  end

  test "archiving a default tracker prunes templates and keeps first coaching start usable", f do
    tracker = custom(f.ctx)
    {:ok, template} = Programming.create_template(f.ctx, :trackers, %{name: "Default", content: %{items: [%{tracker_id: tracker.id, timing: :daily}]}})
    {:ok, _} = Defaults.update_settings(f.ctx, %{default_tracker_template_id: template.id})
    {:ok, _} = Records.create_for_client(f.ctx, f.client.id, entry(tracker, f.today, %{text_value: "Existing"}))
    assert {:ok, _} = Trackers.archive_tracker(f.ctx, tracker.id)
    assert Repo.get!(Template, template.id).content == %{"items" => []}
    assert Repo.get!(Template, template.id).revision == 2
    client = insert(:client, business: f.business, coach: f.coach, terms: [])
    assert {:ok, _} = CoachingTerms.start_term_for_client(f.ctx, client.id)
    assert {:ok, []} = Assignments.list_for_client(f.ctx, client.id)
  end

  test "invalid default rolls back coach term start", f do
    {:ok, business} = Defaults.create_default(f.ctx)
    template = Repo.get!(Template, business.default_tracker_template_id)
    Repo.update!(Ecto.Changeset.change(template, content: %{"items" => [%{"tracker_id" => Ecto.UUID.generate(), "timing" => "daily"}]}))
    client = insert(:client, business: f.business, coach: f.coach, terms: [])
    assert {:error, :not_found} = CoachingTerms.start_term_for_client(f.ctx, client.id)
    refute Repo.exists?(from(t in CoachingTerm, where: t.client_id == ^client.id))
  end

  test "meal prompts and coverage count shared meals once in assignment dates", f do
    tracker = custom(f.ctx, :yes_no)
    {:ok, _} = Assignments.add_for_client(f.ctx, f.client.id, %{tracker_id: tracker.id, timing: :after_meal})
    meal = meal(f, f.today, "Breakfast", true)
    meal(f, f.today, "Lunch", true)
    meal(f, f.today, "Draft", false)
    meal(f, Date.add(f.today, -1), "Before assignment", true)
    assert {:ok, [_]} = Reader.prompts_for_client(f.client_ctx, f.client.id, %{about_meal_id: meal.id})

    for _ <- 1..2 do
      assert {:ok, _} = Records.create_for_client(f.client_ctx, f.client.id, entry(tracker, f.today, %{yes_no_value: true, about_meal_id: meal.id}))
    end

    assert {:ok, []} = Reader.prompts_for_client(f.client_ctx, f.client.id, %{about_meal_id: meal.id})
    assert {:ok, metrics} = Reader.metrics_for_client(f.ctx, f.client.id, tracker.id)
    assert metrics.meal_coverage == %{recorded: 1, total: 2}
    other = insert(:client, business: f.business)
    other_meal = meal(%{f | client: other}, f.today, "Other", true)
    assert {:error, :not_found} = Records.create_for_client(f.client_ctx, f.client.id, entry(tracker, f.today, %{yes_no_value: false, about_meal_id: other_meal.id}))
  end

  test "retry identity rejects a changed tracker or attachments and survives later correction", f do
    document = custom(f.ctx, :document)
    photo1 = insert(:attachment, business: f.business, client: f.client)
    photo2 = insert(:attachment, business: f.business, client: f.client)
    attrs = entry(document, f.today, %{attachment_ids: [photo1.id]})
    {:ok, row} = Records.create_for_client(f.ctx, f.client.id, attrs)
    assert {:error, :conflict} = Records.create_for_client(f.ctx, f.client.id, %{attrs | attachment_ids: [photo2.id]})
    other = custom(f.ctx, :document)
    assert {:error, :conflict} = Records.create_for_client(f.ctx, f.client.id, %{attrs | tracker_id: other.id})
    correction = %{request_id: Ecto.UUID.generate(), expected_revision: 1, local_date: f.today, attachment_ids: [photo2.id]}
    assert {:ok, _} = Records.update_for_client(f.ctx, f.client.id, row.id, correction)
    assert {:ok, replay} = Records.create_for_client(f.ctx, f.client.id, attrs)
    assert replay.id == row.id
    assert Repo.get!(Client, f.client.id).last_change_seq == 2
    assert Enum.any?(changes(f.client.id), &(&1.row_type == "attachment" and &1.action == "removed"))
  end

  test "SQL rejects kind changes", f do
    tracker = custom(f.ctx)
    assert_raise Postgrex.Error, fn -> Repo.query!("UPDATE trackers SET kind='photo' WHERE id=$1", [Ecto.UUID.dump!(tracker.id)]) end
  end

  test "SQL rejects scale changes", f do
    tracker = custom(f.ctx, :rating, %{scale_max: 5})
    assert_raise Postgrex.Error, fn -> Repo.query!("UPDATE trackers SET scale_max=10 WHERE id=$1", [Ecto.UUID.dump!(tracker.id)]) end
  end

  test "SQL enforces the one-event check", f do
    tracker = custom(f.ctx)
    {:ok, row} = Records.create_for_client(f.ctx, f.client.id, entry(tracker, f.today, %{text_value: "Value"}))

    assert_raise Postgrex.Error, fn ->
      Repo.query!("UPDATE tracker_entries SET about_session_id=$1,about_meal_id=$2 WHERE id=$3", [
        Ecto.UUID.dump!(Ecto.UUID.generate()),
        Ecto.UUID.dump!(Ecto.UUID.generate()),
        Ecto.UUID.dump!(row.id)
      ])
    end
  end

  test "partial text corrections retain value and event and retry from the journal", f do
    tracker = custom(f.ctx)
    session = insert(:workout_session, business: f.business, client: f.client, state: :completed)
    {:ok, original} = Records.create_for_client(f.ctx, f.client.id, entry(tracker, f.today, %{text_value: "Original", about_session_id: session.id}))
    patch = %{request_id: Ecto.UUID.generate(), expected_revision: 1, local_date: Date.add(f.today, -1)}
    assert {:ok, corrected} = Records.update_for_client(f.ctx, f.client.id, original.id, patch)
    assert corrected.text_value == "Original" && corrected.about_session_id == session.id
    assert {:ok, replay} = Records.update_for_client(f.ctx, f.client.id, original.id, patch)
    assert replay.revision == 2
    assert Repo.get!(Client, f.client.id).last_change_seq == 2
    assert {:error, :conflict} = Records.update_for_client(f.ctx, f.client.id, original.id, Map.put(patch, :text_value, "Changed replay"))
  end

  test "partial numeric correction keeps base values and retries without conversion", f do
    tracker = builtin(f.ctx, 1)
    {:ok, original} = Records.create_for_client(f.ctx, f.client.id, entry(tracker, f.today, %{number_value: 200, entered_unit: "lb"}))
    patch = %{request_id: Ecto.UUID.generate(), expected_revision: 1, local_date: Date.add(f.today, -1)}
    assert {:ok, corrected} = Records.update_for_client(f.ctx, f.client.id, original.id, patch)
    assert corrected.number_value == original.number_value && corrected.entered_unit == "lb"
    assert {:ok, _} = Records.update_for_client(f.ctx, f.client.id, original.id, patch)
    value_patch = %{request_id: Ecto.UUID.generate(), expected_revision: 2, local_date: f.today, number_value: 202}
    assert {:ok, changed} = Records.update_for_client(f.ctx, f.client.id, original.id, value_patch)
    assert_in_delta changed.number_value, 91.62565874, 0.00000001
    assert {:ok, _} = Records.update_for_client(f.ctx, f.client.id, original.id, value_patch)
    assert Repo.get!(Client, f.client.id).last_change_seq == 3
  end

  test "partial document correction retains ordered attachments and retries after later changes", f do
    tracker = custom(f.ctx, :document)
    first = insert(:attachment, business: f.business, client: f.client)
    second = insert(:attachment, business: f.business, client: f.client)
    {:ok, original} = Records.create_for_client(f.ctx, f.client.id, entry(tracker, f.today, %{attachment_ids: [first.id, second.id]}))
    patch = %{request_id: Ecto.UUID.generate(), expected_revision: 1, local_date: Date.add(f.today, -1)}
    assert {:ok, corrected} = Records.update_for_client(f.ctx, f.client.id, original.id, patch)
    assert Enum.map(corrected.attachments, & &1.id) == [first.id, second.id]
    assert {:ok, _} = Records.update_for_client(f.ctx, f.client.id, original.id, patch)
    later = %{request_id: Ecto.UUID.generate(), expected_revision: 2, local_date: f.today, attachment_ids: [second.id]}
    assert {:ok, _} = Records.update_for_client(f.ctx, f.client.id, original.id, later)
    assert {:ok, replay} = Records.update_for_client(f.ctx, f.client.id, original.id, patch)
    assert Enum.map(replay.attachments, & &1.id) == [second.id]
    assert Repo.get!(Client, f.client.id).last_change_seq == 3
  end

  defp meal(f, date, name, shared?) do
    attrs = %{
      id: Ecto.UUID.generate(),
      client_id: f.client.id,
      request_id: Ecto.UUID.generate(),
      local_date: date,
      timezone: "Etc/UTC",
      name: name,
      shared_at: if(shared?, do: DateTime.utc_now(:second))
    }

    f.business.id |> DiaryMeal.insert_changeset({:client, f.client.id}, attrs) |> Repo.insert!()
  end
end

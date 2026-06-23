defmodule Easy.ThreadsTest do
  use Easy.DataCase, async: true

  alias Easy.Threads.Thread
  alias Easy.Threads.ThreadMessage

  @coach %{type: "coach", id: Ecto.UUID.generate()}

  describe "Thread.insert_changeset/4" do
    test "valid with a known module" do
      cs = Thread.insert_changeset("biz", "client", @coach, %{"module" => "nutrition", "title" => "Hi"})
      assert cs.valid?
      assert Ecto.Changeset.get_field(cs, :created_by_type) == :coach
      assert Ecto.Changeset.get_field(cs, :status) == :open
    end

    test "rejects an unknown module" do
      cs = Thread.insert_changeset("biz", "client", @coach, %{"module" => "spaceship"})
      refute cs.valid?
      assert "is invalid" in errors_on(cs).module
    end

    test "does not cast business_id/client_id/created_by from attrs" do
      cs =
        Thread.insert_changeset("biz", "client", @coach, %{
          "module" => "general",
          "business_id" => "evil",
          "created_by_id" => "evil"
        })

      assert Ecto.Changeset.get_field(cs, :business_id) == "biz"
      assert Ecto.Changeset.get_field(cs, :created_by_id) == @coach.id
    end
  end

  describe "Thread.update_changeset/2" do
    test "rejects an invalid status" do
      cs = Thread.update_changeset(%Thread{}, %{"status" => "burning"})
      refute cs.valid?
      assert "is invalid" in errors_on(cs).status
    end
  end

  describe "ThreadMessage.insert_changeset/3" do
    test "requires a body" do
      cs = ThreadMessage.insert_changeset("thread", %{type: "client", id: "c1"}, %{})
      refute cs.valid?
      assert "can't be blank" in errors_on(cs).body
    end

    test "sets author from the trusted arg, not attrs" do
      cs = ThreadMessage.insert_changeset("thread", %{type: "client", id: "c1"}, %{"body" => "hey", "author_type" => "system"})
      assert Ecto.Changeset.get_field(cs, :author_type) == :client
      assert Ecto.Changeset.get_field(cs, :author_id) == "c1"
    end
  end

  describe "Easy.Threads context" do
    alias Easy.Ctx
    alias Easy.Threads

    defp coach_ctx(coach), do: Ctx.new(coach.business_id, coach.user_id)
    defp client_ctx(client), do: Ctx.new(client.business_id, client.user_id)

    test "create_thread_for_client sets coach as creator and scopes to the client" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach)

      assert {:ok, thread} =
               Threads.create_thread_for_client(coach_ctx(coach), client.id, %{
                 "module" => "nutrition",
                 "title" => "Check-in"
               })

      assert thread.created_by_type == :coach
      assert thread.created_by_id == coach.id
      assert thread.client_id == client.id
      assert thread.status == :open
    end

    test "create_thread_for_client 404s for a client in another business" do
      coach = insert(:coach)
      other_coach = insert(:coach)
      other = insert(:client, creator: other_coach, business: other_coach.business, user: insert(:user))

      assert {:error, :not_found} =
               Threads.create_thread_for_client(coach_ctx(coach), other.id, %{
                 "module" => "general"
               })
    end

    test "create_client_thread forces client_id to the authenticated client" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))

      assert {:ok, thread} =
               Threads.create_client_thread(client_ctx(client), %{
                 "client_id" => Ecto.UUID.generate(),
                 "module" => "general"
               })

      assert thread.client_id == client.id
      assert thread.created_by_type == :client
    end

    test "add_message updates the parent thread's last_message fields atomically" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach)
      thread = insert(:thread, business: coach.business, client: client, created_by_id: coach.id)

      assert {:ok, message} =
               Threads.add_message(coach_ctx(coach), thread.id, %{"body" => "Hello there"})

      assert message.author_type == :coach
      reloaded = Easy.Repo.get(Easy.Threads.Thread, thread.id)
      assert reloaded.last_message_preview == "Hello there"
      assert reloaded.last_message_at == message.inserted_at
    end

    test "add_client_message rejects a thread that is not the client's" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      other_client = insert(:client, business: coach.business, creator: coach)
      thread = insert(:thread, business: coach.business, client: other_client, created_by_id: coach.id)

      assert {:error, :not_found} =
               Threads.add_client_message(client_ctx(client), thread.id, %{"body" => "hi"})
    end

    test "list_threads filters by status and is business-scoped" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach)
      open = insert(:thread, business: coach.business, client: client, created_by_id: coach.id, status: :open)
      insert(:thread, business: coach.business, client: client, created_by_id: coach.id, status: :archived)
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business, user: insert(:user))
      insert(:thread, business: other_coach.business, client: other_client, created_by_id: other_coach.id)

      assert {:ok, %{count: 1, threads: [only]}} = Threads.list_threads(coach_ctx(coach), status: "open")
      assert only.id == open.id
    end

    test "get_thread preloads messages ordered by insertion" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach)
      thread = insert(:thread, business: coach.business, client: client, created_by_id: coach.id)
      Threads.add_message(coach_ctx(coach), thread.id, %{"body" => "first"})
      Threads.add_message(coach_ctx(coach), thread.id, %{"body" => "second"})

      assert {:ok, loaded} = Threads.get_thread(coach_ctx(coach), thread.id)
      assert Enum.map(loaded.messages, & &1.body) == ["first", "second"]
    end
  end
end

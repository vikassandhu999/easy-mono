defmodule Easy.ThreadsTest do
  use Easy.DataCase, async: true

  alias Easy.Threads.Thread
  alias Easy.Threads.ThreadMessage

  @coach %{type: "coach", id: Ecto.UUID.generate()}

  describe "Thread.insert_changeset/4" do
    test "valid with a known module" do
      cs = Thread.insert_changeset("biz", "client", @coach, %{"module" => "nutrition", "title" => "Hi"})
      assert cs.valid?
      assert Ecto.Changeset.get_field(cs, :created_by_type) == "coach"
      assert Ecto.Changeset.get_field(cs, :status) == "open"
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
      assert Ecto.Changeset.get_field(cs, :author_type) == "client"
      assert Ecto.Changeset.get_field(cs, :author_id) == "c1"
    end
  end
end

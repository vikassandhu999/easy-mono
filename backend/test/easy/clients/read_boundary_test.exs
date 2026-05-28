defmodule Easy.Clients.ReadBoundaryTest do
  use Easy.SchemaCase

  alias Easy.Clients

  @training_schemas [
    "lib/easy/training/exercise.ex",
    "lib/easy/training/training_plan.ex",
    "lib/easy/training/workout.ex",
    "lib/easy/training/workout_element.ex",
    "lib/easy/training/workout_session.ex"
  ]

  test "training plan assignment does not hide a client lookup" do
    source = File.read!(Path.join(File.cwd!(), "lib/easy/training/training_plan.ex"))

    refute source =~ "Clients.Client.accessible?"
  end

  test "training schemas do not expose broad accessibility database checks" do
    for path <- @training_schemas do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ ~r/def accessible\?/, path
      refute source =~ ~r/def accessible_workout\?/, path
      refute source =~ ~r/def client_accessible_workout\?/, path
    end
  end

  test "get_client/2 returns only clients in the requested business" do
    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, business: business, creator: coach, user: insert(:user))

    other_business = insert(:business)
    other_coach = insert(:coach, business: other_business)

    other_client =
      insert(:client, business: other_business, creator: other_coach, user: insert(:user))

    assert {:ok, %{id: client_id}} = Clients.get_client(business.id, client.id)
    assert client_id == client.id
    assert {:error, :not_found} = Clients.get_client(business.id, other_client.id)
  end
end

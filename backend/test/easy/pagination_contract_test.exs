defmodule Easy.PaginationContractTest do
  use Easy.DataCase, async: true

  alias Easy.Trackers.Templates

  alias Easy.Chat

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    %{coach: coach, client: client, ctx: trainer_ctx(coach)}
  end

  for {domain, factory} <- [{:trackers, :tracker_template}] do
    test "#{domain} template pages retain bounds and stable timestamp ties", %{coach: coach, ctx: ctx} do
      plans =
        insert_list(101, unquote(factory),
          business: coach.business,
          creator: coach,
          inserted_at: DateTime.utc_now(:second)
        )

      expected_ids = plans |> Enum.map(& &1.id) |> Enum.sort(:desc)
      other = insert(:coach)
      insert(unquote(factory), business: other.business, creator: other)

      assert {:ok, %{count: 101, data: default_page}} = Templates.list_template_page(ctx)
      assert Enum.map(default_page, & &1.id) == Enum.take(expected_ids, 20)

      assert {:ok, %{count: 101, data: [first]}} = Templates.list_template_page(ctx, limit: 0, offset: -1)
      assert first.id == hd(expected_ids)

      assert {:ok, %{count: 101, data: page}} = Templates.list_template_page(ctx, limit: 500)
      assert length(page) == 100

      assert {:ok, %{count: 101, data: remainder}} =
               Templates.list_template_page(ctx, limit: 500, offset: 100)

      assert Enum.map(page ++ remainder, & &1.id) == expected_ids
    end
  end

  test "conversation lists allow pages larger than the default", %{coach: coach, ctx: ctx} do
    for client <- insert_list(25, :client, business: coach.business, coach: coach) do
      assert {:ok, _conversation} = Chat.get_or_create_conversation_for_client(ctx, client.id)
    end

    assert {:ok, %{count: 25, conversations: default_page}} = Chat.list_conversations(ctx)
    assert length(default_page) == 20
    assert {:ok, %{count: 25, conversations: expanded}} = Chat.list_conversations(ctx, limit: 25)
    assert length(expanded) == 25
  end

  test "message history caps at one hundred and continues from its cursor", %{client: client, ctx: ctx} do
    assert {:ok, conversation} = Chat.get_or_create_conversation_for_client(ctx, client.id)

    for n <- 1..105 do
      assert {:ok, _message} = Chat.send_message(ctx, conversation.id, %{body: "Message #{n}"})
    end

    assert {:ok, %{messages: default_page, has_more: true}} = Chat.list_messages(ctx, conversation.id)
    assert length(default_page) == 20

    assert {:ok, %{messages: page, has_more: true}} = Chat.list_messages(ctx, conversation.id, limit: 500)
    assert length(page) == 100
    oldest = hd(page)

    assert {:ok, %{messages: remainder, has_more: false}} =
             Chat.list_messages(ctx, conversation.id, limit: 100, before: oldest.id)

    assert length(remainder) == 5
    assert MapSet.size(MapSet.new(page ++ remainder, & &1.id)) == 105
  end
end

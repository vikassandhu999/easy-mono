defmodule Easy.PaginationContractTest do
  use Easy.DataCase, async: true

  alias Easy.Plans.Reader

  alias Easy.Chat

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    %{coach: coach, client: client, ctx: trainer_ctx(coach)}
  end

  for {domain, factory} <- [{:nutrition, :nutrition_plan}, {:training, :training_plan}] do
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

      assert {:ok, %{count: 101, data: default_page}} = Reader.list_template_page(ctx, unquote(domain))
      assert Enum.map(default_page, & &1.id) == Enum.take(expected_ids, 20)

      assert {:ok, %{count: 101, data: [first]}} = Reader.list_template_page(ctx, unquote(domain), limit: 0, offset: -1)
      assert first.id == hd(expected_ids)

      assert {:ok, %{count: 101, data: page}} = Reader.list_template_page(ctx, unquote(domain), limit: 500)
      assert length(page) == 100

      assert {:ok, %{count: 101, data: remainder}} =
               Reader.list_template_page(ctx, unquote(domain), limit: 500, offset: 100)

      assert Enum.map(page ++ remainder, & &1.id) == expected_ids
    end
  end

  for {domain, factory} <- [{:nutrition, :nutrition_plan}, {:training, :training_plan}] do
    test "#{domain} client-plan pages retain bounds and scope", %{
      coach: coach,
      client: client,
      ctx: _coach_ctx
    } do
      inserted_at = DateTime.utc_now(:second)

      plans =
        for offset <- 0..100 do
          date = Date.add(Date.utc_today(), offset)

          insert(unquote(factory),
            business: coach.business,
            creator: coach,
            client: client,
            kind: :client_plan,
            start_date: date,
            end_date: date,
            inserted_at: inserted_at
          )
        end

      expected_ids = plans |> Enum.map(& &1.id) |> Enum.sort(:desc)
      other_client = insert(:client, business: coach.business, coach: coach)
      outsider = insert(:coach)
      foreign = insert(:client, business: outsider.business, coach: outsider)

      for {owner, target} <- [{coach, other_client}, {outsider, foreign}] do
        insert(unquote(factory), business: owner.business, creator: owner, client: target, kind: :client_plan)
      end

      client_ctx = %Easy.Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}

      list = &Reader.list_client_plan_page(client_ctx, unquote(domain), &1)

      assert {:ok, %{count: 101, data: default_page}} = list.([])
      assert Enum.map(default_page, & &1.id) == Enum.take(expected_ids, 20)
      assert {:ok, %{count: 101, data: [first]}} = list.(limit: 0, offset: -1)
      assert first.id == hd(expected_ids)
      assert {:ok, %{count: 101, data: page}} = list.(limit: 500)
      assert length(page) == 100
      assert {:ok, %{count: 101, data: remainder}} = list.(limit: 500, offset: 100)
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

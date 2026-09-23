defmodule Easy.PaginationContractTest do
  use Easy.DataCase, async: true

  alias Easy.Chat

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    %{coach: coach, client: client, ctx: trainer_ctx(coach)}
  end

  for {reader, factory} <- [{Easy.Nutrition.PlanReader, :plan}, {Easy.Training.PlanReader, :training_plan}] do
    test "#{inspect(reader)} template pages retain bounds and stable timestamp ties", %{coach: coach, ctx: ctx} do
      plans =
        insert_list(101, unquote(factory),
          business: coach.business,
          creator: coach.user,
          inserted_at: DateTime.utc_now(:second)
        )

      expected_ids = plans |> Enum.map(& &1.id) |> Enum.sort(:desc)
      other = insert(:coach)
      insert(unquote(factory), business: other.business, creator: other.user)

      assert {:ok, %{count: 101, templates: default_page}} = unquote(reader).list_templates(ctx)
      assert Enum.map(default_page, & &1.id) == Enum.take(expected_ids, 20)

      assert {:ok, %{count: 101, templates: [first]}} = unquote(reader).list_templates(ctx, limit: 0, offset: -1)
      assert first.id == hd(expected_ids)

      assert {:ok, %{count: 101, templates: page}} = unquote(reader).list_templates(ctx, limit: 500)
      assert length(page) == 100

      assert {:ok, %{count: 101, templates: remainder}} = unquote(reader).list_templates(ctx, limit: 500, offset: 100)
      assert Enum.map(page ++ remainder, & &1.id) == expected_ids
    end
  end

  for {reader, factory, actor} <- [
        {Easy.Nutrition.PlanReader, :plan, :client},
        {Easy.Training.PlanReader, :training_plan, :client},
        {Easy.Training.PlanReader, :training_plan, :coach}
      ] do
    test "#{inspect(reader)} #{actor} client-plan pages retain bounds and scope", %{
      coach: coach,
      client: client,
      ctx: coach_ctx
    } do
      inserted_at = DateTime.utc_now(:second)

      plans =
        for offset <- 0..100 do
          date = Date.add(~D[2026-01-01], offset)

          insert(unquote(factory),
            business: coach.business,
            creator: coach.user,
            client: client,
            kind: :client_plan,
            start_date: date,
            end_date: date,
            inserted_at: inserted_at
          )
        end

      expected_ids = plans |> Enum.map(& &1.id) |> Enum.sort(:desc)
      other_client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      outsider = insert(:coach)
      foreign = insert(:client, business: outsider.business, creator: outsider, assigned_coach: outsider)

      for {owner, target} <- [{coach, other_client}, {outsider, foreign}] do
        insert(unquote(factory), business: owner.business, creator: owner.user, client: target, kind: :client_plan)
      end

      client_ctx = %Easy.Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}

      list =
        case unquote(actor) do
          :client -> &unquote(reader).list_client_plans(client_ctx, &1)
          :coach -> &Easy.Training.PlanReader.list_plans_for_client(coach_ctx, client.id, &1)
        end

      assert {:ok, %{count: 101, plans: default_page}} = list.([])
      assert Enum.map(default_page, & &1.id) == Enum.take(expected_ids, 20)
      assert {:ok, %{count: 101, plans: [first]}} = list.(limit: 0, offset: -1)
      assert first.id == hd(expected_ids)
      assert {:ok, %{count: 101, plans: page}} = list.(limit: 500)
      assert length(page) == 100
      assert {:ok, %{count: 101, plans: remainder}} = list.(limit: 500, offset: 100)
      assert Enum.map(page ++ remainder, & &1.id) == expected_ids
    end
  end

  test "conversation lists allow pages larger than the default", %{coach: coach, ctx: ctx} do
    for client <- insert_list(25, :client, business: coach.business, creator: coach, assigned_coach: coach) do
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

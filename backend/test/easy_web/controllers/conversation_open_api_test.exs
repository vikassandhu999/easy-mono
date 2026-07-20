defmodule EasyWeb.ConversationOpenApiTest do
  use ExUnit.Case, async: true

  alias EasyWeb.OpenApi.Schemas.{
    ClientChatMessageCreateRequest,
    CoachChatMessageCreateRequest
  }

  test "message requests require body, attachments, or a coach embed" do
    spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.resolve_schema_modules()
    coach_schema = spec.components.schemas[CoachChatMessageCreateRequest.schema().title]
    client_schema = spec.components.schemas[ClientChatMessageCreateRequest.schema().title]

    for schema <- [coach_schema, client_schema],
        payload <- [%{}, %{"body" => nil}, %{"body" => "   "}, %{"attachment_ids" => []}] do
      assert {:error, _errors} = OpenApiSpex.cast_value(payload, schema, spec)
    end

    assert {:ok, _request} =
             OpenApiSpex.cast_value(%{"body" => "Hello"}, client_schema, spec)

    assert {:ok, _request} =
             OpenApiSpex.cast_value(
               %{"attachment_ids" => [Ecto.UUID.generate()]},
               client_schema,
               spec
             )

    assert {:ok, _request} =
             OpenApiSpex.cast_value(
               %{
                 "embed" => %{
                   "type" => "form_submission",
                   "id" => Ecto.UUID.generate()
                 }
               },
               coach_schema,
               spec
             )
  end
end

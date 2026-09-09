defmodule Easy.FormAnswersTest do
  use ExUnit.Case, async: true

  alias Easy.FormAnswers

  test "reads typed answers in question order and keeps photo order" do
    first = Ecto.UUID.generate()
    second = Ecto.UUID.generate()
    third = Ecto.UUID.generate()

    sections = [
      %{"questions" => [question("w2", "weight"), question("p2", "photo")]},
      %{"questions" => [question("w1", "weight"), question("p1", "photo"), question("note", "text")]}
    ]

    answers = %{"w1" => 70, "w2" => 71.5, "p1" => [third], "p2" => [second, first], "note" => "72"}

    assert :ok = FormAnswers.validate(sections, answers)
    assert FormAnswers.weight_values(sections, answers) == [71.5, 70]
    assert FormAnswers.photo_attachment_ids(sections, answers) == [second, first, third]
    assert FormAnswers.required_services(sections, answers) == nil
  end

  test "uses the first service question and explicitly converts known service names" do
    sections = [%{"questions" => [question("services", "service_type"), question("later", "service_type")]}]

    for selected <- [%{"services" => ["training", "nutrition"]}, %{services: ["training", "nutrition"]}] do
      answers = %{"services" => selected, "later" => %{"services" => ["nutrition"]}}
      assert :ok = FormAnswers.validate(sections, answers)
      assert FormAnswers.required_services(sections, answers) == [:training, :nutrition]
    end
  end

  test "omitted optional answers produce no extracted values and validation errors keep their precedence" do
    sections = [%{"questions" => [question("weight", "weight"), question("photo", "photo")]}]
    assert :ok = FormAnswers.validate(sections, %{})
    assert FormAnswers.weight_values(sections, %{}) == []
    assert FormAnswers.photo_attachment_ids(sections, %{}) == []

    required = [%{"questions" => [Map.put(question("weight", "weight"), "required", true)]}]
    assert {:error, :unknown_answer_keys} = FormAnswers.validate(required, %{"unknown" => 1})
    assert {:error, :missing_required_answers} = FormAnswers.validate(required, %{})
    assert {:error, :invalid_answer_values} = FormAnswers.validate(required, %{"weight" => "heavy"})
  end

  defp question(id, type), do: %{"id" => id, "type" => type}
end

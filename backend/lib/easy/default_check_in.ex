defmodule Easy.DefaultCheckIn do
  @sections [
    %{
      "title" => "Body",
      "questions" => [
        %{"id" => "weight", "label" => "Weight", "type" => "weight", "required" => false},
        %{
          "id" => "progress-photos",
          "label" => "Progress photos (front/side/back)",
          "type" => "photo",
          "required" => false
        }
      ]
    },
    %{
      "title" => "Recovery",
      "questions" => [
        %{"id" => "energy", "label" => "Energy levels", "type" => "rating", "required" => false},
        %{"id" => "sleep-quality", "label" => "Sleep quality", "type" => "rating", "required" => false},
        %{"id" => "stress", "label" => "Stress levels", "type" => "rating", "required" => false}
      ]
    },
    %{
      "title" => "Adherence",
      "questions" => [
        %{
          "id" => "training-adherence",
          "label" => "Training adherence",
          "type" => "rating",
          "required" => false
        },
        %{
          "id" => "nutrition-adherence",
          "label" => "Nutrition adherence",
          "type" => "rating",
          "required" => false
        },
        %{"id" => "hunger", "label" => "Hunger levels", "type" => "rating", "required" => false}
      ]
    },
    %{
      "title" => "Reflection",
      "questions" => [
        %{"id" => "biggest-win", "label" => "Biggest win this week", "type" => "text", "required" => false},
        %{
          "id" => "biggest-challenge",
          "label" => "Biggest challenge this week",
          "type" => "text",
          "required" => false
        },
        %{
          "id" => "coach-questions",
          "label" => "Questions for your coach",
          "type" => "text",
          "required" => false
        }
      ]
    }
  ]

  @spec sections() :: [map()]
  def sections, do: @sections

  @spec system_version() :: pos_integer()
  def system_version, do: 2

  @spec upgrade_sections([map()]) :: [map()]
  def upgrade_sections(sections) do
    photo_question =
      sections()
      |> Enum.flat_map(& &1["questions"])
      |> Enum.find(&(&1["id"] == "progress-photos"))

    if Enum.any?(sections, fn section ->
         Enum.any?(Map.get(section, "questions", []), &(&1["id"] == "progress-photos"))
       end) do
      sections
    else
      append_question_to_body(sections, photo_question)
    end
  end

  defp append_question_to_body(sections, question) do
    if Enum.any?(sections, &(&1["title"] == "Body")) do
      Enum.map(sections, fn
        %{"title" => "Body"} = section ->
          Map.update(section, "questions", [question], &(&1 ++ [question]))

        section ->
          section
      end)
    else
      [%{"title" => "Body", "questions" => [question]} | sections]
    end
  end
end

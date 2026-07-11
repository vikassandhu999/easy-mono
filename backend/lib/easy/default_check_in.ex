defmodule Easy.DefaultCheckIn do
  @sections [
    %{
      "title" => "Body",
      "questions" => [
        %{"id" => "weight", "label" => "Weight", "type" => "weight", "required" => false}
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
end

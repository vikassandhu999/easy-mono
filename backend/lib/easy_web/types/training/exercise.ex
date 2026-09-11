defmodule EasyWeb.Types.Training.ExerciseRelation do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:description) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Training.ExerciseMedia do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :image | :video,
          required(:content_type) => String.t(),
          required(:byte_size) => integer(),
          required(:url) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Training.Exercise do
  use EasyWeb.Type

  alias Easy.LibraryMedia
  alias Easy.LibraryMedia.Media
  alias Easy.Training.TrainingExercise

  @type t :: %{
          required(:id) => String.t(),
          required(:source) => String.t() | nil,
          required(:tracking_type) => String.t() | nil,
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:instructions) => String.t() | nil,
          required(:mechanics) => :compound | :isolation | :isometric | nil,
          required(:force) => :push | :pull | :static | nil,
          required(:images) => [String.t()],
          required(:media) => EasyWeb.Types.Training.ExerciseMedia.t() | nil,
          required(:muscles) => [EasyWeb.Types.Training.ExerciseRelation.t()],
          required(:equipment) => [EasyWeb.Types.Training.ExerciseRelation.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:instructions) => String.t() | nil,
          optional(:mechanics) => :compound | :isolation | :isometric | nil,
          optional(:force) => :push | :pull | :static | nil,
          optional(:images) => [String.t()],
          optional(:media_id) => String.t() | nil,
          optional(:muscle_ids) => [String.t()],
          optional(:equipment_ids) => [String.t()]
        }

  @type update :: %{
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:instructions) => String.t() | nil,
          optional(:mechanics) => :compound | :isolation | :isometric | nil,
          optional(:force) => :push | :pull | :static | nil,
          optional(:images) => [String.t()],
          optional(:media_id) => String.t() | nil,
          optional(:muscle_ids) => [String.t()],
          optional(:equipment_ids) => [String.t()]
        }

  @type copy :: %{required(:name) => String.t()}

  @type list_query :: %{
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t(),
          optional(:muscle_ids) => [String.t()],
          optional(:equipment_ids) => [String.t()]
        }

  @type cursor_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:muscle_ids) => [String.t()],
          optional(:equipment_ids) => [String.t()]
        }

  @spec format(TrainingExercise.t()) :: t()
  def format(%TrainingExercise{} = exercise) do
    %{
      id: exercise.id,
      source: format_enum(exercise.source),
      tracking_type: format_enum(exercise.tracking_type),
      name: exercise.name,
      description: exercise.description,
      instructions: exercise.instructions,
      mechanics: exercise.mechanics,
      force: exercise.force,
      images: exercise.images || [],
      media: format_media(exercise.media),
      muscles: Enum.map(exercise.muscles, &format_relation/1),
      equipment: Enum.map(exercise.equipment, &format_relation/1),
      inserted_at: exercise.inserted_at,
      updated_at: exercise.updated_at
    }
  end

  defp format_media(nil), do: nil
  defp format_media(%Media{} = media), do: LibraryMedia.public_representation(media)

  defp format_relation(%{id: id, name: name, description: description}) do
    %{id: id, name: name, description: description}
  end

  defp format_enum(nil), do: nil
  defp format_enum(value) when is_atom(value), do: Atom.to_string(value)
  defp format_enum(value) when is_binary(value), do: value
end

defmodule EasyWeb.Types.Training.ExerciseIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Training.Exercise.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

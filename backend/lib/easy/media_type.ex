defmodule Easy.MediaType do
  @extensions %{
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp",
    "image/heic" => "heic",
    "video/mp4" => "mp4",
    "video/webm" => "webm",
    "video/quicktime" => "mov",
    "audio/webm" => "webm",
    "audio/mp4" => "m4a",
    "audio/mpeg" => "mp3"
  }

  @spec extension(String.t() | nil) :: String.t()
  def extension(content_type), do: Map.get(@extensions, content_type, "bin")
end

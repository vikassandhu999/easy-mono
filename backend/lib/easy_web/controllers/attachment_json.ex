defmodule EasyWeb.AttachmentJSON do
  alias Easy.Attachments.Attachment

  @spec data(Attachment.t()) :: map()
  def data(%Attachment{} = attachment) do
    %{
      id: attachment.id,
      content_type: attachment.content_type,
      byte_size: attachment.byte_size,
      duration_ms: attachment.duration_ms
    }
  end
end

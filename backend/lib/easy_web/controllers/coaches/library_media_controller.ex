defmodule EasyWeb.Coaches.LibraryMediaController do
  use EasyWeb, :typed_controller

  alias Easy.LibraryMedia, as: LibraryMediaContext
  alias EasyWeb.Types.LibraryMedia

  typed(:create, body: LibraryMedia.create(), ok: {201, data(LibraryMedia.t())})

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, upload} <- LibraryMediaContext.create_upload(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: upload})
    end
  end
end

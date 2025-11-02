defmodule Easy.Tenant.Business do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "businesses" do
    field :handle, :string
    field :name, :string
    field :about, :string, default: ""
    field :logo_url, :string
    field :owner_user_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  @disallowed_handles ~w(
    www admin administrator blog dashboard admindashboard assets assets1
    assets2 assets3 assets4 assets5 images img files videos help support
    cname test cache api api1 api2 api3 js css static mail ftp webmail
    webdisk ns ns1 ns2 ns3 ns4 ns5 register pop pop3 beta stage http
    https donate store payment payments smtp ad admanager ads adsense
    adwords about abuse affiliate affiliates shop client clients code
    community buy cpanel whm dev developer developers docs email whois
    signup ios gettingstarted home invoice invoices ipad iphone log logs
    my status network networks new newsite news partner partners partnerpage
    popular wiki redirect random public registration resolver rss sandbox
    search server servers service signin sitemap sitenews sites sms sorry
    ssl staging development stats statistics graph graphs survey surveys
    talk trac git svn translate upload uploads video validation validations
    webmaster ww wwww www1 www2 feeds secure demo i img1 img2 img3 css1
    css2 css3 js1 js2 billing calendar forum imap login manage mx pages
    press kb knowledgebase v1 v2 v3 v4 v5 v6 v7 v8 v9 v10
  )

  @doc false
  def changeset(business, attrs) do
    business
    |> cast(attrs, [:handle, :name, :about, :logo_url, :owner_user_id])
    |> validate_required([:handle, :name, :owner_user_id])
    |> validate_format(:handle, ~r/^[a-z0-9_]+$/,
      message: "handle should only contain lowercase letters, numbers, and underscores"
    )
    |> validate_exclusion(:handle, @disallowed_handles,
      message: "handle is not allowed, please try a different handle"
    )
    |> unique_constraint(:handle,
      name: :u_idx_handle,
      message: "handle is already taken, please try a different handle"
    )
  end

  @doc """
  Returns the list of disallowed handles.
  """
  def disallowed_handles, do: @disallowed_handles
end

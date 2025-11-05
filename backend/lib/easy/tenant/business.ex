defmodule Easy.Tenant.Business do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Identity.User
  alias Easy.Tenant.{Coach, Client}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "businesses" do
    # Core identity
    field :handle, :string
    field :name, :string
    field :about, :string
    field :logo_url, :string

    # Status
    field :status, Ecto.Enum,
      values: [:early, :trial, :active, :suspended, :cancelled],
      default: :early

    # Contact Info
    field :email, :string
    field :phone, :string
    field :website, :string

    # Address
    field :address_line1, :string
    field :address_line2, :string
    field :city, :string
    field :state, :string
    field :postal_code, :string
    field :country, :string, default: "IND"

    # Settings
    field :timezone, :string, default: "Asia/Kolkata"
    field :settings, :map, default: %{}

    # Onboarding (implement later)
    field :onboarded_at, :utc_datetime
    field :onboarding_step, :string

    # Relationships
    belongs_to :owner, User, foreign_key: :owner_user_id
    has_many :coaches, Coach
    has_many :clients, Client

    timestamps(type: :utc_datetime)
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

  @doc """
  Changeset for creating/updating a business.
  """
  def changeset(business, attrs) do
    business
    |> cast(attrs, [
      :handle,
      :name,
      :about,
      :logo_url,
      :owner_user_id,
      :status,
      :email,
      :phone,
      :website,
      :address_line1,
      :address_line2,
      :city,
      :state,
      :postal_code,
      :country,
      :timezone,
      :settings,
      :onboarded_at,
      :onboarding_step
    ])
    |> validate_required([:handle, :name, :owner_user_id])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_length(:handle, min: 3, max: 50)
    |> validate_handle()
    |> validate_email()
    |> foreign_key_constraint(:owner_user_id)
    |> unique_constraint(:handle)
  end

  defp validate_handle(changeset) do
    changeset
    |> validate_format(:handle, ~r/^[a-z0-9_]+$/,
      message: "must contain only lowercase letters, numbers, and underscores"
    )
    |> validate_exclusion(:handle, @disallowed_handles,
      message: "is reserved, please choose another"
    )
  end

  defp validate_email(changeset) do
    case get_field(changeset, :email) do
      nil ->
        changeset

      _email ->
        validate_format(changeset, :email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    end
  end

  @doc """
  Returns the list of disallowed handles.
  """
  def disallowed_handles, do: @disallowed_handles

  @doc """
  Checks if business has full access.
  """
  def has_full_access?(%__MODULE__{status: status}) do
    status in [:early, :active]
  end

  @doc """
  Checks if business is an early access member.
  """
  def early_member?(%__MODULE__{status: :early}), do: true

  def early_member?(%__MODULE__{settings: settings}) do
    get_in(settings, ["early_member"]) == true
  end
end

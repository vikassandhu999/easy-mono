defmodule EasyWeb.Coaches.BusinessJSON do
  alias Easy.Organizations.{Business, Subscription, Coach}

  def show(%{business: business}) do
    %{
      data: business_with_subscription(business)
    }
  end

  def subscription(%{subscription: subscription}) do
    %{
      data: subscription_details(subscription)
    }
  end

  def coaches(%{coaches: coaches}) do
    %{
      data: Enum.map(coaches, &coach_summary/1)
    }
  end

  defp business_with_subscription(%Business{} = business) do
    %{
      id: business.id,
      name: business.name,
      handle: business.handle,
      description: business.description,
      status: business.status,
      # Contact fields
      email: business.email,
      phone: business.phone,
      website: business.website,
      # Address fields
      address: business.address,
      city: business.city,
      state: business.state,
      country: business.country,
      postal_code: business.postal_code,
      # Branding & settings
      logo_url: business.logo_url,
      timezone: business.timezone,
      subscription: subscription_summary(business.subscription),
      inserted_at: business.inserted_at,
      updated_at: business.updated_at
    }
  end

  defp subscription_summary(nil), do: nil

  defp subscription_summary(%Subscription{} = sub) do
    %{
      id: sub.id,
      status: sub.status,
      plan: %{
        name: sub.plan.name,
        slug: sub.plan.slug
      }
    }
  end

  defp subscription_details(%Subscription{} = sub) do
    base = %{
      id: sub.id,
      status: sub.status,
      started_at: sub.started_at,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancelled_at: sub.cancelled_at,
      plan: plan_details(sub.plan)
    }

    # Add trial info if present
    if sub.trial_start do
      Map.merge(base, %{
        trial: %{
          start: sub.trial_start,
          end: sub.trial_end,
          used: sub.trial_used,
          expired: Subscription.trial_expired?(sub),
          is_trial: Subscription.is_trial?(sub)
        }
      })
    else
      base
    end
  end

  defp plan_details(plan) do
    %{
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price_cents: plan.price_cents,
      billing_interval: plan.billing_interval,
      features: plan.features,
      limits: plan.limits
    }
  end

  defp coach_summary(%Coach{} = coach) do
    %{
      id: coach.id,
      bio: coach.bio,
      specialties: coach.specialties,
      credentials: coach.credentials,
      status: coach.status,
      user: %{
        id: coach.user.id,
        full_name: Easy.Accounts.User.full_name(coach.user),
        email: coach.user.email
      }
    }
  end
end

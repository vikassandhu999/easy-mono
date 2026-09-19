export const apiOrigin = process.env.CLIENT_API_URL || 'http://localhost:4100';

export async function api(path, {method = 'GET', body, token} = {}) {
  const response = await fetch(apiOrigin + path, {
    method,
    headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export async function inviteClient({firstName = 'Alex'} = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const coachEmail = `coach-${suffix}@example.test`;
  const email = `client-${suffix}@example.test`;
  await api('/v1/auth/signup', {method: 'POST', body: {email: coachEmail, first_name: 'Test', last_name: 'Coach'}});
  const guest = await api('/v1/auth/verify', {method: 'POST', body: {email: coachEmail, otp: '123456'}});
  await api('/v1/businesses', {
    method: 'POST',
    token: guest.access_token,
    body: {name: 'Everyday Coaching', handle: `mobile-${suffix}`},
  });
  const coach = await api('/v1/auth/token', {
    method: 'POST',
    body: {grant_type: 'refresh_token', refresh_token: guest.refresh_token, role: 'coach'},
  });
  const invitation = await api('/v1/coach/clients/invite', {
    method: 'POST',
    token: coach.access_token,
    body: {email, first_name: firstName, last_name: 'Client'},
  });
  const token = new URL(invitation.data.invite_url).pathname.split('/invite/')[1];
  if (!token) {
    throw new Error('Invitation URL did not include a token');
  }
  return {email, token, clientId: invitation.data.id};
}

import {writeFile} from 'node:fs/promises';
import {api, inviteClient} from './fixtures.mjs';

const fixture = await inviteClient({fullName: 'Client'});
// Each native scenario accepts its own single-use invitation.
const mealClient = await inviteClient();
fixture.mealToken = mealClient.token;
fixture.messageToken = (await inviteClient()).token;
fixture.workoutToken = (await inviteClient()).token;
await api('/v1/coach/nutrition-foods', {
  method: 'POST',
  token: mealClient.coachToken,
  body: {name: 'iPhone rice', calories_per_100g: 130},
});
fixture.nutritionDate = (
  await api(`/v1/coach/clients/${mealClient.clientId}/nutrition-days`, {token: mealClient.coachToken})
).data[0].date;
const migrationClient = await inviteClient();
fixture.migrationToken = migrationClient.token;
fixture.migrationEmail = migrationClient.email;
await writeFile(new URL('../../ios/App/ClientUITests/fixture.json', import.meta.url), JSON.stringify(fixture));
console.log('Created an isolated native invitation fixture.');

import {writeFile} from 'node:fs/promises';
import {api, inviteClient} from './fixtures.mjs';

const fixture = await inviteClient({firstName: ''});
await api('/v1/coach/nutrition-foods', {
  method: 'POST',
  token: fixture.coachToken,
  body: {name: 'iPhone rice', calories_per_100g: 130},
});
fixture.nutritionDate = (
  await api(`/v1/coach/clients/${fixture.clientId}/nutrition-days`, {token: fixture.coachToken})
).data[0].date;
const formClient = await inviteClient();
const assignment = (await api(`/v1/coach/clients/${formClient.clientId}/intake`, {token: formClient.coachToken})).data;
await api(`/v1/coach/form-templates/${assignment.form_template_id}`, {
  method: 'PATCH',
  token: formClient.coachToken,
  body: {
    name: 'Native check-in',
    expected_revision: assignment.form_template.revision,
    sections: [
      {
        questions: [
          {id: 'goal', label: 'Your goal', type: 'text', required: true},
          {id: 'photos', label: 'Progress views', type: 'photo'},
        ],
      },
    ],
  },
});
fixture.formToken = formClient.token;
fixture.formEmail = formClient.email;
fixture.assignmentId = assignment.id;
fixture.apiControlURL = process.env.CLIENTAPP_API_CONTROL || null;
const photoClient = await inviteClient();
const photoAssignment = (await api(`/v1/coach/clients/${photoClient.clientId}/intake`, {token: photoClient.coachToken}))
  .data;
await api(`/v1/coach/form-templates/${photoAssignment.form_template_id}`, {
  method: 'PATCH',
  token: photoClient.coachToken,
  body: {
    name: 'Native progress photos',
    expected_revision: photoAssignment.form_template.revision,
    sections: [{questions: [{id: 'photos', label: 'Progress views', type: 'photo', required: true}]}],
  },
});
fixture.photoAccess = process.env.CLIENTAPP_PHOTO_ACCESS || 'full';
fixture.photoSource = process.env.CLIENTAPP_PHOTO_SOURCE || 'gallery';
fixture.photoToken = photoClient.token;
fixture.photoAssignmentId = photoAssignment.id;
await writeFile(new URL('../../ios/App/ClientUITests/fixture.json', import.meta.url), JSON.stringify(fixture));
console.log('Created an isolated native invitation fixture.');

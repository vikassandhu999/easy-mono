import {writeFile} from 'node:fs/promises';
import {api, inviteClient} from './fixtures.mjs';

const fixture = await inviteClient({firstName: ''});
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
await writeFile(new URL('../../ios/App/ClientUITests/fixture.json', import.meta.url), JSON.stringify(fixture));
console.log('Created an isolated native invitation fixture.');

import {writeFile} from 'node:fs/promises';
import {inviteClient} from './fixtures.mjs';

const fixture = await inviteClient({fullName: 'Client'});
// Each native scenario accepts its own single-use invitation.
fixture.messageToken = (await inviteClient()).token;
const migrationClient = await inviteClient();
fixture.migrationToken = migrationClient.token;
fixture.migrationEmail = migrationClient.email;
await writeFile(new URL('../../ios/App/ClientUITests/fixture.json', import.meta.url), JSON.stringify(fixture));
console.log('Created an isolated native invitation fixture.');

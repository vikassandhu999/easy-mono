import {writeFile} from 'node:fs/promises';
import {inviteClient} from './fixtures.mjs';

const fixture = await inviteClient({firstName: ''});
await writeFile(new URL('../../ios/App/ClientUITests/fixture.json', import.meta.url), JSON.stringify(fixture));
console.log('Created an isolated native invitation fixture.');

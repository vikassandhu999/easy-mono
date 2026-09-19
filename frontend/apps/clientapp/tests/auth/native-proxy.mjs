import {createServer, request} from 'node:http';

// A local fault boundary for XCTest. Successful requests reach the real Phoenix API.
let unavailableUntil = 0;
createServer((incoming, outgoing) => {
  const url = new URL(incoming.url, 'http://localhost:4101');
  if (url.pathname === '/__test/connection' && incoming.method === 'POST') {
    unavailableUntil = url.searchParams.get('available') === 'false' ? Date.now() + 30_000 : 0;
    outgoing.writeHead(200).end();
    return;
  }
  if (Date.now() < unavailableUntil) {
    outgoing.writeHead(503, {'content-type': 'application/json', 'access-control-allow-origin': '*'});
    outgoing.end(JSON.stringify({error_message: 'Connection interrupted by the native test fixture'}));
    return;
  }
  const upstream = request(
    {
      hostname: 'localhost',
      port: 4100,
      path: incoming.url,
      method: incoming.method,
      headers: {...incoming.headers, host: 'localhost:4100'},
    },
    (response) => {
      outgoing.writeHead(response.statusCode, response.headers);
      response.pipe(outgoing);
    },
  );
  upstream.on('error', () => {
    outgoing.writeHead(503).end();
  });
  incoming.pipe(upstream);
}).listen(4101, '127.0.0.1', () => console.log('Native test API proxy listening on 4101'));

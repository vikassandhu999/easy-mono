import {createServer} from 'node:http';

export async function startProvider() {
  const subscriptions = new Map();
  const runId = Date.now().toString(36);
  const calls = [];
  const state = {fail: null};
  const server = createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString();
    const body = input ? JSON.parse(input) : {};
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/');
    const id = parts[3];
    const send = (status, data) => {
      res.writeHead(status, {'content-type': 'application/json'});
      res.end(JSON.stringify(data));
    };
    if (parts[1] === '__test') {
      const subscription = subscriptions.get(parts[2]);
      if (!subscription) {
        send(404, {});
        return;
      }
      subscription.status = parts[3];
      send(200, subscription);
      return;
    }
    calls.push({method: req.method, path: url.pathname, body});
    if (state.fail === 'before') {
      send(503, {error: 'test provider unavailable'});
      return;
    }
    let result;
    if (req.method === 'POST' && url.pathname === '/v1/subscriptions') {
      const created = `sub_browser_${runId}_${subscriptions.size + 1}`;
      result = {
        id: created,
        plan_id: body.plan_id,
        quantity: body.quantity,
        status: 'created',
        notes: body.notes || {},
        current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      };
      subscriptions.set(created, result);
    } else if (req.method === 'GET' && url.pathname === '/v1/subscriptions') {
      result = {entity: 'collection', count: subscriptions.size, items: [...subscriptions.values()]};
    } else {
      result = subscriptions.get(id);
      if (!result) {
        send(404, {error: 'unknown subscription'});
        return;
      }
      if (req.method === 'PATCH') {
        result.quantity = body.quantity;
      }
      if (req.method === 'POST' && parts[4] === 'cancel') {
        result.cancel_at_cycle_end = true;
      }
    }
    if (state.fail === 'after') {
      req.socket.destroy();
      return;
    }
    send(200, result);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(44002, '127.0.0.1', resolve);
  });
  return {subscriptions, calls, state, close: () => new Promise((resolve) => server.close(resolve))};
}

export const checkoutScript = `
window.Razorpay = class {
  constructor(options) {this.options = options;}
  open() {
    window.testCheckout = this;
    this.dialog = document.createElement('dialog');
    this.dialog.setAttribute('aria-label', 'Test payment');
    this.dialog.innerHTML = '<p>Isolated test checkout</p><button data-kind="paid">Complete test payment</button><button data-kind="unpaid">Report success without payment</button><button data-kind="close">Close test payment</button>';
    this.dialog.addEventListener('click', async event => {
      const kind = event.target.dataset.kind;
      if (!kind) return;
      if (kind === 'close') {this.close(); this.options.modal.ondismiss(); return;}
      if (kind === 'paid') await fetch('http://127.0.0.1:44002/__test/' + this.options.subscription_id + '/active', {method: 'POST'});
      this.close(); this.options.handler();
    });
    document.body.append(this.dialog); this.dialog.showModal();
  }
  close() {this.dialog?.remove();}
};`;

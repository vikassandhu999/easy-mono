var h = Object.defineProperty;
var a = (o, e, s) => e in o ? h(o, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : o[e] = s;
var t = (o, e, s) => a(o, typeof e != "symbol" ? e + "" : e, s);
const c = "web_authentication_challenge";
let r = null;
typeof MozWebSocket < "u" ? r = MozWebSocket : typeof WebSocket < "u" && (r = WebSocket);
function f(o) {
  r = o;
}
class C {
  constructor() {
    t(this, "conn");
    t(this, "connectionUrl");
    t(this, "token");
    t(this, "responseSequence");
    t(this, "connectFailCount");
    t(this, "responseCallbacks");
    t(this, "messageListeners", /* @__PURE__ */ new Set());
    t(this, "firstConnectListeners", /* @__PURE__ */ new Set());
    t(this, "reconnectListeners", /* @__PURE__ */ new Set());
    t(this, "errorListeners", /* @__PURE__ */ new Set());
    t(this, "closeListeners", /* @__PURE__ */ new Set());
    this.conn = null, this.connectionUrl = null, this.token = null, this.responseSequence = 1, this.connectFailCount = 0, this.responseCallbacks = {};
  }
  initialize(e = this.connectionUrl, s = this.token) {
    if (!this.conn) {
      if (e == null) {
        console.log("websocket must have connection url");
        return;
      }
      this.connectFailCount === 0 && console.log("websocket connecting to " + e), this.conn = new r(e), this.connectionUrl = e, this.token = s, this.conn.onopen = () => {
        s && this.sendMessage(c, s), this.connectFailCount > 0 ? (console.log("websocket re-established connection"), this.reconnectListeners.forEach((n) => n())) : this.firstConnectListeners.size > 0 && this.firstConnectListeners.forEach((n) => n()), this.connectFailCount = 0;
      }, this.conn.onclose = (n) => {
        console.log("Close event", n), this.conn = null, this.responseSequence = 1, this.connectFailCount === 0 && console.log("websocket closed"), this.connectFailCount++, this.closeListeners.forEach((l) => l(this.connectFailCount));
        let i = 3e3;
        this.connectFailCount > 7 && (i = 3e3 * this.connectFailCount * this.connectFailCount, i > 3e5 && (i = 3e5)), i += Math.random() * 2e3, setTimeout(() => {
          this.initialize(e, s);
        }, i);
      }, this.conn.onerror = (n) => {
        this.connectFailCount <= 1 && (console.log("websocket error"), console.log(n)), this.errorListeners.forEach((i) => i(n));
      }, this.conn.onmessage = (n) => {
        this.handleIncomingFrame(n);
      };
    }
  }
  handleIncomingFrame(e) {
    if (this.conn === null)
      return;
    const s = JSON.parse(e.data);
    if (s.seq_reply) {
      if (s.error && console.log(s), Reflect.has(this.responseCallbacks, s.seq_reply)) {
        const n = this.responseCallbacks[s.seq_reply];
        if (n === !1) return;
        n(s), Reflect.deleteProperty(this.responseCallbacks, s.seq_reply);
      }
    } else if (this.messageListeners.size > 0) {
      if (s.event === c)
        return;
      this.messageListeners.forEach((n) => n(s));
    }
  }
  addMessageListener(e) {
    this.messageListeners.add(e), this.messageListeners.size > 5 && console.warn(
      `WebSocketClient has ${this.messageListeners.size} message listeners registered`
    );
  }
  removeMessageListener(e) {
    this.messageListeners.delete(e);
  }
  addFirstConnectListener(e) {
    this.firstConnectListeners.add(e), this.firstConnectListeners.size > 5 && console.warn(
      `WebSocketClient has ${this.firstConnectListeners.size} first connect listeners registered`
    );
  }
  removeFirstConnectListener(e) {
    this.firstConnectListeners.delete(e);
  }
  addReconnectListener(e) {
    this.reconnectListeners.add(e), this.reconnectListeners.size > 5 && console.warn(
      `WebSocketClient has ${this.reconnectListeners.size} reconnect listeners registered`
    );
  }
  removeReconnectListener(e) {
    this.reconnectListeners.delete(e);
  }
  addErrorListener(e) {
    this.errorListeners.add(e), this.errorListeners.size > 5 && console.warn(`WebSocketClient has ${this.errorListeners.size} error listeners registered`);
  }
  removeErrorListener(e) {
    this.errorListeners.delete(e);
  }
  addCloseListener(e) {
    this.closeListeners.add(e), this.closeListeners.size > 5 && console.warn(`WebSocketClient has ${this.closeListeners.size} close listeners registered`);
  }
  removeCloseListener(e) {
    this.closeListeners.delete(e);
  }
  close() {
    this.connectFailCount = 0, this.responseSequence = 1, this.shutdown_(), console.log("websocket closed");
  }
  sendMessage(e, s, n) {
    const i = {
      action: e,
      seq: this.responseSequence++,
      data: s
    };
    typeof n < "u" && (this.responseCallbacks[i.seq] = n), this.sendString_(JSON.stringify(i));
  }
  shutdown_() {
    this.conn && (this.conn.close(), this.conn = null);
  }
  sendString_(e) {
    try {
      this.conn.send(e);
    } catch (s) {
      console.log(
        "Exception thrown from WebSocket.send():",
        s.message || s.data,
        "Closing connection."
      ), this.close();
    }
  }
}
export {
  C as WebSocketClient,
  f as setWebSocketImpl
};

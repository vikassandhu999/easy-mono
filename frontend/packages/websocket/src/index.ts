const MAX_WEBSOCKET_FAILS = 7;
const MIN_WEBSOCKET_RETRY_TIME = 3000; // 3 sec
const MAX_WEBSOCKET_RETRY_TIME = 300000; // 5 mins
const JITTER_RANGE = 2000; // 2 sec

const AUTHENTICATION_CHALLENGE = 'web_authentication_challenge';

export type WebSocketMessage<T = unknown> = {
    event: string;
    data: T;
};

export type MessageListener = (msg: WebSocketMessage) => void;
export type FirstConnectListener = () => void;
export type ReconnectListener = () => void;
export type MissedMessageListener = () => void;
export type ErrorListener = (event: Event) => void;
export type CloseListener = (connectFailCount: number) => void;
export type AuthToken = {token: string; user_type: string};

export interface SocketImpl {
    new (url: string | URL, protocols?: string | string[]): WebSocket;
}

declare const MozWebSocket: SocketImpl;

let WebSocketImpl: SocketImpl = null;
if (typeof MozWebSocket !== 'undefined') {
    WebSocketImpl = MozWebSocket;
} else if (typeof WebSocket !== 'undefined') {
    WebSocketImpl = WebSocket;
}

export function setWebSocketImpl(impl: SocketImpl) {
    WebSocketImpl = impl;
}

export class WebSocketClient {
    private conn: WebSocket | null;
    private connectionUrl: string | null;
    private token: AuthToken | null;
    private responseSequence: number;

    private connectFailCount: number;
    private responseCallbacks: {[x: number]: ((msg: WebSocketMessage) => void) | false};

    private messageListeners = new Set<MessageListener>();
    private firstConnectListeners = new Set<FirstConnectListener>();
    private reconnectListeners = new Set<ReconnectListener>();
    private errorListeners = new Set<ErrorListener>();
    private closeListeners = new Set<CloseListener>();

    constructor() {
        this.conn = null;
        this.connectionUrl = null;
        this.token = null;
        this.responseSequence = 1;
        this.connectFailCount = 0;
        this.responseCallbacks = {};
    }

    initialize(connectionUrl = this.connectionUrl, token = this.token) {
        if (this.conn) {
            return;
        }

        if (connectionUrl == null) {
            console.log('websocket must have connection url'); // eslint-disable-line no-console
            return;
        }

        if (this.connectFailCount === 0) {
            console.log('websocket connecting to ' + connectionUrl); // eslint-disable-line no-console
        }

        this.conn = new WebSocketImpl(connectionUrl);
        this.connectionUrl = connectionUrl;
        this.token = token;

        this.conn.onopen = () => {
            if (token) {
                this.sendMessage(AUTHENTICATION_CHALLENGE, token);
            }

            if (this.connectFailCount > 0) {
                console.log('websocket re-established connection'); // eslint-disable-line no-console

                this.reconnectListeners.forEach((listener) => listener());
            } else if (this.firstConnectListeners.size > 0) {
                this.firstConnectListeners.forEach((listener) => listener());
            }

            this.connectFailCount = 0;
        };

        this.conn.onclose = (e) => {
            console.log('Close event', e);
            this.conn = null;
            this.responseSequence = 1;

            if (this.connectFailCount === 0) {
                console.log('websocket closed'); // eslint-disable-line no-console
            }

            this.connectFailCount++;

            this.closeListeners.forEach((listener) => listener(this.connectFailCount));

            let retryTime = MIN_WEBSOCKET_RETRY_TIME;

            // If we've failed a bunch of connections then start backing off
            if (this.connectFailCount > MAX_WEBSOCKET_FAILS) {
                retryTime = MIN_WEBSOCKET_RETRY_TIME * this.connectFailCount * this.connectFailCount;
                if (retryTime > MAX_WEBSOCKET_RETRY_TIME) {
                    retryTime = MAX_WEBSOCKET_RETRY_TIME;
                }
            }

            // Applying jitter to avoid thundering herd problems.
            retryTime += Math.random() * JITTER_RANGE;

            setTimeout(() => {
                this.initialize(connectionUrl, token);
            }, retryTime);
        };

        this.conn.onerror = (evt) => {
            if (this.connectFailCount <= 1) {
                console.log('websocket error'); // eslint-disable-line no-console
                console.log(evt); // eslint-disable-line no-console
            }

            this.errorListeners.forEach((listener) => listener(evt));
        };

        this.conn.onmessage = (m) => {
            this.handleIncomingFrame(m as unknown as {[k: string]: unknown});
        };
    }

    handleIncomingFrame(mess: {[k: string]: unknown}) {
        if (this.conn === null) {
            return; // Chrome apparently delivers incoming packets even after we .close() the connection sometimes.
        }
        const msg = JSON.parse(mess.data as string);
        if (msg.seq_reply) {
            if (msg.error) {
                console.log(msg); // eslint-disable-line no-console
            }

            if (Reflect.has(this.responseCallbacks, msg.seq_reply)) {
                const callback = this.responseCallbacks[msg.seq_reply];
                if (callback === false) return;
                callback(msg);
                Reflect.deleteProperty(this.responseCallbacks, msg.seq_reply);
            }
        } else if (this.messageListeners.size > 0) {
            if (msg.event === AUTHENTICATION_CHALLENGE) {
                return;
            }
            this.messageListeners.forEach((listener) => listener(msg));
        }
    }

    addMessageListener(listener: MessageListener) {
        this.messageListeners.add(listener);

        if (this.messageListeners.size > 5) {
            // eslint-disable-next-line no-console
            console.warn(`WebSocketClient has ${this.messageListeners.size} message listeners registered`);
        }
    }

    removeMessageListener(listener: MessageListener) {
        this.messageListeners.delete(listener);
    }

    addFirstConnectListener(listener: FirstConnectListener) {
        this.firstConnectListeners.add(listener);

        if (this.firstConnectListeners.size > 5) {
            // eslint-disable-next-line no-console
            console.warn(`WebSocketClient has ${this.firstConnectListeners.size} first connect listeners registered`);
        }
    }

    removeFirstConnectListener(listener: FirstConnectListener) {
        this.firstConnectListeners.delete(listener);
    }

    addReconnectListener(listener: ReconnectListener) {
        this.reconnectListeners.add(listener);

        if (this.reconnectListeners.size > 5) {
            // eslint-disable-next-line no-console
            console.warn(`WebSocketClient has ${this.reconnectListeners.size} reconnect listeners registered`);
        }
    }

    removeReconnectListener(listener: ReconnectListener) {
        this.reconnectListeners.delete(listener);
    }

    addErrorListener(listener: ErrorListener) {
        this.errorListeners.add(listener);

        if (this.errorListeners.size > 5) {
            // eslint-disable-next-line no-console
            console.warn(`WebSocketClient has ${this.errorListeners.size} error listeners registered`);
        }
    }

    removeErrorListener(listener: ErrorListener) {
        this.errorListeners.delete(listener);
    }

    addCloseListener(listener: CloseListener) {
        this.closeListeners.add(listener);

        if (this.closeListeners.size > 5) {
            // eslint-disable-next-line no-console
            console.warn(`WebSocketClient has ${this.closeListeners.size} close listeners registered`);
        }
    }

    removeCloseListener(listener: CloseListener) {
        this.closeListeners.delete(listener);
    }

    close() {
        this.connectFailCount = 0;
        this.responseSequence = 1;
        this.shutdown_();
        console.log('websocket closed'); // eslint-disable-line no-console
    }

    sendMessage(action: string, data: unknown, responseCallback?: ((msg: unknown) => void) | false) {
        const msg = {
            action,
            seq: this.responseSequence++,
            data,
        };

        if (typeof responseCallback !== 'undefined') {
            this.responseCallbacks[msg.seq] = responseCallback;
        }

        this.sendString_(JSON.stringify(msg));
    }

    private shutdown_() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
    }

    private sendString_(str: string) {
        try {
            this.conn.send(str);
        } catch (e) {
            console.log('Exception thrown from WebSocket.send():', e.message || e.data, 'Closing connection.');
            this.close();
        }
    }
}

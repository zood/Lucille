/// <reference path="pubsub.ts" />

namespace oscar {
    export const DROP_BOX_ID_LENGTH = 16;
    export const USER_ID_LENGTH = 16;

    export const PackageDropEventName = "oscar.package-drop-event";

    export interface Package {
        boxId: Uint8Array;
        msg: Uint8Array;
    }

    function onPackageWatcherMessage(pw: PackageWatcher, evt: MessageEvent) {
        // console.log("PackageWatcher.onMessage", evt.data);
        let binMsg = new Uint8Array(evt.data);

        // quick sanity check
        // message is command (1 byte) + box id + msg (at least 2 bytes)
        let minLength = 1 + DROP_BOX_ID_LENGTH + 1;
        if (binMsg.length <= minLength) {
            console.log("PackageWatcher.onMessage received an invalid message from the server. length was only ", binMsg.length);
            return;
        }

        // check for the opening byte
        if (binMsg[0] != 1) {
            console.log("PackageWatcher received incorrect opening byte:", binMsg[0]);
            return;
        }

        let boxId = new Uint8Array(new ArrayBuffer(DROP_BOX_ID_LENGTH));
        for (let i = 0; i < DROP_BOX_ID_LENGTH; i++) {
            boxId[i] = binMsg[i + 1];
        }

        let msg = new Uint8Array(new ArrayBuffer(binMsg.length - 1 - DROP_BOX_ID_LENGTH));
        let offset = 1 + DROP_BOX_ID_LENGTH;
        for (let i = offset; i < binMsg.length; i++) {
            msg[i - offset] = binMsg[i];
        }

        let pkg = { boxId: boxId, msg: msg };
        pubsub.Pub(PackageDropEventName, pkg);
    }

    function onPackageWatcherError(pw: PackageWatcher, evt: ErrorEvent) {
        console.log("PackageWatcher.onError", evt);
    }

    function onPackageWatcherClose(pw: PackageWatcher, evt: CloseEvent) {
        console.log("PackageWatcher.onClose", evt);
    }

    export class PackageWatcher {
        socket: WebSocket;

        watch(boxId: Uint8Array): void {
            let buf = new Uint8Array(new ArrayBuffer(boxId.length + 1));
            buf[0] = 1;
            for (let i = 1; i <= boxId.length; i++) {
                buf[i] = boxId[i - 1];
            }
            this.socket.send(buf);
        }
    }

    export function createPackageWatcher(address: string): Promise<PackageWatcher> {
        return new Promise<PackageWatcher>((resolve, reject) => {
            let pw = new PackageWatcher();
            pw.socket = new WebSocket(address + "/alpha/drop-boxes/watch");
            pw.socket.binaryType = "arraybuffer";
            pw.socket.onopen = function (evt: Event) {
                pw.socket.onerror = function (this: WebSocket, evt: ErrorEvent) {
                    onPackageWatcherError(pw, evt);
                };
                resolve(pw);
            };
            pw.socket.onerror = function (evt: ErrorEvent) {
                reject(evt);
            };
            pw.socket.onmessage = function (this: WebSocket, evt: MessageEvent) {
                onPackageWatcherMessage(pw, evt);
            };
            pw.socket.onclose = function (this: WebSocket, evt: CloseEvent) {
                onPackageWatcherClose(pw, evt);
            };
        });
    }

    export class Client {
        address: string;

        constructor(addr: string) {
            this.address = addr;
        }

        retrievePublicKey(userId: Uint8Array): Promise<Uint8Array> {
            return new Promise<Uint8Array>((resolve, reject) => {
                var req = new XMLHttpRequest();
                req.addEventListener("load", function () {
                    if (req.status == 200) {
                        let pkMsg = JSON.parse(req.response as string) as PublicKeyResponse;
                        let buf = sodium.from_base64(pkMsg.public_key, sodium.base64_variants.ORIGINAL);
                        resolve(buf);
                    } else {
                        reject(new Error("invalid status code: " + req.status));
                    }
                });
                req.addEventListener("error", function (err: ErrorEvent) {
                    console.log("error loading public key: ", err);
                    reject(err);
                });
                req.open("GET", this.address + "/alpha/users/" + sodium.to_hex(userId) + "/public-key");
                req.send();
            });
        }
    }
}

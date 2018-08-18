/// <reference path="pubsub.ts" />
var oscar;
(function (oscar) {
    oscar.DROP_BOX_ID_LENGTH = 16;
    oscar.USER_ID_LENGTH = 16;
    oscar.PackageDropEventName = "oscar.package-drop-event";
    function onPackageWatcherMessage(pw, evt) {
        // console.log("PackageWatcher.onMessage", evt.data);
        let binMsg = new Uint8Array(evt.data);
        // quick sanity check
        // message is command (1 byte) + box id + msg (at least 2 bytes)
        let minLength = 1 + oscar.DROP_BOX_ID_LENGTH + 1;
        if (binMsg.length <= minLength) {
            console.log("PackageWatcher.onMessage received an invalid message from the server. length was only ", binMsg.length);
            return;
        }
        // check for the opening byte
        if (binMsg[0] != 1) {
            console.log("PackageWatcher received incorrect opening byte:", binMsg[0]);
            return;
        }
        let boxId = new Uint8Array(new ArrayBuffer(oscar.DROP_BOX_ID_LENGTH));
        for (let i = 0; i < oscar.DROP_BOX_ID_LENGTH; i++) {
            boxId[i] = binMsg[i + 1];
        }
        let msg = new Uint8Array(new ArrayBuffer(binMsg.length - 1 - oscar.DROP_BOX_ID_LENGTH));
        let offset = 1 + oscar.DROP_BOX_ID_LENGTH;
        for (let i = offset; i < binMsg.length; i++) {
            msg[i - offset] = binMsg[i];
        }
        let pkg = { boxId: boxId, msg: msg };
        pubsub.Pub(oscar.PackageDropEventName, pkg);
    }
    function onPackageWatcherError(pw, evt) {
        console.log("PackageWatcher.onError", evt);
    }
    function onPackageWatcherClose(pw, evt) {
        console.log("PackageWatcher.onClose", evt);
    }
    class PackageWatcher {
        watch(boxId) {
            let buf = new Uint8Array(new ArrayBuffer(boxId.length + 1));
            buf[0] = 1;
            for (let i = 1; i <= boxId.length; i++) {
                buf[i] = boxId[i - 1];
            }
            this.socket.send(buf);
        }
    }
    oscar.PackageWatcher = PackageWatcher;
    function createPackageWatcher(address) {
        return new Promise((resolve, reject) => {
            let pw = new PackageWatcher();
            pw.socket = new WebSocket(address + "/alpha/drop-boxes/watch");
            pw.socket.binaryType = "arraybuffer";
            pw.socket.onopen = function (evt) {
                pw.socket.onerror = function (evt) {
                    onPackageWatcherError(pw, evt);
                };
                resolve(pw);
            };
            pw.socket.onerror = function (evt) {
                reject(evt);
            };
            pw.socket.onmessage = function (evt) {
                onPackageWatcherMessage(pw, evt);
            };
            pw.socket.onclose = function (evt) {
                onPackageWatcherClose(pw, evt);
            };
        });
    }
    oscar.createPackageWatcher = createPackageWatcher;
    class Client {
        constructor(addr) {
            this.address = addr;
        }
        retrievePublicKey(userId) {
            return new Promise((resolve, reject) => {
                var req = new XMLHttpRequest();
                req.addEventListener("load", function () {
                    if (req.status == 200) {
                        let pkMsg = JSON.parse(req.response);
                        let buf = sodium.from_base64(pkMsg.public_key, sodium.base64_variants.ORIGINAL);
                        resolve(buf);
                    }
                    else {
                        reject(new Error("invalid status code: " + req.status));
                    }
                });
                req.addEventListener("error", function (err) {
                    console.log("error loading public key: ", err);
                    reject(err);
                });
                req.open("GET", this.address + "/alpha/users/" + sodium.to_hex(userId) + "/public-key");
                req.send();
            });
        }
    }
    oscar.Client = Client;
})(oscar || (oscar = {}));

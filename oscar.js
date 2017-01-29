/// <reference path="pubsub.ts" />
var oscar;
(function (oscar) {
    oscar.DROP_BOX_ID_LENGTH = 16;
    oscar.USER_ID_LENGTH = 16;
    oscar.PackageDropEventName = "oscar.package-drop-event";
    function onPackageWatcherMessage(pw, evt) {
        // console.log("PackageWatcher.onMessage", evt.data);
        var binMsg = new Uint8Array(evt.data);
        // quick sanity check
        // message is command (1 byte) + box id + msg (at least 2 bytes)
        var minLength = 1 + oscar.DROP_BOX_ID_LENGTH + 1;
        if (binMsg.length <= minLength) {
            console.log("PackageWatcher.onMessage received an invalid message from the server. length was only ", binMsg.length);
            return;
        }
        // check for the opening byte
        if (binMsg[0] != 1) {
            console.log("PackageWatcher received incorrect opening byte:", binMsg[0]);
            return;
        }
        var boxId = new Uint8Array(new ArrayBuffer(oscar.DROP_BOX_ID_LENGTH));
        for (var i = 0; i < oscar.DROP_BOX_ID_LENGTH; i++) {
            boxId[i] = binMsg[i + 1];
        }
        var msg = new Uint8Array(new ArrayBuffer(binMsg.length - 1 - oscar.DROP_BOX_ID_LENGTH));
        var offset = 1 + oscar.DROP_BOX_ID_LENGTH;
        for (var i = offset; i < binMsg.length; i++) {
            msg[i - offset] = binMsg[i];
        }
        var pkg = { boxId: boxId, msg: msg };
        pubsub.Pub(oscar.PackageDropEventName, pkg);
    }
    function onPackageWatcherError(pw, evt) {
        console.log("PackageWatcher.onError", evt);
    }
    function onPackageWatcherClose(pw, evt) {
        console.log("PackageWatcher.onClose", evt);
    }
    var PackageWatcher = (function () {
        function PackageWatcher() {
        }
        PackageWatcher.prototype.watch = function (boxId) {
            var buf = new Uint8Array(new ArrayBuffer(boxId.length + 1));
            buf[0] = 1;
            for (var i = 1; i <= boxId.length; i++) {
                buf[i] = boxId[i - 1];
            }
            this.socket.send(buf);
        };
        return PackageWatcher;
    }());
    oscar.PackageWatcher = PackageWatcher;
    function createPackageWatcher(address) {
        return new Promise(function (resolve, reject) {
            var pw = new PackageWatcher();
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
    var Client = (function () {
        function Client(addr) {
            this.address = addr;
        }
        Client.prototype.retrievePublicKey = function (userId) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var req = new XMLHttpRequest();
                req.addEventListener("load", function () {
                    if (req.status == 200) {
                        var pkMsg = JSON.parse(req.response);
                        var buf = sodium.from_base64(pkMsg.public_key);
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
                req.open("GET", _this.address + "/alpha/users/" + sodium.to_hex(userId) + "/public-key");
                req.send();
            });
        };
        return Client;
    }());
    oscar.Client = Client;
})(oscar || (oscar = {}));

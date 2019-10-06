var zood;
(function (zood) {
    zood.DROP_BOX_ID_LENGTH = 16;
    zood.USER_ID_LENGTH = 16;
    zood.PRODUCTION_ADDRESS = "wss://api.zood.xyz/1/sockets";
    zood.LOCAL_DEV_ADDRESS = "ws://localhost:4046/1/sockets";
    const ClientCmdWatch = 1;
    const ClientCmdIgnore = 2;
    const ServerMsgPackage = 1;
    const ServerMsgPushNotification = 2;
    zood.SymmetricKeyLength = sodium.crypto_secretbox_KEYBYTES;
    function errorCodeFromNumber(n) {
        if (n == null) {
            return -1 /* unknown */;
        }
        if (n <= 23 && n >= 0) {
            return n;
        }
        return -1 /* unknown */;
    }
    function getHashAlgId(algName) {
        if (algName == "argon2i13") {
            return sodium.crypto_pwhash_ALG_ARGON2I13;
        }
        else if (algName == "argon2id13") {
            return sodium.crypto_pwhash_ALG_ARGON2ID13;
        }
        throw "Unknown hash algorithm '" + algName + "'";
    }
    zood.getHashAlgId = getHashAlgId;
    class AuthenticationChallengeUser {
        static fromJson(json) {
            let u = new AuthenticationChallengeUser();
            try {
                u.publicKey = uint8ArrayFromJsonFail(json, "public_key");
                u.wrappedSecretKey = uint8ArrayFromJsonFail(json, "wrapped_secret_key");
                u.wrappedSecretKeyNonce = uint8ArrayFromJsonFail(json, "wrapped_secret_key_nonce");
                u.passwordSalt = uint8ArrayFromJsonFail(json, "password_salt");
                u.passwordHashAlgorithm = stringFromJsonFail(json, "password_hash_algorithm");
                u.passwordHashOperationsLimit = numberFromJsonFail(json, "password_hash_operations_limit");
                u.passwordHashMemoryLimit = numberFromJsonFail(json, "password_hash_memory_limit");
            }
            catch (err) {
                return null;
            }
            return u;
        }
    }
    zood.AuthenticationChallengeUser = AuthenticationChallengeUser;
    class AuthenticationChallenge {
        static fromHttpResponse(response) {
            let json;
            try {
                json = JSON.parse(response);
            }
            catch (err) {
                return null;
            }
            return this.fromJson(json);
        }
        static fromJson(json) {
            let userJson = json["user"];
            if (userJson == null) {
                return null;
            }
            let u = AuthenticationChallengeUser.fromJson(userJson);
            if (u == null) {
                return null;
            }
            let ac = new AuthenticationChallenge();
            ac.user = u;
            try {
                ac.challenge = uint8ArrayFromJsonFail(json, "challenge");
                ac.creationDate = uint8ArrayFromJsonFail(json, "creation_date");
            }
            catch (err) {
                return null;
            }
            return ac;
        }
    }
    zood.AuthenticationChallenge = AuthenticationChallenge;
    function getCommType(str) {
        if (str == null) {
            return null;
        }
        switch (str) {
            case "avatar_request" /* AvatarRequest */:
            case "avatar_update" /* AvatarUpdate */:
            case "browse_devices" /* BrowseDevices */:
            case "debug" /* Debug */:
            case "device_info" /* DeviceInfo */:
            case "location_info" /* LocationInfo */:
            case "location_sharing_grant" /* LocationSharingGrant */:
            case "location_sharing_revocation" /* LocationSharingRevocation */:
            case "location_update_request" /* LocationUpdateRequest */:
            case "location_update_request_received" /* LocationUpdateRequestReceived */:
            case "scream" /* Scream */:
            case "scream_began" /* ScreamBegan */:
                return str;
            default:
                return null;
        }
    }
    class DeviceInfo {
        static fromJson(json) {
            if (json == null) {
                return null;
            }
            let di = new DeviceInfo();
            try {
                di.id = uint8ArrayFromJsonFail(json, "id");
                di.manufacturer = stringFromJsonFail(json, "manufacturer");
                di.model = stringFromJsonFail(json, "model");
                di.os = stringFromJsonFail(json, "os");
                di.osVersion = stringFromJsonFail(json, "os_version");
            }
            catch (err) {
                return null;
            }
            return di;
        }
        toJsonObject() {
            return {
                "id": sodium.to_base64(this.id, 1 /* ORIGINAL */),
                "manufacturer": this.manufacturer,
                "model": this.model,
                "os": this.os,
                "os_version": this.osVersion
            };
        }
    }
    zood.DeviceInfo = DeviceInfo;
    class EncryptedData {
        constructor(cipherText, nonce) {
            this.cipherText = cipherText;
            this.nonce = nonce;
        }
        toJsonObject() {
            return {
                "cipher_text": sodium.to_base64(this.cipherText, 1 /* ORIGINAL */),
                "nonce": sodium.to_base64(this.nonce, 1 /* ORIGINAL */)
            };
        }
        print() {
            console.log("{", "cipherText", sodium.to_base64(this.cipherText, 1 /* ORIGINAL */), "nonce", sodium.to_base64(this.nonce, 1 /* ORIGINAL */));
        }
    }
    zood.EncryptedData = EncryptedData;
    class Error {
        constructor() {
            this.code = -1 /* unknown */;
            this.message = "";
        }
        static fromRequest(req) {
            let json;
            try {
                json = JSON.parse(req.response);
            }
            catch (err) {
                // failed to parse the error object, so something is wrong with the server
                return this.unknownError();
            }
            let errMsg = stringFromJson(json, "error_message");
            if (errMsg == null) {
                return this.unknownError();
            }
            let e = new Error();
            e.message = errMsg;
            e.code = errorCodeFromNumber(numberFromJson(json, "error_code"));
            return e;
        }
        static networkError() {
            let err = new Error();
            err.code = -2 /* network */;
            err.message = "Network error";
            return err;
        }
        static unknownError() {
            let err = new Error();
            err.code = -1 /* unknown */;
            err.message = "<empty>";
            return err;
        }
    }
    zood.Error = Error;
    class FinishedAuthenticationChallenge {
        constructor(challenge, creationDate) {
            this.challenge = challenge;
            this.creationDate = creationDate;
        }
        toJson() {
            let obj = {
                "challenge": this.challenge.toJsonObject(),
                "creation_date": this.creationDate.toJsonObject()
            };
            return JSON.stringify(obj);
        }
    }
    zood.FinishedAuthenticationChallenge = FinishedAuthenticationChallenge;
    class LoginResponse {
        static fromHttpResponse(response) {
            let json;
            try {
                json = JSON.parse(response);
            }
            catch (err) {
                return null;
            }
            return this.fromJson(json);
        }
        static fromJson(json) {
            let lr = new LoginResponse();
            try {
                lr.id = uint8ArrayFromJsonFail(json, "id");
                lr.wrappedSymmetricKey = uint8ArrayFromJsonFail(json, "wrapped_symmetric_key");
                lr.wrappedSymmetricKeyNonce = uint8ArrayFromJsonFail(json, "wrapped_symmetric_key_nonce");
                lr.accessToken = stringFromJsonFail(json, "access_token");
            }
            catch (err) {
                return null;
            }
            return lr;
        }
    }
    zood.LoginResponse = LoginResponse;
    class PublicKeyResponse {
        static fromHttpResponse(response) {
            let json;
            try {
                json = JSON.parse(response);
            }
            catch (err) {
                return null;
            }
            return this.fromJson(json);
        }
        static fromJson(json) {
            let spkr = new PublicKeyResponse();
            try {
                spkr.public_key = uint8ArrayFromJsonFail(json, "public_key");
            }
            catch (err) {
                return null;
            }
            return spkr;
        }
    }
    zood.PublicKeyResponse = PublicKeyResponse;
    // export class UserPublicKeyResponse {
    //     public_key!: Uint8Array;
    //     static fromHttpResponse(response: any): UserPublicKeyResponse | null {
    //         let json: any;
    //         try {
    //             json = JSON.parse(response);
    //         } catch (err) {
    //             return null;
    //         }
    //         return this.fromJson(json);
    //     }
    //     static fromJson(json: any): UserPublicKeyResponse | null {
    //         let upkr = new UserPublicKeyResponse();
    //         try {
    //             upkr.public_key = uint8ArrayFromJsonFail(json, "public_key");
    //         }
    //     }
    // }
    function booleanFromJson(json, fieldName) {
        let b = json[fieldName];
        if (b == null) {
            return null;
        }
        if (typeof b !== "boolean") {
            return null;
        }
        return b;
    }
    function booleanFromJsonFail(json, fieldName) {
        let b = booleanFromJson(json, fieldName);
        if (b == null) {
            throw "'" + fieldName + "' is not a valid boolean field";
        }
        return b;
    }
    function numberFromJson(json, fieldName) {
        let n = json[fieldName];
        if (n == null) {
            return null;
        }
        if (typeof n !== "number") {
            return null;
        }
        return n;
    }
    function numberFromJsonFail(json, fieldName) {
        let n = numberFromJson(json, fieldName);
        if (n == null) {
            throw "'" + fieldName + "' is not a valid number field";
        }
        return n;
    }
    function stringFromJson(json, fieldName) {
        let str = json[fieldName];
        if (str == null) {
            return null;
        }
        if (typeof str !== "string") {
            return null;
        }
        return str;
    }
    function stringFromJsonFail(json, fieldName) {
        let str = stringFromJson(json, fieldName);
        if (str == null) {
            throw "'" + fieldName + "' is not a valid string field";
        }
        return str;
    }
    function uint8ArrayFromJson(json, fieldName) {
        let b64 = json[fieldName];
        if (b64 == null) {
            return null;
        }
        if (typeof b64 !== "string") {
            return null;
        }
        try {
            let bytes = sodium.from_base64(b64, 1 /* ORIGINAL */);
            if (bytes.length == 0) {
                return null;
            }
            return bytes;
        }
        catch (err) {
            return null;
        }
    }
    function uint8ArrayFromJsonFail(json, fieldName) {
        let bytes = uint8ArrayFromJson(json, fieldName);
        if (bytes == null) {
            throw "'" + fieldName + "' is not a valid base64 field";
        }
        return bytes;
    }
    class PushNotification {
        constructor() {
            this.id = null;
        }
        static fromJson(json) {
            let pn = new PushNotification();
            pn.id = stringFromJson(json, "id");
            try {
                pn.cipherText = uint8ArrayFromJsonFail(json, "cipher_text");
                pn.nonce = uint8ArrayFromJsonFail(json, "nonce");
                pn.senderId = uint8ArrayFromJsonFail(json, "sender_id");
                pn.sentDate = stringFromJsonFail(json, "sent_date");
            }
            catch (err) {
                return null;
            }
            return pn;
        }
    }
    zood.PushNotification = PushNotification;
    function getUpdateRequestActionResponse(str) {
        if (str == null) {
            return str;
        }
        switch (str) {
            case "too_soon" /* TooSoon */:
            case "starting" /* Starting */:
            case "finished" /* Finished */:
                return str;
            default:
                return null;
        }
    }
    class UserComm {
        constructor() {
            this.commType = "unknown" /* Unknown */;
            this.dropBox = null;
            this.avatar = null;
            this.latitude = null;
            this.longitude = null;
            this.time = null;
            this.accuracy = null;
            this.speed = null;
            this.bearing = null;
            this.movement = null;
            this.batteryLevel = null;
            this.batteryCharging = null;
            this.locationUpdateRequestAction = null;
            this.deviceInfo = null;
            this.debugData = null;
        }
        isValid() {
            if (getCommType(this.commType) == null) {
                console.log("encountered unknown CommType. probably from a different version of Zood");
                return false;
            }
            switch (this.commType) {
                case "avatar_request" /* AvatarRequest */:
                    return true;
                case "avatar_update" /* AvatarUpdate */:
                    if (this.avatar == null) {
                        return false;
                    }
                    return true;
                case "browse_devices" /* BrowseDevices */:
                    return false;
                case "debug" /* Debug */:
                    if (this.debugData == null) {
                        return false;
                    }
                    return true;
                case "device_info" /* DeviceInfo */:
                    if (this.deviceInfo == null) {
                        return false;
                    }
                    return true;
                case "location_info" /* LocationInfo */:
                    if (this.latitude == null || this.longitude == null || this.time == null) {
                        return false;
                    }
                    if (this.latitude < -90 || this.latitude > 90) {
                        return false;
                    }
                    if (this.longitude < -180 || this.longitude > 180) {
                        return false;
                    }
                    if (this.time <= 0) {
                        return false;
                    }
                    if (this.batteryLevel != null) {
                        if (this.batteryLevel < -1 || this.batteryLevel > 100) {
                            return false;
                        }
                    }
                    return true;
                case "location_sharing_grant" /* LocationSharingGrant */:
                    if (this.dropBox == null || this.dropBox.length != zood.DROP_BOX_ID_LENGTH) {
                        return false;
                    }
                    return true;
                case "location_sharing_revocation" /* LocationSharingRevocation */:
                    return true;
                case "location_update_request" /* LocationUpdateRequest */:
                    return true;
                case "location_update_request_received" /* LocationUpdateRequestReceived */:
                    if (getUpdateRequestActionResponse(this.locationUpdateRequestAction) == null) {
                        return false;
                    }
                    return true;
                case "scream" /* Scream */:
                    return true;
                case "scream_began" /* ScreamBegan */:
                    return true;
                default:
                    console.log("ERROR! Unhandled CommType", this.commType);
                    return false;
            }
        }
        static newBrowseDevices() {
            let comm = new UserComm();
            comm.commType = "browse_devices" /* BrowseDevices */;
            return comm;
        }
        static fromJson(json) {
            let comm = new UserComm();
            try {
                let commType = getCommType(stringFromJson(json, "type"));
                if (commType == null) {
                    return null;
                }
                comm.commType = commType;
                comm.dropBox = uint8ArrayFromJson(json, "drop_box");
                comm.avatar = uint8ArrayFromJson(json, "avatar");
                comm.latitude = numberFromJson(json, "latitude");
                comm.longitude = numberFromJson(json, "longitude");
                comm.time = numberFromJson(json, "time");
                comm.accuracy = numberFromJson(json, "accuracy");
                comm.speed = numberFromJson(json, "speed");
                comm.bearing = numberFromJson(json, "bearing");
                comm.movement = numberFromJson(json, "movement");
                comm.batteryLevel = numberFromJson(json, "battery_level");
                comm.batteryCharging = booleanFromJson(json, "battery_charging");
                comm.locationUpdateRequestAction = getUpdateRequestActionResponse(stringFromJson(json, "location_update_request_action"));
                comm.debugData = stringFromJson(json, "debug_data");
                comm.deviceInfo = DeviceInfo.fromJson(json["device_info"]);
                if (!comm.isValid()) {
                    return null;
                }
            }
            catch (err) {
                return null;
            }
            return comm;
        }
        toJson() {
            let body = { "type": this.commType };
            if (this.dropBox != null) {
                body["drop_box"] = sodium.to_base64(this.dropBox, 1 /* ORIGINAL */);
            }
            if (this.latitude != null) {
                body["latitude"] = this.latitude;
            }
            if (this.longitude != null) {
                body["longitude"] = this.longitude;
            }
            if (this.time != null) {
                body["time"] = this.time;
            }
            if (this.accuracy != null) {
                body["accuracy"] = this.accuracy;
            }
            if (this.speed != null) {
                body["speed"] = this.speed;
            }
            if (this.bearing != null) {
                body["bearing"] = this.bearing;
            }
            if (this.movement != null) {
                body["movement"] = this.movement;
            }
            if (this.batteryLevel != null) {
                body["battery_level"] = this.batteryLevel;
            }
            if (this.batteryCharging != null) {
                body["battery_charging"] = this.batteryCharging;
            }
            if (this.locationUpdateRequestAction != null) {
                body["location_update_request_action"] = this.locationUpdateRequestAction;
            }
            if (this.debugData != null) {
                body["debug_data"] = this.debugData;
            }
            if (this.deviceInfo != null) {
                body["device_info"] = this.deviceInfo.toJsonObject();
            }
            return JSON.stringify(body);
        }
    }
    zood.UserComm = UserComm;
    function parseDroppedPackage(msg) {
        // sanity check
        let minSize = 1 + zood.DROP_BOX_ID_LENGTH + 2;
        if (msg.length < minSize) {
            console.log("zood.parseDroppedPackage received a package message that is way too small:", msg.length);
            return null;
        }
        let boxId = new Uint8Array(new ArrayBuffer(zood.DROP_BOX_ID_LENGTH));
        for (let i = 0; i < zood.DROP_BOX_ID_LENGTH; i++) {
            boxId[i] = msg[i + 1];
        }
        let pkgBytes = new Uint8Array(new ArrayBuffer(msg.length - 1 - zood.DROP_BOX_ID_LENGTH));
        let offset = 1 + zood.DROP_BOX_ID_LENGTH;
        for (let i = offset; i < msg.length; i++) {
            pkgBytes[i - offset] = msg[i];
        }
        let pkg = { boxId: boxId, bytes: pkgBytes };
        return pkg;
    }
    class DropBoxWatcher {
        constructor() {
            this.onDisconnect = null;
            this.onPackageReceived = null;
            this.isConnected = false;
        }
        connect(hostAddress) {
            let zoodSock = this;
            return new Promise((resolve, reject) => {
                zoodSock.socket = new WebSocket(hostAddress + "/1/drop-boxes/watch");
                zoodSock.socket.binaryType = "arraybuffer";
                zoodSock.socket.onclose = function (evt) {
                    console.log("zood.DropBoxWatcher.onclose prime");
                    reject(evt.reason);
                };
                zoodSock.socket.onerror = function (evt) {
                    console.log("zood.DropBoxWatcher.onerror");
                };
                zoodSock.socket.onmessage = function (evt) {
                    console.log("zood.DropBoxWatcher.onmessage");
                    zoodSock.onMessage(evt);
                };
                zoodSock.socket.onopen = function (evt) {
                    console.log("zood.DropBoxWatcher.onopen");
                    zoodSock.isConnected = true;
                    resolve();
                    // now that we've successfully connected, update the close handler
                    zoodSock.socket.onclose = function (evt) {
                        console.log("zood.DropBoxWatcher.onclose second");
                        zoodSock.isConnected = false;
                        if (zoodSock.onDisconnect != null) {
                            zoodSock.onDisconnect();
                        }
                    };
                };
            });
        }
        onMessage(evt) {
            let binMsg = new Uint8Array(evt.data);
            let pkg = parseDroppedPackage(binMsg);
            if (this.onPackageReceived != null && pkg != null) {
                this.onPackageReceived(pkg);
            }
        }
        watch(boxId) {
            if (!this.isConnected) {
                return;
            }
            let buf = new Uint8Array(new ArrayBuffer(boxId.length + 1));
            buf[0] = ClientCmdWatch;
            for (let i = 1; i <= boxId.length; i++) {
                buf[i] = boxId[i - 1];
            }
            this.socket.send(buf);
        }
    }
    zood.DropBoxWatcher = DropBoxWatcher;
    class Socket {
        constructor(token) {
            this.onDisconnect = null;
            this.onPackageReceived = null;
            this.onPushNotificationReceived = null;
            this.accessToken = token;
            this.isConnected = false;
        }
        connect(hostAddress) {
            let oscSock = this;
            return new Promise((resolve, reject) => {
                oscSock.socket = new WebSocket(hostAddress, [this.accessToken]);
                oscSock.socket.binaryType = "arraybuffer";
                oscSock.socket.onclose = function (evt) {
                    console.log("zood.Socket.onclose prime");
                    reject(evt.reason);
                };
                oscSock.socket.onerror = function (evt) {
                    console.log("zood.Socket.onerror");
                };
                oscSock.socket.onmessage = function (evt) {
                    console.log("zood.Socket.onmessage");
                    oscSock.onMessage(evt);
                };
                oscSock.socket.onopen = function (evt) {
                    console.log("zood.Socket.onopen");
                    oscSock.isConnected = true;
                    resolve();
                    // now that we've successfully connected, update the close handler
                    oscSock.socket.onclose = function (evt) {
                        console.log("zood.Socket.onclose second");
                        oscSock.isConnected = false;
                        if (oscSock.onDisconnect != null) {
                            oscSock.onDisconnect();
                        }
                    };
                };
            });
        }
        onMessage(evt) {
            let binMsg = new Uint8Array(evt.data);
            // sanity check
            if (binMsg.length < 3) {
                console.log("socket received a trivially small message");
                return;
            }
            if (binMsg[0] == ServerMsgPackage) {
                if (this.onPackageReceived != null) {
                    let pkg = parseDroppedPackage(binMsg);
                    if (pkg != null) {
                        this.onPackageReceived(pkg);
                    }
                }
                // this.handleDroppedPackage(binMsg);
            }
            else if (binMsg[0] == ServerMsgPushNotification) {
                this.handlePushNotification(binMsg);
            }
            else {
                console.log("zood.Socket received an invalid/unknown message", binMsg[1]);
            }
        }
        // private handleDroppedPackage(msg: Uint8Array): void {
        //     // sanity check
        //     let minSize = 1 + DROP_BOX_ID_LENGTH + 2;
        //     if (msg.length < minSize) {
        //         console.log("zood.Socket received a package message that is way too small")
        //         return;
        //     }
        //     let boxId = new Uint8Array(new ArrayBuffer(DROP_BOX_ID_LENGTH));
        //     for (let i = 0; i < DROP_BOX_ID_LENGTH; i++) {
        //         boxId[i] = msg[i + 1];
        //     }
        //     let pkgBytes = new Uint8Array(new ArrayBuffer(msg.length - 1 - DROP_BOX_ID_LENGTH));
        //     let offset = 1 + DROP_BOX_ID_LENGTH;
        //     for (let i = offset; i < msg.length; i++) {
        //         pkgBytes[i - offset] = msg[i];
        //     }
        //     let pkg = { boxId: boxId, bytes: pkgBytes };
        //     if (this.onPackageReceived != null) {
        //         this.onPackageReceived(pkg);
        //     }
        // }
        handlePushNotification(msg) {
            console.log("handlePushNotification");
            // let pnBytes = new Uint8Array(msg.length - 1);
            let pnBytes = new Array();
            for (let i = 0; i < pnBytes.length; i++) {
                pnBytes.push(msg[i + 1]);
            }
            let jsonStr = String.fromCharCode.apply(this, pnBytes);
            try {
                let json = JSON.parse(jsonStr);
                let pn = PushNotification.fromJson(json);
                if (pn == null) {
                    console.log("zood.Socket received an invalid push notification");
                    return;
                }
                if (this.onPushNotificationReceived != null) {
                    this.onPushNotificationReceived(pn);
                }
            }
            catch (err) {
                console.log("oscar.Socket error parsing json of push notification", err);
                return;
            }
        }
        watch(boxId) {
            if (!this.isConnected) {
                return;
            }
            let buf = new Uint8Array(new ArrayBuffer(boxId.length + 1));
            buf[0] = ClientCmdWatch;
            for (let i = 1; i <= boxId.length; i++) {
                buf[i] = boxId[i - 1];
            }
            this.socket.send(buf);
        }
    }
    zood.Socket = Socket;
    class Client {
        constructor(accessToken) {
            this.apiBase = "https://api.zood.xyz/1";
            this.accessToken = accessToken;
        }
        completeAuthenticationChallenge(username, finishedChallenge) {
            return new Promise((resolve, reject) => {
                let req = new XMLHttpRequest();
                req.addEventListener("load", function () {
                    if (req.status != 200) {
                        reject(Error.fromRequest(req));
                        return;
                    }
                    let ac = LoginResponse.fromHttpResponse(req.response);
                    if (ac == null) {
                        reject(Error.unknownError());
                        return;
                    }
                    resolve(ac);
                });
                req.addEventListener("error", function () {
                    reject(Error.networkError());
                });
                let endpoint = this.apiBase + "/sessions/" + username + "/challenge-response";
                req.open("POST", endpoint);
                req.send(finishedChallenge.toJson());
            });
        }
        getAuthenticationChallenge(username) {
            return new Promise((resolve, reject) => {
                let req = new XMLHttpRequest();
                req.addEventListener("load", function () {
                    if (req.status != 200) {
                        reject(Error.fromRequest(req));
                        return;
                    }
                    let ac = AuthenticationChallenge.fromHttpResponse(req.response);
                    if (ac == null) {
                        reject(Error.unknownError());
                        return;
                    }
                    resolve(ac);
                });
                req.addEventListener("error", function () {
                    reject(Error.networkError());
                });
                let endpoint = this.apiBase + "/sessions/" + username + "/challenge";
                req.open("POST", endpoint);
                if (this.accessToken != null) {
                    req.setRequestHeader("X-Oscar-Access-Token", this.accessToken);
                }
                req.send();
            });
        }
        getServerPublicKey() {
            return new Promise((resolve, reject) => {
                let req = new XMLHttpRequest();
                req.addEventListener("load", function () {
                    if (req.status != 200) {
                        reject(Error.fromRequest(req));
                        return;
                    }
                    let pkr = PublicKeyResponse.fromHttpResponse(req.response);
                    if (pkr == null) {
                        reject(Error.unknownError());
                        return;
                    }
                    resolve(pkr);
                });
                req.addEventListener("error", function () {
                    reject(Error.networkError());
                });
                let endpoint = this.apiBase + "/public-key";
                req.open("GET", endpoint);
                req.send();
            });
        }
        getUserPublicKey(userId) {
            return new Promise((resolve, reject) => {
                let req = new XMLHttpRequest();
                req.addEventListener("load", function () {
                    if (req.status != 200) {
                        reject(Error.fromRequest(req));
                        return;
                    }
                    let pkr = PublicKeyResponse.fromHttpResponse(req.response);
                    if (pkr == null) {
                        reject(Error.unknownError());
                        return;
                    }
                    resolve(pkr);
                });
                req.addEventListener("error", function () {
                    reject(Error.networkError());
                });
                let endpoint = this.apiBase + "/users/" + sodium.to_hex(userId) + "/public-key";
                req.open("GET", endpoint);
                req.send();
            });
        }
    }
    zood.Client = Client;
    function publicKeyEncrypt(message, receiverPublicKey, senderSecretKey) {
        let nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
        let ct = sodium.crypto_box_easy(message, nonce, receiverPublicKey, senderSecretKey);
        let ed = new EncryptedData(ct, nonce);
        return ed;
    }
    zood.publicKeyEncrypt = publicKeyEncrypt;
    function stretchPassword(len, password, salt, opsLimit, memLimit, algName) {
        return sodium.crypto_pwhash(len, password, salt, opsLimit, memLimit, getHashAlgId(algName));
    }
    zood.stretchPassword = stretchPassword;
    function symmetricKeyDecrypt(cipherText, nonce, key) {
        return sodium.crypto_secretbox_open_easy(cipherText, nonce, key);
    }
    zood.symmetricKeyDecrypt = symmetricKeyDecrypt;
})(zood || (zood = {}));

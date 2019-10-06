namespace zood {
    export const DROP_BOX_ID_LENGTH = 16;
    export const USER_ID_LENGTH = 16;

    export const PRODUCTION_ADDRESS = "wss://api.zood.xyz/1/sockets";
    export const LOCAL_DEV_ADDRESS = "ws://localhost:4046/1/sockets";

    export const enum DropBoxServer {
        production = "wss://api.zood.xyz",
        local_dev = "ws://localhost:4046"
    }

    const ClientCmdWatch = 1;
    const ClientCmdIgnore = 2;

    const ServerMsgPackage = 1;
    const ServerMsgPushNotification = 2;

    export const SymmetricKeyLength = sodium.crypto_secretbox_KEYBYTES;

    export const enum ErrorCode {
        network = -2,
        unknown = -1,
        none = 0,
        internalServer = 1,
        badRequest = 2,
        invalidUsername = 3,
        invalidPublicKey = 4,
        invalidWrappedSecretKey = 5,
        invalidWrappedSecretKeyNonce = 6,
        invalidWrappedSymmetricKey = 7,
        invalidWrappedSymmetricKeyNonce = 8,
        invalidPasswordSalt = 9,
        usernameNotAvailable = 10,
        notFound = 11,
        insufficientPermission = 12,
        argon2iOpsLimitTooLow = 13,
        argon2iMemLimitTooLow = 14,
        invalidAccessToken = 15,
        userNotFound = 16,
        challengeNotFound = 17,
        challengeExpired = 18,
        loginFailed = 19,
        backupNotFound = 20,
        invalidEmail = 21,
        missingVerificationToken = 22,
        invalidPasswordHashAlgorithm = 23,
    }

    function errorCodeFromNumber(n: number | null): ErrorCode {
        if (n == null) {
            return ErrorCode.unknown;
        }

        if (n <= 23 && n >= 0) {
            return n as ErrorCode;
        }
        return ErrorCode.unknown;
    }

    export function getHashAlgId(algName: string): number {
        if (algName == "argon2i13") {
            return sodium.crypto_pwhash_ALG_ARGON2I13;
        } else if (algName == "argon2id13") {
            return sodium.crypto_pwhash_ALG_ARGON2ID13;
        }
        throw "Unknown hash algorithm '" + algName + "'";
    }

    export class AuthenticationChallengeUser {
        publicKey!: Uint8Array;
        wrappedSecretKey!: Uint8Array;
        wrappedSecretKeyNonce!: Uint8Array;
        passwordSalt!: Uint8Array;
        passwordHashAlgorithm!: string;
        passwordHashOperationsLimit!: number;
        passwordHashMemoryLimit!: number;

        static fromJson(json: Object): AuthenticationChallengeUser | null {
            let u = new AuthenticationChallengeUser();
            try {
                u.publicKey = uint8ArrayFromJsonFail(json, "public_key");
                u.wrappedSecretKey = uint8ArrayFromJsonFail(json, "wrapped_secret_key");
                u.wrappedSecretKeyNonce = uint8ArrayFromJsonFail(json, "wrapped_secret_key_nonce");
                u.passwordSalt = uint8ArrayFromJsonFail(json, "password_salt");
                u.passwordHashAlgorithm = stringFromJsonFail(json, "password_hash_algorithm");
                u.passwordHashOperationsLimit = numberFromJsonFail(json, "password_hash_operations_limit");
                u.passwordHashMemoryLimit = numberFromJsonFail(json, "password_hash_memory_limit");
            } catch (err) {
                return null;
            }

            return u;
        }
    }

    export class AuthenticationChallenge {
        user!: AuthenticationChallengeUser;
        challenge!: Uint8Array;
        creationDate!: Uint8Array;

        static fromHttpResponse(response: any): AuthenticationChallenge | null {
            let json: Object;
            try {
                json = JSON.parse(response);
            } catch (err) {
                return null;
            }

            return this.fromJson(json);
        }

        static fromJson(json: any): AuthenticationChallenge | null {
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
            } catch (err) {
                return null;
            }

            return ac;
        }
    }

    export const enum CommType {
        AvatarRequest = "avatar_request",
        AvatarUpdate = "avatar_update",
        BrowseDevices = "browse_devices",
        Debug = "debug",
        DeviceInfo = "device_info",
        LocationInfo = "location_info",
        LocationSharingGrant = "location_sharing_grant",
        LocationUpdateRequest = "location_update_request",
        LocationUpdateRequestReceived = "location_update_request_received",
        LocationSharingRevocation = "location_sharing_revocation",
        Scream = "scream",
        ScreamBegan = "scream_began",
        Unknown = "unknown"
    }

    function getCommType(str: string | null): CommType | null {
        if (str == null) {
            return null;
        }

        switch (str) {
            case CommType.AvatarRequest:
            case CommType.AvatarUpdate:
            case CommType.BrowseDevices:
            case CommType.Debug:
            case CommType.DeviceInfo:
            case CommType.LocationInfo:
            case CommType.LocationSharingGrant:
            case CommType.LocationSharingRevocation:
            case CommType.LocationUpdateRequest:
            case CommType.LocationUpdateRequestReceived:
            case CommType.Scream:
            case CommType.ScreamBegan:
                return str as CommType;
            default:
                return null;
        }
    }

    export class DeviceInfo {
        id!: Uint8Array;
        manufacturer!: string;
        model!: string;
        os!: string;
        osVersion!: string;

        static fromJson(json: any): DeviceInfo | null {
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
            } catch (err) {
                return null;
            }
            return di;
        }

        toJsonObject(): object {
            return {
                "id": sodium.to_base64(this.id, sodium.base64_variants.ORIGINAL),
                "manufacturer": this.manufacturer,
                "model": this.model,
                "os": this.os,
                "os_version": this.osVersion
            };
        }
    }

    export class EncryptedData {
        cipherText: Uint8Array;
        nonce: Uint8Array;

        constructor(cipherText: Uint8Array, nonce: Uint8Array) {
            this.cipherText = cipherText;
            this.nonce = nonce;
        }

        toJsonObject(): object {
            return {
                "cipher_text": sodium.to_base64(this.cipherText, sodium.base64_variants.ORIGINAL),
                "nonce": sodium.to_base64(this.nonce, sodium.base64_variants.ORIGINAL)
            };
        }

        print(): void {
            console.log("{", "cipherText", sodium.to_base64(this.cipherText, sodium.base64_variants.ORIGINAL), "nonce", sodium.to_base64(this.nonce, sodium.base64_variants.ORIGINAL));
        }
    }

    export class Error {
        code: ErrorCode = ErrorCode.unknown;
        message: string = "";

        static fromRequest(req: XMLHttpRequest): Error {
            let json: any;
            try {
                json = JSON.parse(req.response);
            } catch (err) {
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

        static networkError(): Error {
            let err = new Error();
            err.code = ErrorCode.network;
            err.message = "Network error";
            return err;
        }

        static unknownError(): Error {
            let err = new Error();
            err.code = ErrorCode.unknown;
            err.message = "<empty>";
            return err;
        }
    }

    export class FinishedAuthenticationChallenge {
        challenge: EncryptedData;
        creationDate: EncryptedData;

        constructor(challenge: EncryptedData, creationDate: EncryptedData) {
            this.challenge = challenge;
            this.creationDate = creationDate;
        }

        toJson(): string {
            let obj = {
                "challenge": this.challenge.toJsonObject(),
                "creation_date": this.creationDate.toJsonObject()
            }
            return JSON.stringify(obj);
        }
    }

    export class LoginResponse {
        id!: Uint8Array;
        accessToken!: string;
        wrappedSymmetricKey!: Uint8Array;
        wrappedSymmetricKeyNonce!: Uint8Array;

        static fromHttpResponse(response: any): LoginResponse | null {
            let json: Object;
            try {
                json = JSON.parse(response);
            } catch (err) {
                return null;
            }

            return this.fromJson(json);
        }

        static fromJson(json: Object): LoginResponse | null {
            let lr = new LoginResponse();
            try {
                lr.id = uint8ArrayFromJsonFail(json, "id");
                lr.wrappedSymmetricKey = uint8ArrayFromJsonFail(json, "wrapped_symmetric_key");
                lr.wrappedSymmetricKeyNonce = uint8ArrayFromJsonFail(json, "wrapped_symmetric_key_nonce");
                lr.accessToken = stringFromJsonFail(json, "access_token");
            } catch (err) {
                return null;
            }

            return lr;
        }
    }

    export interface Package {
        boxId: Uint8Array;
        bytes: Uint8Array;
    }

    export class PublicKeyResponse {
        public_key!: Uint8Array;

        static fromHttpResponse(response: any): PublicKeyResponse | null {
            let json: any;
            try {
                json = JSON.parse(response);
            } catch (err) {
                return null;
            }

            return this.fromJson(json);
        }

        static fromJson(json: any): PublicKeyResponse | null {
            let spkr = new PublicKeyResponse();
            try {
                spkr.public_key = uint8ArrayFromJsonFail(json, "public_key");
            } catch (err) {
                return null;
            }

            return spkr;
        }
    }

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

    function booleanFromJson(json: any, fieldName: string): boolean | null {
        let b = json[fieldName];
        if (b == null) {
            return null;
        }
        if (typeof b !== "boolean") {
            return null;
        }
        return b;
    }

    function booleanFromJsonFail(json: any, fieldName: string): boolean {
        let b = booleanFromJson(json, fieldName);
        if (b == null) {
            throw "'" + fieldName + "' is not a valid boolean field";
        }
        return b;
    }

    function numberFromJson(json: any, fieldName: string): number | null {
        let n = json[fieldName];
        if (n == null) {
            return null;
        }
        if (typeof n !== "number") {
            return null;
        }
        return n;
    }

    function numberFromJsonFail(json: any, fieldName: string): number {
        let n = numberFromJson(json, fieldName);
        if (n == null) {
            throw "'" + fieldName + "' is not a valid number field";
        }
        return n;
    }

    function stringFromJson(json: any, fieldName: string): string | null {
        let str = json[fieldName];
        if (str == null) {
            return null;
        }
        if (typeof str !== "string") {
            return null;
        }
        return str;
    }

    function stringFromJsonFail(json: any, fieldName: string): string {
        let str = stringFromJson(json, fieldName);
        if (str == null) {
            throw "'" + fieldName + "' is not a valid string field";
        }
        return str;
    }

    function uint8ArrayFromJson(json: any, fieldName: string): Uint8Array | null {
        let b64 = json[fieldName];
        if (b64 == null) {
            return null;
        }

        if (typeof b64 !== "string") {
            return null;
        }

        try {
            let bytes = sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
            if (bytes.length == 0) {
                return null;
            }
            return bytes;
        } catch (err) {
            return null;
        }
    }

    function uint8ArrayFromJsonFail(json: any, fieldName: string): Uint8Array {
        let bytes = uint8ArrayFromJson(json, fieldName);
        if (bytes == null) {
            throw "'" + fieldName + "' is not a valid base64 field";
        }
        return bytes;
    }

    export class PushNotification {
        id: string | null = null;
        cipherText!: Uint8Array;
        nonce!: Uint8Array;
        senderId!: Uint8Array;
        sentDate!: string;

        static fromJson(json: any): PushNotification | null {
            let pn = new PushNotification();

            pn.id = stringFromJson(json, "id");
            try {
                pn.cipherText = uint8ArrayFromJsonFail(json, "cipher_text");
                pn.nonce = uint8ArrayFromJsonFail(json, "nonce");
                pn.senderId = uint8ArrayFromJsonFail(json, "sender_id");
                pn.sentDate = stringFromJsonFail(json, "sent_date");
            } catch (err) {
                return null;
            }

            return pn;
        }
    }

    export const enum UpdateRequestActionResponse {
        TooSoon = "too_soon",
        Starting = "starting",
        Finished = "finished",
    }

    function getUpdateRequestActionResponse(str: string | null): UpdateRequestActionResponse | null {
        if (str == null) {
            return str;
        }

        switch (str) {
            case UpdateRequestActionResponse.TooSoon:
            case UpdateRequestActionResponse.Starting:
            case UpdateRequestActionResponse.Finished:
                return str as UpdateRequestActionResponse;
            default:
                return null;
        }
    }

    export class UserComm {
        commType: CommType = CommType.Unknown;
        dropBox: Uint8Array | null = null;

        avatar: Uint8Array | null = null;

        latitude: number | null = null;
        longitude: number | null = null;
        time: number | null = null;

        accuracy: number | null = null;
        speed: number | null = null;
        bearing: number | null = null;
        movement: number | null = null;
        batteryLevel: number | null = null;
        batteryCharging: boolean | null = null;

        locationUpdateRequestAction: UpdateRequestActionResponse | null = null;

        deviceInfo: DeviceInfo | null = null;

        debugData: string | null = null;

        isValid(): boolean {
            if (getCommType(this.commType) == null) {
                console.log("encountered unknown CommType. probably from a different version of Zood");
                return false;
            }

            switch (this.commType) {
                case CommType.AvatarRequest:
                    return true;
                case CommType.AvatarUpdate:
                    if (this.avatar == null) {
                        return false;
                    }
                    return true;
                case CommType.BrowseDevices:
                    return false;
                case CommType.Debug:
                    if (this.debugData == null) {
                        return false;
                    }
                    return true;
                case CommType.DeviceInfo:
                    if (this.deviceInfo == null) {
                        return false;
                    }
                    return true;
                case CommType.LocationInfo:
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
                case CommType.LocationSharingGrant:
                    if (this.dropBox == null || this.dropBox.length != DROP_BOX_ID_LENGTH) {
                        return false;
                    }
                    return true;
                case CommType.LocationSharingRevocation:
                    return true;
                case CommType.LocationUpdateRequest:
                    return true;
                case CommType.LocationUpdateRequestReceived:
                    if (getUpdateRequestActionResponse(this.locationUpdateRequestAction) == null) {
                        return false;
                    }
                    return true;
                case CommType.Scream:
                    return true;
                case CommType.ScreamBegan:
                    return true;
                default:
                    console.log("ERROR! Unhandled CommType", this.commType);
                    return false;
            }
        }

        static newBrowseDevices(): UserComm {
            let comm = new UserComm();
            comm.commType = CommType.BrowseDevices;
            return comm;
        }

        static fromJson(json: any): UserComm | null {
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
            } catch (err) {
                return null;
            }

            return comm;
        }

        toJson(): string {
            let body = { "type": this.commType } as any;
            if (this.dropBox != null) {
                body["drop_box"] = sodium.to_base64(this.dropBox, sodium.base64_variants.ORIGINAL);
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

    function parseDroppedPackage(msg: Uint8Array): Package | null {
        // sanity check
        let minSize = 1 + DROP_BOX_ID_LENGTH + 2;
        if (msg.length < minSize) {
            console.log("zood.parseDroppedPackage received a package message that is way too small:", msg.length);
            return null;
        }

        let boxId = new Uint8Array(new ArrayBuffer(DROP_BOX_ID_LENGTH));
        for (let i = 0; i < DROP_BOX_ID_LENGTH; i++) {
            boxId[i] = msg[i + 1];
        }

        let pkgBytes = new Uint8Array(new ArrayBuffer(msg.length - 1 - DROP_BOX_ID_LENGTH));
        let offset = 1 + DROP_BOX_ID_LENGTH;
        for (let i = offset; i < msg.length; i++) {
            pkgBytes[i - offset] = msg[i];
        }

        let pkg = { boxId: boxId, bytes: pkgBytes };
        return pkg;
    }

    export class DropBoxWatcher {
        private socket!: WebSocket;
        protected isConnected: boolean;
        public onDisconnect: (() => void) | null = null;
        public onPackageReceived: ((pkg: Package) => void) | null = null;

        constructor() {
            this.isConnected = false;
        }

        connect(hostAddress: DropBoxServer): Promise<void> {
            let zoodSock = this;
            return new Promise<void>((resolve, reject) => {
                zoodSock.socket = new WebSocket(hostAddress + "/1/drop-boxes/watch");
                zoodSock.socket.binaryType = "arraybuffer";
                zoodSock.socket.onclose = function (this: WebSocket, evt: CloseEvent) {
                    console.log("zood.DropBoxWatcher.onclose prime");
                    reject(evt.reason);
                };
                zoodSock.socket.onerror = function (this: WebSocket, evt: Event) {
                    console.log("zood.DropBoxWatcher.onerror");
                };
                zoodSock.socket.onmessage = function (this: WebSocket, evt: MessageEvent) {
                    console.log("zood.DropBoxWatcher.onmessage");
                    zoodSock.onMessage(evt);

                };
                zoodSock.socket.onopen = function (evt: Event) {
                    console.log("zood.DropBoxWatcher.onopen");
                    zoodSock.isConnected = true;
                    resolve();

                    // now that we've successfully connected, update the close handler
                    zoodSock.socket.onclose = function (this: WebSocket, evt: CloseEvent) {
                        console.log("zood.DropBoxWatcher.onclose second");
                        zoodSock.isConnected = false;
                        if (zoodSock.onDisconnect != null) {
                            zoodSock.onDisconnect();
                        }
                    }
                };
            });
        }

        private onMessage(evt: MessageEvent): void {
            let binMsg = new Uint8Array(evt.data);

            let pkg = parseDroppedPackage(binMsg);
            if (this.onPackageReceived != null && pkg != null) {
                this.onPackageReceived(pkg);
            }
        }

        watch(boxId: Uint8Array): void {
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

    export class Socket {
        private socket!: WebSocket;
        private accessToken: string;
        protected isConnected: boolean;
        public onDisconnect: (() => void) | null = null;
        public onPackageReceived: ((pkg: Package) => void) | null = null;
        public onPushNotificationReceived: ((pn: PushNotification) => void) | null = null;

        constructor(token: string) {
            this.accessToken = token;
            this.isConnected = false;
        }

        connect(hostAddress: string): Promise<void> {
            let oscSock = this;
            return new Promise<void>((resolve, reject) => {
                oscSock.socket = new WebSocket(hostAddress, [this.accessToken]);
                oscSock.socket.binaryType = "arraybuffer";
                oscSock.socket.onclose = function (this: WebSocket, evt: CloseEvent) {
                    console.log("zood.Socket.onclose prime");
                    reject(evt.reason);
                };
                oscSock.socket.onerror = function (this: WebSocket, evt: Event) {
                    console.log("zood.Socket.onerror");
                };
                oscSock.socket.onmessage = function (this: WebSocket, evt: MessageEvent) {
                    console.log("zood.Socket.onmessage");
                    oscSock.onMessage(evt);
                };
                oscSock.socket.onopen = function (this: WebSocket, evt: Event) {
                    console.log("zood.Socket.onopen");
                    oscSock.isConnected = true;
                    resolve();

                    // now that we've successfully connected, update the close handler
                    oscSock.socket.onclose = function (this: WebSocket, evt: CloseEvent) {
                        console.log("zood.Socket.onclose second");
                        oscSock.isConnected = false;
                        if (oscSock.onDisconnect != null) {
                            oscSock.onDisconnect();
                        }
                    }
                };
            });
        }

        private onMessage(evt: MessageEvent): void {
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
            } else if (binMsg[0] == ServerMsgPushNotification) {
                this.handlePushNotification(binMsg);
            } else {
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

        private handlePushNotification(msg: Uint8Array): void {
            console.log("handlePushNotification");
            // let pnBytes = new Uint8Array(msg.length - 1);
            let pnBytes = new Array<number>();
            for (let i = 0; i < pnBytes.length; i++) {
                pnBytes.push(msg[i + 1]);
            }

            let jsonStr = String.fromCharCode.apply(this, pnBytes);
            try {
                let json = JSON.parse(jsonStr);
                let pn = PushNotification.fromJson(json);
                if (pn == null) {
                    console.log("zood.Socket received an invalid push notification")
                    return;
                }
                if (this.onPushNotificationReceived != null) {
                    this.onPushNotificationReceived(pn);
                }
            } catch (err) {
                console.log("oscar.Socket error parsing json of push notification", err);
                return;
            }
        }

        watch(boxId: Uint8Array): void {
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

    export class Client {
        private apiBase = "https://api.zood.xyz/1";
        private accessToken: string | null;

        constructor(accessToken: string | null) {
            this.accessToken = accessToken;
        }

        completeAuthenticationChallenge(username: string, finishedChallenge: FinishedAuthenticationChallenge): Promise<LoginResponse> {
            return new Promise<LoginResponse>((resolve, reject) => {
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

        getAuthenticationChallenge(username: string): Promise<AuthenticationChallenge> {
            return new Promise<AuthenticationChallenge>((resolve, reject) => {
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

        getServerPublicKey(): Promise<PublicKeyResponse> {
            return new Promise<PublicKeyResponse>((resolve, reject) => {
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

        getUserPublicKey(userId: Uint8Array): Promise<PublicKeyResponse> {
            return new Promise<PublicKeyResponse>((resolve, reject) => {
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
                })
                req.addEventListener("error", function () {
                    reject(Error.networkError());
                })
                let endpoint = this.apiBase + "/users/" + sodium.to_hex(userId) + "/public-key";
                req.open("GET", endpoint);
                req.send();
            });
        }
    }

    export function publicKeyEncrypt(message: Uint8Array, receiverPublicKey: Uint8Array, senderSecretKey: Uint8Array): EncryptedData {
        let nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
        let ct = sodium.crypto_box_easy(message, nonce, receiverPublicKey, senderSecretKey);
        let ed = new EncryptedData(ct, nonce);
        return ed;
    }

    export function stretchPassword(len: number, password: string, salt: Uint8Array, opsLimit: number, memLimit: number, algName: string): Uint8Array {
        return sodium.crypto_pwhash(len,
            password,
            salt,
            opsLimit,
            memLimit,
            getHashAlgId(algName));
    }

    export function symmetricKeyDecrypt(cipherText: Uint8Array, nonce: Uint8Array, key: Uint8Array) {
        return sodium.crypto_secretbox_open_easy(cipherText, nonce, key);
    }
}
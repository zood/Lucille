var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// const gRESTAddress = "http://127.0.0.1:9999"
// const gRPCAddress = "ws://127.0.0.1:9999"
var gRESTAddress = "https://api.pijun.io";
var gRPCAddress = "wss://api.pijun.io";
var PageState = (function () {
    function PageState() {
        this.marker = null;
    }
    return PageState;
}());
var gPageState = new PageState();
var connectedPackageWatcher = null;
function extractDataFromFragment() {
    if (!window.document.location.hash) {
        console.log("where the heck is the fragment?");
        return false;
    }
    var fragment = window.document.location.hash.substring(1);
    var keyVals = fragment.split("&");
    for (var _i = 0, keyVals_1 = keyVals; _i < keyVals_1.length; _i++) {
        var kv = keyVals_1[_i];
        var parts = kv.split("=");
        if (parts.length != 2) {
            continue;
        }
        switch (parts[0]) {
            case "u":
                gPageState.username = parts[1];
                break;
            case "k":
                gPageState.secretKey = sodium.from_hex(parts[1]);
                break;
            case "b":
                gPageState.receivingBoxId = sodium.from_hex(parts[1]);
                if (gPageState.receivingBoxId.length != oscar.DROP_BOX_ID_LENGTH) {
                    console.log("ERROR: box id in fragment is the incorrect length", gPageState.receivingBoxId.length);
                    return false;
                }
                break;
            case "i":
                gPageState.userId = sodium.from_hex(parts[1]);
                if (gPageState.userId.length != oscar.USER_ID_LENGTH) {
                    console.log("ERROR: user id in fragment is the incorrect length", gPageState.userId.length);
                    return false;
                }
                break;
        }
    }
    return true;
}
function onMarkerClicked(evt) {
    return __awaiter(this, void 0, void 0, function () {
        var content, latLng, rg, place;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("marker was clicked", evt);
                    if (gPageState.marker == null) {
                        console.log("marker is null");
                        return [2 /*return*/];
                    }
                    content = document.createElement("p");
                    content.innerText = "Loading...";
                    gPageState.marker.setPopupContent(content);
                    gPageState.marker.openPopup();
                    latLng = gPageState.marker.getLatLng();
                    return [4 /*yield*/, gmaps.getReverseGeocoding(latLng.lat, latLng.lat, window.navigator.language)];
                case 1:
                    rg = _a.sent();
                    place = gmaps.getLocalityAddress(rg);
                    if (place == null) {
                        content.innerText = latLng.lat + ", " + latLng.lng;
                    }
                    else {
                        content.innerText = place;
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function onPackageReceived(pkg) {
    return __awaiter(this, void 0, void 0, function () {
        var msgStr, msgObj, encData, unencData, locInfoStr, locInfo, latlng;
        return __generator(this, function (_a) {
            // console.log("onPackageReceived:", pkg);
            // make sure this is the box we're interested in
            if (!sodium.memcmp(pkg.boxId, gPageState.receivingBoxId)) {
                console.log("Received a package from a drop box for which we're not interested", sodium.to_hex(pkg.boxId));
                return [2 /*return*/];
            }
            msgStr = String.fromCharCode.apply(this, pkg.msg);
            msgObj = JSON.parse(msgStr);
            encData = {
                cipher_text: sodium.from_base64(msgObj.cipher_text),
                nonce: sodium.from_base64(msgObj.nonce)
            };
            unencData = sodium.crypto_box_open_easy(encData.cipher_text, encData.nonce, gPageState.senderPublicKey, gPageState.secretKey);
            locInfoStr = String.fromCharCode.apply(this, unencData);
            locInfo = JSON.parse(locInfoStr);
            if (!locInfo.type) {
                console.log("received package without a 'type'. Expecting LocationInfo, found: ", locInfoStr);
                return [2 /*return*/];
            }
            if (locInfo.type != "location_info") {
                console.log("unexpected message type:", locInfo.type);
                return [2 /*return*/];
            }
            console.log(locInfoStr);
            latlng = L.latLng(locInfo.latitude, locInfo.longitude);
            // if we already have a marker for the user, update it. otherwise, build one.
            if (gPageState.marker == null) {
                gPageState.marker = L.marker(latlng, { title: gPageState.username }).
                    addTo(gPageState.map).
                    on("click", onMarkerClicked, null);
            }
            else {
                gPageState.marker.setLatLng(latlng);
            }
            gPageState.map.setView(latlng, 15, { animate: true });
            return [2 /*return*/];
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var secretKeyElement, usernameElement, boxIdElement, userIdElement, client, _a, err_1, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    L.mapbox.accessToken = 'pk.eyJ1IjoiYXJhc2hwYXlhbiIsImEiOiJFNWpWRTBZIn0.Ha2rFR0qeRdAnW9NyTZ9NA';
                    // bring up the display ASAP
                    gPageState.map = L.mapbox.map("map", "mapbox.streets");
                    if (!extractDataFromFragment()) {
                        return [2 /*return*/];
                    }
                    secretKeyElement = document.getElementById("secret_key");
                    if (secretKeyElement) {
                        secretKeyElement.innerText = sodium.to_hex(gPageState.secretKey);
                    }
                    usernameElement = document.getElementById("username");
                    if (usernameElement) {
                        usernameElement.innerText = gPageState.username;
                    }
                    boxIdElement = document.getElementById("box_id");
                    if (boxIdElement) {
                        boxIdElement.innerText = sodium.to_hex(gPageState.receivingBoxId);
                    }
                    userIdElement = document.getElementById("user_id");
                    if (userIdElement) {
                        userIdElement.innerText = sodium.to_hex(gPageState.userId);
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    client = new oscar.Client(gRESTAddress);
                    _a = gPageState;
                    return [4 /*yield*/, client.retrievePublicKey(gPageState.userId)];
                case 2:
                    _a.senderPublicKey = _b.sent();
                    console.log("got spk:", gPageState.senderPublicKey);
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _b.sent();
                    console.log("error retrieving public key: ", err_1);
                    return [2 /*return*/];
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, oscar.createPackageWatcher(gRPCAddress)];
                case 5:
                    connectedPackageWatcher = _b.sent();
                    console.log("got package watcher");
                    return [3 /*break*/, 7];
                case 6:
                    err_2 = _b.sent();
                    console.log("error creating package watcher", err_2);
                    return [2 /*return*/];
                case 7:
                    pubsub.Sub(oscar.PackageDropEventName, onPackageReceived);
                    connectedPackageWatcher.watch(gPageState.receivingBoxId);
                    return [2 /*return*/];
            }
        });
    });
}
run();

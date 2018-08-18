// const gRESTAddress = "http://127.0.0.1:9999"
// const gRPCAddress = "ws://127.0.0.1:9999"
const gRESTAddress = "https://api.pijun.io";
const gRPCAddress = "wss://api.pijun.io";
class PageState {
    constructor() {
        this.lastLocation = null;
        this.map = null;
        this.marker = null;
    }
}
const gPageState = new PageState();
let connectedPackageWatcher = null;
// interface SodiumWindow extends Window {
//     sodium: s
// }
function extractDataFromFragment() {
    if (!window.document.location.hash) {
        return false;
    }
    let fragment = window.document.location.hash.substring(1);
    let keyVals = fragment.split("&");
    for (var kv of keyVals) {
        let parts = kv.split("=");
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
// Gets called by the GMaps SDK once it's done loading
function initMap() {
    let lat = 0;
    let lng = 0;
    let zoom = 2;
    // if we already have a location, center us there
    if (gPageState.lastLocation != null) {
        console.log("We already have the initial location");
        lat = gPageState.lastLocation.latitude;
        lng = gPageState.lastLocation.longitude;
        zoom = 15;
    }
    gPageState.map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: lat, lng: lng },
        zoom: zoom
    });
}
async function onPackageReceived(pkg) {
    // console.log("onPackageReceived:", pkg);
    // make sure this is the box we're interested in
    if (!sodium.memcmp(pkg.boxId, gPageState.receivingBoxId)) {
        console.log("Received a package from a drop box for which we're not interested", sodium.to_hex(pkg.boxId));
        return;
    }
    let msgStr = String.fromCharCode.apply(this, pkg.msg);
    let msgObj = JSON.parse(msgStr);
    let encData = {
        cipher_text: sodium.from_base64(msgObj.cipher_text, sodium.base64_variants.ORIGINAL),
        nonce: sodium.from_base64(msgObj.nonce, sodium.base64_variants.ORIGINAL)
    };
    let unencData = sodium.crypto_box_open_easy(encData.cipher_text, encData.nonce, gPageState.senderPublicKey, gPageState.secretKey);
    let locInfoStr = String.fromCharCode.apply(this, unencData);
    let locInfo = JSON.parse(locInfoStr);
    if (!locInfo.type) {
        console.log("received package without a 'type'. Expecting LocationInfo, found: ", locInfoStr);
        return;
    }
    if (locInfo.type != "location_info") {
        console.log("unexpected message type:", locInfo.type);
        return;
    }
    console.log(locInfoStr);
    gPageState.lastLocation = locInfo;
    // Make sure the map has loaded first
    if (gPageState.map == null) {
        return;
    }
    let pos = { lat: locInfo.latitude, lng: locInfo.longitude };
    // if we already have a marker for the user, update it. otherwise, build one.
    if (gPageState.marker == null) {
        gPageState.marker = new google.maps.Marker({
            position: pos, map: gPageState.map,
            title: gPageState.username
        });
        let mapOpts = {
            zoom: 15,
            center: pos
        };
        gPageState.map.setOptions(mapOpts);
    }
    else {
        gPageState.marker.setOptions({ position: pos });
    }
    /*
    */
}
async function run() {
    console.log("run");
    if (!extractDataFromFragment()) {
        return;
    }
    let secretKeyElement = document.getElementById("secret_key");
    if (secretKeyElement) {
        secretKeyElement.innerText = sodium.to_hex(gPageState.secretKey);
    }
    let usernameElement = document.getElementById("username");
    if (usernameElement) {
        usernameElement.innerText = gPageState.username;
    }
    let boxIdElement = document.getElementById("box_id");
    if (boxIdElement) {
        boxIdElement.innerText = sodium.to_hex(gPageState.receivingBoxId);
    }
    let userIdElement = document.getElementById("user_id");
    if (userIdElement) {
        userIdElement.innerText = sodium.to_hex(gPageState.userId);
    }
    try {
        let client = new oscar.Client(gRESTAddress);
        gPageState.senderPublicKey = await client.retrievePublicKey(gPageState.userId);
        // console.log("got spk:", gPageState.senderPublicKey);
    }
    catch (err) {
        console.log("error retrieving public key: ", err);
        return;
    }
    try {
        connectedPackageWatcher = await oscar.createPackageWatcher(gRPCAddress);
        console.log("got package watcher");
    }
    catch (err) {
        console.log("error creating package watcher", err);
        return;
    }
    pubsub.Sub(oscar.PackageDropEventName, onPackageReceived);
    connectedPackageWatcher.watch(gPageState.receivingBoxId);
}
// run();

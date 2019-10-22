class Application {
    constructor() {
        this.lastLocation = null;
        this.map = null;
        this.marker = null;
    }
}
const app = new Application();
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
                app.username = parts[1];
                break;
            case "k":
                app.secretKey = sodium.from_hex(parts[1]);
                break;
            case "b":
                app.receivingBoxId = sodium.from_hex(parts[1]);
                if (app.receivingBoxId.length != zood.DROP_BOX_ID_LENGTH) {
                    console.log("ERROR: box id in fragment is the incorrect length", app.receivingBoxId.length);
                    return false;
                }
                break;
            case "i":
                app.userId = sodium.from_hex(parts[1]);
                if (app.userId.length != zood.USER_ID_LENGTH) {
                    console.log("ERROR: user id in fragment is the incorrect length", app.userId.length);
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
    if (app.lastLocation != null) {
        console.log("We already have the initial location");
        lat = app.lastLocation.latitude;
        lng = app.lastLocation.longitude;
        zoom = 15;
    }
    app.map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: lat, lng: lng },
        zoom: zoom,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
    });
}
async function onPackageReceived(pkg) {
    // console.log("onPackageReceived:", pkg);
    // make sure this is the box we're interested in
    if (!sodium.memcmp(pkg.boxId, app.receivingBoxId)) {
        console.log("Received a package from a drop box for which we're not interested", sodium.to_hex(pkg.boxId));
        return;
    }
    let msgStr = String.fromCharCode.apply(this, pkg.bytes);
    let msgObj = JSON.parse(msgStr);
    let encData = {
        cipher_text: sodium.from_base64(msgObj.cipher_text, 1 /* ORIGINAL */),
        nonce: sodium.from_base64(msgObj.nonce, 1 /* ORIGINAL */)
    };
    let unencData = sodium.crypto_box_open_easy(encData.cipher_text, encData.nonce, app.senderPublicKey, app.secretKey);
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
    app.lastLocation = locInfo;
    let batteryPowerDiv = document.getElementById("battery-power");
    if (locInfo.battery_level != null) {
        batteryPowerDiv.innerText = `${locInfo.battery_level}%`;
    }
    else {
        batteryPowerDiv.innerText = "";
    }
    let updateTimeDiv = document.getElementById("update-time");
    let rtf = new Intl.RelativeTimeFormat(navigator.languages[0], { numeric: "auto", style: "short" });
    let oneDayMs = 86400 * 1000;
    let msAgo = new Date().getTime() - locInfo.time;
    let ago = "";
    console.log(new Date(locInfo.time).toLocaleDateString());
    if (msAgo < 60 * 1000) {
        ago = "Now";
    }
    else if (msAgo < 60 * 60 * 1000) {
        ago = rtf.format(-msAgo / 1000 / 60, "minute");
    }
    else if (msAgo < oneDayMs) {
        ago = rtf.format(-msAgo / 1000 / 60 / 60, "hour");
    }
    else if (msAgo < oneDayMs * 7) {
        ago = rtf.format(-msAgo / oneDayMs, "day");
    }
    else {
        let date = new Date(locInfo.time);
        ago = date.toLocaleDateString();
    }
    updateTimeDiv.innerHTML = ` • &nbsp;  ${ago}`;
    let compass = document.getElementById("compass");
    if (locInfo.bearing != null) {
        compass.style.display = "inline-block";
        compass.style.transform = `rotate(${locInfo.bearing}deg)`;
    }
    else {
        compass.style.display = "none";
    }
    // Make sure the map has loaded first
    if (app.map == null) {
        return;
    }
    let pos = { lat: locInfo.latitude, lng: locInfo.longitude };
    // if we already have a marker for the user, update it. otherwise, build one.
    if (app.marker == null) {
        app.marker = new google.maps.Marker({
            position: pos,
            map: app.map,
            title: app.username
        });
        let mapOpts = {
            zoom: 15,
            center: pos
        };
        app.map.setOptions(mapOpts);
    }
    else {
        app.marker.setOptions({ position: pos });
    }
    try {
        let rg = await locationiq.getReverseGeocoding(locInfo.latitude, locInfo.longitude);
        let addressElem = document.getElementById("address");
        addressElem.innerText = rg.getAddress();
        // console.log("received rg:", rg);
        // console.log("addr:", rg.getAddress());
    }
    catch (err) {
        console.log("failed to update address:", err);
    }
}
async function run() {
    console.log("run");
    if (!extractDataFromFragment()) {
        return;
    }
    let usernameSpans = document.getElementsByClassName("username");
    for (let i = 0; i < usernameSpans.length; i++) {
        let span = usernameSpans.item(i);
        if (span == null) {
            break;
        }
        span.innerText = app.username;
    }
    try {
        let client = new zood.Client(null);
        let pkr = await client.getUserPublicKey(app.userId);
        app.senderPublicKey = pkr.public_key;
        // console.log("got spk:", app.senderPublicKey);
    }
    catch (err) {
        console.log("error retrieving public key: ", err);
        return;
    }
    try {
        let socket = new zood.DropBoxWatcher();
        socket.onPackageReceived = onPackageReceived;
        await socket.connect("wss://api.zood.xyz" /* production */);
        console.log("drop box watcher is connected");
        socket.watch(app.receivingBoxId);
    }
    catch (err) {
        console.log("error connecting drop box watcher", err);
        return;
    }
}

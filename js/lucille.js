"use strict";
class Application {
    constructor() {
        this.updateTimer = null;
        this.lastLocation = null;
        this.map = null;
        this.marker = null;
    }
    getBatteryClassName(level) {
        let clazzName = "battery ";
        if (level >= 95) {
            clazzName += "battery-100";
        }
        else if (level >= 85) {
            clazzName += "battery-90";
        }
        else if (level >= 75) {
            clazzName += "battery-80";
        }
        else if (level >= 65) {
            clazzName += "battery-70";
        }
        else if (level >= 55) {
            clazzName += "battery-60";
        }
        else if (level >= 45) {
            clazzName += "battery-50";
        }
        else if (level >= 35) {
            clazzName += "battery-40";
        }
        else if (level >= 25) {
            clazzName += "battery-30";
        }
        else if (level >= 15) {
            clazzName += "battery-20";
        }
        else if (level >= 5) {
            clazzName += "battery-10";
        }
        else {
            clazzName += "battery-0";
        }
        return clazzName;
    }
    getLocation() {
        return this.lastLocation;
    }
    async setLocation(locInfo) {
        app.lastLocation = locInfo;
        let batteryPowerDiv = document.getElementById("battery-power");
        if (locInfo.battery_level != null) {
            batteryPowerDiv.innerText = `${locInfo.battery_level}%`;
        }
        else {
            batteryPowerDiv.innerText = "";
        }
        this.updateTimeAgo();
        // clear out the old timer, and schedule a new one
        if (this.updateTimer != null) {
            clearInterval(this.updateTimer);
        }
        this.updateTimer = setInterval(this.updateTimeAgo, 60 * 1000);
        let compass = document.getElementById("compass");
        if (locInfo.bearing != null) {
            compass.style.display = "inline-block";
            compass.style.transform = `rotate(${locInfo.bearing}deg)`;
        }
        else {
            compass.style.display = "none";
        }
        let transportationMode = document.getElementById("transportation-mode");
        switch (locInfo.movement) {
            case "bicycle" /* zood.MovementType.Bicycle */:
                transportationMode.src = "../images/activities/bike.svg";
                break;
            case "on_foot" /* zood.MovementType.OnFoot */:
            case "running" /* zood.MovementType.Running */:
            case "walking" /* zood.MovementType.Walking */:
                transportationMode.src = "../images/activities/walk.svg";
                break;
            case "vehicle" /* zood.MovementType.Vehicle */:
                transportationMode.src = "../images/activities/car.svg";
                break;
            case null:
            default:
                transportationMode.src = "";
                break;
        }
        transportationMode.hidden = transportationMode.src == "";
        // Make sure the map has loaded first
        if (app.map == null) {
            return;
        }
        let pos = L.latLng(locInfo.latitude, locInfo.longitude);
        // if we already have a marker for the user, update it. otherwise, build one.
        if (app.marker == null) {
            app.marker = L.marker(pos).addTo(app.map).bindPopup(app.username);
            app.map.flyTo(pos, 15);
        }
        else {
            app.marker.setLatLng(pos);
        }
        // set the battery level
        let batteryIcon = document.getElementById("battery-icon");
        batteryIcon.className = this.getBatteryClassName(locInfo.battery_level);
        let addressElem = document.getElementById("address");
        try {
            let rg = await nominatim.getReverseGeocoding(locInfo.latitude, locInfo.longitude);
            // a newer location may have arrived while we were waiting
            if (app.lastLocation === locInfo) {
                addressElem.innerText = rg.getAddress();
            }
        }
        catch (err) {
            console.log("failed to update address:", err);
            if (app.lastLocation === locInfo) {
                addressElem.innerText = `${locInfo.latitude.toFixed(5)}, ${locInfo.longitude.toFixed(5)}`;
            }
        }
    }
    updateTimeAgo() {
        let updateTimeDiv = document.getElementById("update-time");
        let location = app.lastLocation;
        if (location == null) {
            updateTimeDiv.innerHTML = ` &nbsp; • &nbsp;  …`;
            return;
        }
        let ago = zdtime.relativeTime(new Date().getTime(), location.time, "en-US");
        updateTimeDiv.innerHTML = ` &nbsp; • &nbsp;  ${ago}`;
    }
}
const app = new Application();
const lightMapStyle = "https://www.zood.xyz/static/map-style.json";
const darkMapStyle = "https://www.zood.xyz/static/map-style-dark.json";
// Matches while the viewer's system is in dark mode
const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
function mapStyle() {
    return darkScheme.matches ? darkMapStyle : lightMapStyle;
}
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
        cipher_text: sodium.from_base64(msgObj.cipher_text, 1 /* sodium.base64_variants.ORIGINAL */),
        nonce: sodium.from_base64(msgObj.nonce, 1 /* sodium.base64_variants.ORIGINAL */)
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
    app.setLocation(locInfo);
}
async function run() {
    console.log("run");
    if (!extractDataFromFragment()) {
        return;
    }
    // initialize the Leaflet map
    const map = L.map('map').setView([0, 0], 2);
    const glLayer = L.maplibreGL({
        // style: 'https://tiles.openfreemap.org/styles/liberty',
        style: mapStyle(),
        // The plugin shows this instead of the attributions in the style, which has none
        attributionControl: {
            customAttribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        },
    }).addTo(map);
    app.map = map;
    // switch the map along with the system's light or dark mode
    darkScheme.addEventListener("change", () => {
        glLayer.getMaplibreMap().setStyle(mapStyle());
    });
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
    watchDropBox();
}
const RECONNECT_MIN_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 60 * 1000;
// A connection that stays up at least this long resets the reconnect backoff
const STABLE_CONNECTION_MS = 60 * 1000;
// Watches the receiving drop box, reconnecting whenever the socket to oscar fails or drops. oscar
// sends the box's current package as soon as it's watched, so a reconnect also catches up on any
// location update that arrived while we were disconnected.
function watchDropBox() {
    let delay = RECONNECT_MIN_DELAY_MS;
    let retryTimer = null;
    const scheduleReconnect = () => {
        if (retryTimer != null) {
            return;
        }
        // jitter, so viewers don't all reconnect at the same instant after an oscar restart
        let wait = delay / 2 + Math.random() * delay / 2;
        console.log(`reconnecting drop box watcher in ${Math.round(wait)}ms`);
        retryTimer = window.setTimeout(connect, wait);
        delay = Math.min(delay * 2, RECONNECT_MAX_DELAY_MS);
    };
    const connect = async () => {
        retryTimer = null;
        let watcher = new zood.DropBoxWatcher();
        watcher.onPackageReceived = onPackageReceived;
        let connectedAt = 0;
        watcher.onDisconnect = () => {
            console.log("drop box watcher disconnected");
            if (Date.now() - connectedAt >= STABLE_CONNECTION_MS) {
                delay = RECONNECT_MIN_DELAY_MS;
            }
            scheduleReconnect();
        };
        try {
            await watcher.connect("wss://api.zood.xyz" /* zood.DropBoxServer.production */);
        }
        catch (err) {
            console.log("error connecting drop box watcher", err);
            scheduleReconnect();
            return;
        }
        connectedAt = Date.now();
        console.log("drop box watcher is connected");
        watcher.watch(app.receivingBoxId);
    };
    // when the network comes back, don't sit out the rest of the backoff
    window.addEventListener("online", () => {
        if (retryTimer != null) {
            clearTimeout(retryTimer);
            delay = RECONNECT_MIN_DELAY_MS;
            connect();
        }
    });
    connect();
}

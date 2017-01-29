// const gRESTAddress = "http://127.0.0.1:9999"
// const gRPCAddress = "ws://127.0.0.1:9999"
const gRESTAddress = "https://api.pijun.io"
const gRPCAddress = "wss://api.pijun.io"

class PageState {
    username: string;
    secretKey: Uint8Array;
    receivingBoxId: Uint8Array;
    userId: Uint8Array;
    senderPublicKey: Uint8Array;

    map: L.Map;
    marker: L.Marker | null;

    constructor() {
        this.marker = null;
    }
}
const gPageState = new PageState();

let connectedPackageWatcher: oscar.PackageWatcher | null = null;

interface EncryptedData {
    cipher_text: Uint8Array;
    nonce: Uint8Array;
}

interface PublicKeyResponse {
    public_key: string;
}

interface LocationInfo {
    accuracy: number;
    latitude: number;
    longitude: number;
    time: number;
    type: string | null | undefined
}

function extractDataFromFragment(): boolean {
    if (!window.document.location.hash) {
        console.log("where the heck is the fragment?");
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

async function onMarkerClicked(evt: MouseEvent) {
    console.log("marker was clicked", evt);
    if (gPageState.marker == null) {
        console.log("marker is null");
        return;
    }

    let content = document.createElement("p");
    content.innerText = "Loading...";
    gPageState.marker.setPopupContent(content);
    gPageState.marker.openPopup();

    let latLng = gPageState.marker.getLatLng()
    let rg = await gmaps.getReverseGeocoding(latLng.lat, latLng.lat, window.navigator.language);
    let place = gmaps.getLocalityAddress(rg);
    if (place == null) {
        content.innerText = latLng.lat + ", " + latLng.lng;
    } else {
        content.innerText = place;
    }
}

async function onPackageReceived(pkg: oscar.Package) {
    // console.log("onPackageReceived:", pkg);
    // make sure this is the box we're interested in
    if (!sodium.memcmp(pkg.boxId, gPageState.receivingBoxId)) {
        console.log("Received a package from a drop box for which we're not interested", sodium.to_hex(pkg.boxId));
        return;
    }

    let msgStr = String.fromCharCode.apply(this, pkg.msg);
    let msgObj = JSON.parse(msgStr);
    let encData = {
        cipher_text: sodium.from_base64(msgObj.cipher_text),
        nonce: sodium.from_base64(msgObj.nonce)
    } as EncryptedData;

    let unencData = sodium.crypto_box_open_easy(encData.cipher_text, encData.nonce, gPageState.senderPublicKey, gPageState.secretKey);
    let locInfoStr = String.fromCharCode.apply(this, unencData);
    let locInfo = JSON.parse(locInfoStr) as LocationInfo;
    if (!locInfo.type) {
        console.log("received package without a 'type'. Expecting LocationInfo, found: ", locInfoStr);
        return;
    }
    if (locInfo.type != "location_info") {
        console.log("unexpected message type:", locInfo.type);
        return;
    }
    console.log(locInfoStr);

    let latlng = L.latLng(locInfo.latitude, locInfo.longitude);
    // if we already have a marker for the user, update it. otherwise, build one.
    if (gPageState.marker == null) {
        gPageState.marker = L.marker(latlng, { title: gPageState.username }).
            addTo(gPageState.map).
            on("click", onMarkerClicked, null);
    } else {
        gPageState.marker.setLatLng(latlng);
    }
    gPageState.map.setView(latlng, 15, { animate: true });

    // let rg = await gmaps.getReverseGeocoding(locInfo.latitude, locInfo.longitude, window.navigator.language);
    // let place = gmaps.getLocalityAddress(rg);
    // console.log(place);
    // console.log("popup", gPageState.marker.getPopup());
}

async function run() {
    L.mapbox.accessToken = 'pk.eyJ1IjoiYXJhc2hwYXlhbiIsImEiOiJFNWpWRTBZIn0.Ha2rFR0qeRdAnW9NyTZ9NA';
    // bring up the display ASAP
    gPageState.map = L.mapbox.map("map", "mapbox.streets");

    if (!extractDataFromFragment()) {
        return;
    }

    let secretKeyElement = document.getElementById("secret_key")
    if (secretKeyElement) {
        secretKeyElement.innerText = sodium.to_hex(gPageState.secretKey)
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
        console.log("got spk:", gPageState.senderPublicKey);
    } catch (err) {
        console.log("error retrieving public key: ", err);
        return;
    }

    try {
        connectedPackageWatcher = await oscar.createPackageWatcher(gRPCAddress);
        console.log("got package watcher");
    } catch (err) {
        console.log("error creating package watcher", err);
        return;
    }

    pubsub.Sub(oscar.PackageDropEventName, onPackageReceived);
    connectedPackageWatcher.watch(gPageState.receivingBoxId);
}

run();

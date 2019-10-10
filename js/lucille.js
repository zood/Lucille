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
          console.log(
            "ERROR: box id in fragment is the incorrect length",
            app.receivingBoxId.length
          );
          return false;
        }
        break;
      case "i":
        app.userId = sodium.from_hex(parts[1]);
        if (app.userId.length != zood.USER_ID_LENGTH) {
          console.log(
            "ERROR: user id in fragment is the incorrect length",
            app.userId.length
          );
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
    console.log(
      "Received a package from a drop box for which we're not interested",
      sodium.to_hex(pkg.boxId)
    );
    return;
  }
  let msgStr = String.fromCharCode.apply(this, pkg.bytes);
  let msgObj = JSON.parse(msgStr);
  let encData = {
    cipher_text: sodium.from_base64(msgObj.cipher_text, 1 /* ORIGINAL */),
    nonce: sodium.from_base64(msgObj.nonce, 1 /* ORIGINAL */)
  };
  let unencData = sodium.crypto_box_open_easy(
    encData.cipher_text,
    encData.nonce,
    app.senderPublicKey,
    app.secretKey
  );
  let locInfoStr = String.fromCharCode.apply(this, unencData);
  let locInfo = JSON.parse(locInfoStr);
  if (!locInfo.type) {
    console.log(
      "received package without a 'type'. Expecting LocationInfo, found: ",
      locInfoStr
    );
    return;
  }
  if (locInfo.type != "location_info") {
    console.log("unexpected message type:", locInfo.type);
    return;
  }
  console.log(locInfoStr);
  app.lastLocation = locInfo;
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
  } else {
    app.marker.setOptions({ position: pos });
  }
}
async function run() {
  console.log("run");
  if (!extractDataFromFragment()) {
    return;
  }
  let secretKeyElement = document.getElementById("secret_key");
  if (secretKeyElement) {
    secretKeyElement.innerText = sodium.to_hex(app.secretKey);
  }
  let usernameElement = document.getElementById("username");
  if (usernameElement) {
    usernameElement.innerText = app.username;
  }
  let boxIdElement = document.getElementById("box_id");
  if (boxIdElement) {
    boxIdElement.innerText = sodium.to_hex(app.receivingBoxId);
  }
  let userIdElement = document.getElementById("user_id");
  if (userIdElement) {
    userIdElement.innerText = sodium.to_hex(app.userId);
  }
  try {
    let client = new zood.Client(null);
    let pkr = await client.getUserPublicKey(app.userId);
    app.senderPublicKey = pkr.public_key;
    // console.log("got spk:", gPageState.senderPublicKey);
  } catch (err) {
    console.log("error retrieving public key: ", err);
    return;
  }
  try {
    let socket = new zood.DropBoxWatcher();
    socket.onPackageReceived = onPackageReceived;
    await socket.connect("wss://api.zood.xyz" /* production */);
    console.log("drop box watcher is connected");
    socket.watch(app.receivingBoxId);
  } catch (err) {
    console.log("error connecting drop box watcher", err);
    return;
  }
}

class Application {
	username: string;
	secretKey: Uint8Array;
	receivingBoxId: Uint8Array;
	userId: Uint8Array;
	senderPublicKey: Uint8Array;

	lastLocation: LocationInfo | null;

	map: google.maps.Map | null;
	marker: google.maps.Marker | null;

	constructor() {
		this.lastLocation = null;
		this.map = null;
		this.marker = null;
	}
}
const app = new Application();

interface EncryptedData {
	cipher_text: Uint8Array;
	nonce: Uint8Array;
}

interface PublicKeyResponse {
	public_key: string;
}

interface LocationInfo {
	accuracy: number;
	battery_charging: boolean;
	battery_level: number;
	bearing: number | null;
	latitude: number;
	longitude: number;
	movement: zood.MovementType | null;
	speed: number | null;
	time: number;
	type: string | null | undefined;
}

function extractDataFromFragment(): boolean {
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

function getBatteryClassName(level: number): string {
	let clazzName = "battery ";
	if (level >= 95) {
		clazzName += "battery-100";
	} else if (level >= 85) {
		clazzName += "battery-90";
	} else if (level >= 75) {
		clazzName += "battery-80";
	} else if (level >= 65) {
		clazzName += "battery-70";
	} else if (level >= 55) {
		clazzName += "battery-60";
	} else if (level >= 45) {
		clazzName += "battery-50";
	} else if (level >= 35) {
		clazzName += "battery-40";
	} else if (level >= 25) {
		clazzName += "battery-30";
	} else if (level >= 15) {
		clazzName += "battery-20";
	} else if (level >= 5) {
		clazzName += "battery-10";
	} else {
		clazzName += "battery-0";
	}

	return clazzName;
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

async function onPackageReceived(pkg: zood.Package) {
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
		cipher_text: sodium.from_base64(
			msgObj.cipher_text,
			sodium.base64_variants.ORIGINAL
		),
		nonce: sodium.from_base64(msgObj.nonce, sodium.base64_variants.ORIGINAL)
	} as EncryptedData;

	let unencData = sodium.crypto_box_open_easy(
		encData.cipher_text,
		encData.nonce,
		app.senderPublicKey,
		app.secretKey
	);
	let locInfoStr = String.fromCharCode.apply(this, unencData);
	let locInfo = JSON.parse(locInfoStr) as LocationInfo;
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

	let batteryPowerDiv = document.getElementById("battery-power") as HTMLDivElement;
	if (locInfo.battery_level != null) {
		batteryPowerDiv.innerText = `${locInfo.battery_level}%`;
	} else {
		batteryPowerDiv.innerText = "";
	}

	let updateTimeDiv = document.getElementById("update-time") as HTMLDivElement;
	let ago = zdtime.relativeTime(new Date().getTime(), locInfo.time, "en-US")
	updateTimeDiv.innerHTML = ` &nbsp; • &nbsp;  ${ago}`;

	let compass = document.getElementById("compass") as HTMLSpanElement;
	if (locInfo.bearing != null) {
		compass.style.display = "inline-block";
		compass.style.transform = `rotate(${locInfo.bearing}deg)`;
	} else {
		compass.style.display = "none";
	}

	let transportationMode = document.getElementById("transportation-mode") as HTMLImageElement;
	switch (locInfo.movement) {
		case zood.MovementType.Bicycle:
			transportationMode.src = "../images/activities/bike.svg";
			break;
		case zood.MovementType.OnFoot:
		case zood.MovementType.Running:
		case zood.MovementType.Walking:
			transportationMode.src = "../images/activities/walk.svg";
			break;
		case zood.MovementType.Vehicle:
			transportationMode.src = "../images/activities/car.svg";
			break;
		case null:
		default:
			transportationMode.src = ""
			break;
	}
	transportationMode.hidden = transportationMode.src == ""

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

	// set the battery level
	let batteryIcon = document.getElementById("battery-icon") as HTMLSpanElement;
	batteryIcon.className = getBatteryClassName(locInfo.battery_level);

	try {
		let rg = await locationiq.getReverseGeocoding(locInfo.latitude, locInfo.longitude);
		let addressElem = document.getElementById("address") as HTMLParagraphElement;
		addressElem.innerText = rg.getAddress();
	} catch (err) {
		console.log("failed to update address:", err)
	}
}

async function run() {
	console.log("run");
	if (!extractDataFromFragment()) {
		return;
	}

	let usernameSpans = document.getElementsByClassName("username") as HTMLCollectionOf<HTMLSpanElement>;
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
	} catch (err) {
		console.log("error retrieving public key: ", err);
		return;
	}

	try {
		let socket = new zood.DropBoxWatcher();
		socket.onPackageReceived = onPackageReceived;
		await socket.connect(zood.DropBoxServer.production);
		console.log("drop box watcher is connected");
		socket.watch(app.receivingBoxId);
	} catch (err) {
		console.log("error connecting drop box watcher", err);
		return;
	}
}

var gmaps;
(function (gmaps) {
    const apiRoot = "https://maps.googleapis.com/maps/api/";
    function getLocalityAddress(rg) {
        if (rg.status == null || rg.status != "OK") {
            return null;
        }
        for (let i = 0; i < rg.results.length; i++) {
            let r = rg.results[i];
            // check the types for 'locality', then 'political' as the fallback
            for (let j = 0; j < r.types.length; j++) {
                let t = r.types[j];
                if (t == "locality" || t == "political") {
                    return r.formatted_address;
                }
            }
        }
        return null;
    }
    gmaps.getLocalityAddress = getLocalityAddress;
    function getReverseGeocoding(lat, lng, lang) {
        return new Promise((resolve, reject) => {
            let latlng = lat + "," + lng;
            let req = new XMLHttpRequest();
            req.addEventListener("load", function () {
                if (req.status == 200) {
                    let obj = JSON.parse(req.response);
                    resolve(obj);
                }
                else {
                    reject("gmaps request failed: " + req.response);
                }
            });
            req.addEventListener("error", function (err) {
                reject("net error calling gmaps api: " + err);
            });
            req.open("GET", apiRoot + "geocode/json?latlng=" + latlng + "&language=" + lang);
            req.send();
        });
    }
    gmaps.getReverseGeocoding = getReverseGeocoding;
})(gmaps || (gmaps = {}));

namespace gmaps {
    const apiRoot = "https://maps.googleapis.com/maps/api/";

    interface Result {
        formatted_address: string;
        place_id: string;
        types: string[];
    }

    interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
    }

    interface ReverseGeocoding {
        status: string;
        results: Result[];
    }

    export function getLocalityAddress(rg: ReverseGeocoding): string | null {
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

    export function getReverseGeocoding(lat: number, lng: number, lang: string): Promise<ReverseGeocoding> {
        return new Promise<ReverseGeocoding>((resolve, reject) => {
            let latlng = lat + "," + lng;
            let req = new XMLHttpRequest();
            req.addEventListener("load", function () {
                if (req.status == 200) {
                    let obj = JSON.parse(req.response);
                    resolve(obj as ReverseGeocoding);
                } else {
                    reject("gmaps request failed: " + req.response);
                }
            })
            req.addEventListener("error", function (err: ErrorEvent) {
                reject("net error calling gmaps api: " + err);
            });
            req.open("GET", apiRoot + "geocode/json?latlng=" + latlng + "&language=" + lang);
            req.send();
        });
    }
}
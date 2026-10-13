namespace nominatim {
    // Usage policy: https://operations.osmfoundation.org/policies/nominatim/
    const apiBase = "https://nominatim.openstreetmap.org";

    export class ReverseGeocoding {

        private houseNumber: string | null;
        private road: string | null;
        private neighbourhood: string | null;
        private suburb: string | null;
        private city: string | null;
        private county: string | null;
        private state: string | null;
        private country: string | null;

        getAddress(): string {
            if (this.houseNumber != null && this.road != null && this.city != null) {
                return `${this.houseNumber} ${this.road}, ${this.city}`;
            }
            if (this.road != null && this.city != null) {
                return `${this.road}, ${this.city}`;
            }
            if (this.city != null && this.county != null) {
                return `${this.city}, ${this.county}`;
            }
            if (this.city != null && this.state != null) {
                return `${this.city}, ${this.state}`;
            }

            return this.getArea();
        }

        getArea(): string {
            if (this.neighbourhood != null) {
                return this.neighbourhood;
            }
            if (this.suburb != null) {
                return this.suburb;
            }
            if (this.city != null) {
                return this.city;
            }
            if (this.county != null) {
                return this.county;
            }
            if (this.state != null) {
                return this.state;
            }
            if (this.country != null) {
                return this.country;
            }

            return "";
        }

        static fromJson(json: any): ReverseGeocoding | null {
            // When there's no result, Nominatim responds with a 200 status and {"error": "..."}
            let addr = json["address"];
            if (addr == null || typeof addr !== "object") {
                return null;
            }

            let rg = new ReverseGeocoding();
            rg.houseNumber = zood.stringFromJson(addr, "house_number");
            rg.road = zood.stringFromJson(addr, "road");
            rg.neighbourhood = zood.stringFromJson(addr, "neighbourhood");
            rg.suburb = zood.stringFromJson(addr, "suburb");
            rg.city = zood.stringFromJson(addr, "city");
            rg.county = zood.stringFromJson(addr, "county");
            rg.state = zood.stringFromJson(addr, "state");
            rg.country = zood.stringFromJson(addr, "country");

            return rg;
        }
    }

    // Nominatim allows at most 1 request per second, and may block clients that repeatedly send
    // the same query, so requests are spaced out and the last result is reused.
    let nextRequestTime = 0;
    let lastKey: string | null = null;
    let lastResult: ReverseGeocoding | null = null;

    export async function getReverseGeocoding(lat: number, lon: number): Promise<ReverseGeocoding> {
        // 4 decimal places is about 11 meters, so GPS jitter doesn't cause a new query
        let key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        if (key == lastKey && lastResult != null) {
            return lastResult;
        }

        let now = Date.now();
        let requestTime = Math.max(now, nextRequestTime);
        nextRequestTime = requestTime + 1000;
        if (requestTime > now) {
            await new Promise(resolve => setTimeout(resolve, requestTime - now));
        }

        let endpoint = `${apiBase}/reverse?format=json&accept-language=en&lat=${lat}&lon=${lon}`;
        // Nominatim requires requests to identify the app. Browsers don't let us set the User-Agent,
        // so make sure our origin is sent as the Referer, whatever the page's referrer policy is.
        let response = await fetch(endpoint, {referrerPolicy: "strict-origin-when-cross-origin"});
        if (!response.ok) {
            throw `reverse geocoding failed with status ${response.status}`;
        }
        let rg = ReverseGeocoding.fromJson(await response.json());
        if (rg == null || rg.getAddress() == "") {
            throw "no address for location";
        }

        lastKey = key;
        lastResult = rg;
        return rg;
    }
}

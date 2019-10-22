namespace locationiq {
    var apiBase = "https://locationiq.org/v1";

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

        static fromHttpResponse(response: any): ReverseGeocoding | null {
            let json: any;
            try {
                json = JSON.parse(response);
            } catch (err) {
                return null;
            }

            return this.fromJson(json);
        }

        static fromJson(json: any): ReverseGeocoding | null {
            let rg = new ReverseGeocoding();
            try {
                let addr = json["address"];
                rg.houseNumber = zood.stringFromJson(addr, "house_number");
                rg.road = zood.stringFromJson(addr, "road");
                rg.neighbourhood = zood.stringFromJson(addr, "neighbourhood");
                rg.suburb = zood.stringFromJson(addr, "suburb");
                rg.city = zood.stringFromJson(addr, "city");
                rg.county = zood.stringFromJson(addr, "county");
                rg.state = zood.stringFromJson(addr, "state");
                rg.country = zood.stringFromJson(addr, "country");
            } catch (err) {
                return null;
            }

            return rg;
        }
    }

    export function getReverseGeocoding(lat: number, lon: number): Promise<ReverseGeocoding> {
        return new Promise<ReverseGeocoding>((resolve, reject) => {
            let req = new XMLHttpRequest();
            req.addEventListener("load", function () {
                if (req.status != 200) {
                    reject(req.response);
                    return;
                }

                let rg = ReverseGeocoding.fromHttpResponse(req.response);
                if (rg == null) {
                    reject("unknown error parsing ReverseGeocoding response");
                    return;
                }
                resolve(rg);
            });
            req.addEventListener("error", function () {
                reject("network error while getting ReverseGeocoding");
            })
            let endpoint = apiBase + "/reverse.php?format=json&key=1e1a87e550a1b8877e07&lat=" + lat.toString() + "&lon=" + lon.toString();
            req.open("GET", endpoint);
            req.send();
        });
    }
}
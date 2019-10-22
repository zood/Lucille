var locationiq;
(function (locationiq) {
    var apiBase = "https://locationiq.org/v1";
    class ReverseGeocoding {
        getAddress() {
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
        getArea() {
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
        static fromHttpResponse(response) {
            let json;
            try {
                json = JSON.parse(response);
            }
            catch (err) {
                return null;
            }
            return this.fromJson(json);
        }
        static fromJson(json) {
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
            }
            catch (err) {
                return null;
            }
            return rg;
        }
    }
    locationiq.ReverseGeocoding = ReverseGeocoding;
    function getReverseGeocoding(lat, lon) {
        return new Promise((resolve, reject) => {
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
            });
            let endpoint = apiBase + "/reverse.php?format=json&key=1e1a87e550a1b8877e07&lat=" + lat.toString() + "&lon=" + lon.toString();
            req.open("GET", endpoint);
            req.send();
        });
    }
    locationiq.getReverseGeocoding = getReverseGeocoding;
})(locationiq || (locationiq = {}));

namespace zdtime {
    export function relativeTime(nowMs: number, thenMs: number, locale: string): string {
        let msAgo = nowMs - thenMs;
        let oneDayMs = 86400 * 1000;

        let ago = ""
        if (msAgo < 60 * 1000) { // less than a minute ago
            ago = "Now";
        } else if (msAgo < 60 * 60 * 1000) { // less than an hour ago
            let minutes = msAgo / 1000 / 60;
            let minsStr = minutes.toLocaleString(locale, {
                style: "decimal",
                maximumFractionDigits: 0
            })
            ago = `${minsStr} min. ago`;
        } else if (msAgo < oneDayMs) {
            let hours = msAgo / 1000 / 60 / 60;
            let hourStr = hours.toLocaleString(locale, {
                style: "decimal",
                maximumFractionDigits: 0
            })
            ago = `${hourStr} hr. ago`
        } else if (msAgo < 7 * oneDayMs) {
            let days = msAgo / oneDayMs;
            let daysStr = days.toLocaleString(locale, {
                style: "decimal",
                maximumFractionDigits: 0
            })
            ago = `${daysStr} days ago`
        } else {
            let nowDate = new Date(thenMs);
            ago = nowDate.toLocaleDateString(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric"
            });
        }

        return ago;
    }
}

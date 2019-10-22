declare namespace Intl {
    function getCanonicalLocales(locales: string | string[]): string[];

    class RelativeTimeFormat {
        constructor(locale: string, options?: any);

        format(value: number, unit: FormatUnit): string;
    }

    type FormatUnit = "year" | "quarter" | "month" | "week" | "day" | "hour" | "minute" | "second";
}
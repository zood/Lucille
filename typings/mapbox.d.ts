/// <reference path="leaflet.d.ts" />

declare namespace L.mapbox {
    var accessToken: string;

    /**
     * Create and automatically configure a map with layers, markers, and interactivity.
     */
    function map(element: string, mapId?: string): L.Map;
}
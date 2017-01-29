declare namespace L {

    type EventHandlerFn = (event: Event) => void;
    type EventHandlerFnMap = { [type: string]: EventHandlerFn };

    interface Evented {
        /**
         * Adds a listener function (fn) to a particular event type of the object.
         * You can optionally specify the context of the listener (object the this
         * keyword will point to). You can also pass several space-separated types
         * (e.g. 'click dblclick').
         */
        on(type: string, fn: EventHandlerFn, context?: any): this;

        /**
         * Adds a set of type/listener pairs, e.g. {click: onClick, mousemove: onMouseMove}
         */
        on(eventMap: EventHandlerFnMap): this;

        /**
         * Removes a previously added listener function. If no function is specified,
         * it will remove all the listeners of that particular event from the object.
         * Note that if you passed a custom context to on, you must pass the same context
         * to off in order to remove the listener.
         */
        off(type: string, fn?: EventHandlerFn, context?: any): this;

        /**
         * Removes a set of type/listener pairs.
         */
        off(eventMap: EventHandlerFnMap): this;

        /**
         * Removes all listeners to all events on the object.
         */
        off(): this;

        /**
         * Fires an event of the specified type. You can optionally provide a data
         * object — the first argument of the listener function will contain its properties.
         * The event might can optionally be propagated to event parents.
         */
        fire(type: string, data?: any, propagate?: boolean): this;

        /**
         * Returns true if a particular event type has any listeners attached to it.
         */
        listens(type: string): boolean;

        /**
         * Behaves as on(...), except the listener will only get fired once and then removed.
         */
        once(type: string, fn: EventHandlerFn, context?: any): this;

        /**
         * Behaves as on(...), except the listener will only get fired once and then removed.
         */
        once(eventMap: EventHandlerFnMap): this;

        /**
         * Adds an event parent - an Evented that will receive propagated events
         */
        addEventParent(obj: Evented): this;

        /**
         * Removes an event parent, so it will stop receiving propagated events
         */
        removeEventParent(obj: Evented): this;

        /**
         * Alias for on(...)
         *
         * Adds a listener function (fn) to a particular event type of the object.
         * You can optionally specify the context of the listener (object the this
         * keyword will point to). You can also pass several space-separated types
         * (e.g. 'click dblclick').
         */
        addEventListener(type: string, fn: EventHandlerFn, context?: any): this;

        /**
         * Alias for on(...)
         *
         * Adds a set of type/listener pairs, e.g. {click: onClick, mousemove: onMouseMove}
         */
        addEventListener(eventMap: EventHandlerFnMap): this;

        /**
         * Alias for off(...)
         *
         * Removes a previously added listener function. If no function is specified,
         * it will remove all the listeners of that particular event from the object.
         * Note that if you passed a custom context to on, you must pass the same context
         * to off in order to remove the listener.
         */
        removeEventListener(type: string, fn: EventHandlerFn, context?: any): this;

        /**
         * Alias for off(...)
         *
         * Removes a set of type/listener pairs.
         */
        removeEventListener(eventMap: EventHandlerFnMap): this;

        /**
         * Alias for off()
         *
         * Removes all listeners to all events on the object.
         */
        clearAllEventListeners(): this;

        /**
         * Alias for once(...)
         *
         * Behaves as on(...), except the listener will only get fired once and then removed.
         */
        addOneTimeEventListener(type: string, fn: EventHandlerFn, context?: any): this;

        /**
         * Alias for once(...)
         *
         * Behaves as on(...), except the listener will only get fired once and then removed.
         */
        addOneTimeEventListener(eventMap: EventHandlerFnMap): this;

        /**
         * Alias for fire(...)
         *
         * Fires an event of the specified type. You can optionally provide a data
         * object — the first argument of the listener function will contain its properties.
         * The event might can optionally be propagated to event parents.
         */
        fireEvent(type: string, data?: any, propagate?: boolean): this;

        /**
         * Alias for listens(...)
         *
         * Returns true if a particular event type has any listeners attached to it.
         */
        hasEventListeners(type: string): boolean;
    }

    interface ZoomOptions {
        /**
         * If not specified, zoom animation will happen if the zoom origin is inside the current view. If true, the map will attempt animating zoom disregarding where zoom origin is. Setting false will make it always reset the view completely without animation.
         */
        animate?: boolean;
    }

    interface PanOptions {
        /**
         * If true, panning will always be animated if possible. If false, it will not animate panning, either resetting the map view if panning more than a screen away, or just setting a new offset for the map pane (except for `panBy` which always does the latter).
         */
        animate?: boolean;
        /**
         * Duration of animated panning.
         */
        duration?: boolean;
        /**
         * The curvature factor of panning animation easing (third parameter of the Cubic Bezier curve). 1.0 means linear animation, the less the more bowed the curve.
         */
        easeLinearity?: number;
        /**
         * If true, panning won't fire movestart event on start (used internally for panning inertia).
         */
        noMoveStart?: boolean;
    }

    interface ZoomPanOptions extends ZoomOptions, PanOptions {
    }

    /**
     * The central class of the API — it is used to create a map on a page and manipulate it.
     */
    class Map {

        /**
         * Sets the view of the map (geographical center and zoom) with the given animation options.
         */
        setView(center: L.LatLng, zoom?: number, opts?: ZoomPanOptions): this;
    }

    interface Layer extends Evented {
        /**
         * Adds the layer to the given map
         */
        addTo(map: L.Map): this;
        /**
         * Removes the layer from the map it is currently active on.
         */
        remove(): this;
        /**
         * Removes the layer from the given map
         */
        removeFrom(map: L.Map): this;

        /**
         * Binds a popup to the layer with the passed content and sets up the neccessary event listeners.
         */
        bindPopup(content: string | HTMLElement, opts?: PopupOptions): this;

        /**
         * Removes the popup previously bound with bindPopup.
         */
        unbindPopup(): this;

        /**
         * Returns the popup bound to this layer.
         */
        getPopup(): Popup;

        /**
         * Returns true if the popup bound to this layer is currently open.
         */
        isPopupOpen(): boolean;

        /**
         * Sets the HTML content of the popup of this layer.
         */
        setPopupContent(content: string | HTMLElement): this;

        /**
         * Opens the bound popup at the specificed latlng or at the default popup anchor if no latlng is passed.
         */
        openPopup(latLng?: LatLng): this;

        /**
         * Closes the popup bound to this layer if it is open.
         */
        closePopup(): this;

        /**
         * Opens or closes the popup bound to this layer depending on its current state.
         */
        togglePopup(): this;
    }

    /**
     * Represents a geographical point with a certain latitude and longitude.
     */
    interface LatLng {
        lat: number;
        lng: number;

        /**
         * Returns the distance (in meters) to the given LatLng calculated using the Haversine formula.
         */
        distanceTo(other: L.LatLng): number;

        /**
         * Returns true if the given LatLng point is at the same position (within a small margin of error).
         */
        equals(othr: L.LatLng): boolean;

        /**
         * Returns a string representation of the point (for debugging purposes).
         */
        toString(): string;

        /**
         * Returns a new LatLng object with the longitude wrapped around left and right boundaries (-180 to 180 by default).
         */
        wrap(left: number, right: number): L.LatLng;
    }

    /**
     * Creates an object representing a geographical point with the given latitude and longitude (and optionally altitude).
     */
    function latLng(lat: number, lng: number, altitude?: number): L.LatLng;

    /**
     * Represents a point with x and y coordinates in pixels.
     */
    interface Point {
        x: number;
        y: number;
    }

    /**
     * Creates a Point object with the given x and y coordinates. If optional round is set to true, rounds the x and y values.
     */
    function point(x: number, y: number, round?: boolean): Point;

    interface PopupOptions {
        maxWidth?: number;
        minWidth?: number;
        /**
         * If set, creates a scrollable container of the given height inside a popup if its content exceeds it.
         */
        maxHeight?: number;
        /**
         * Set it to false if you don't want the map to do panning animation to fit the opened popup.
         */
        autoPan?: boolean;
        /**
         * Set it to true if you want to prevent users from panning the popup off of the screen while it is open.
         */
        keepInView?: boolean;
        /**
         * Controls the presense of a close button in the popup.
         */
        closeButton?: boolean;
        /**
         * The offset of the popup position. Useful to control the anchor of the popup when opening it on some overlays.
         */
        offset?: Point;
        /**
         * The margin between the popup and the top left corner of the map view after autopanning was performed.
         */
        autoPanPaddingTopLeft?: Point;
        /**
         * The margin between the popup and the bottom right corner of the map view after autopanning was performed.
         */
        autoPanPaddingBottomRight?: Point;
        /**
         * Equivalent of setting both top left and bottom right autopan padding to the same value.
         */
        autoPanPadding?: Point;
        /**
         * Whether to animate the popup on zoom. Disable it if you have problems with Flash content inside popups.
         */
        zoomAnimation?: boolean;
        /**
         * Set it to false if you want to override the default behavior of the popup closing when user clicks the map (set globally by the Map closePopupOnClick option).
         */
        closeOnClick?: boolean;
        /**
         * A custom class name to assign to the popup.
         */
        className?: string;
    }

    interface Popup extends Layer {
        /**
         * Adds the popup to the map and closes the previous one. The same as map.openPopup(popup).
         */
        openOn(map: L.Map): this;
        /**
         * Sets the geographical point where the popup will open.
         */
        setLatLng(latlng: LatLng): this;
        /**
         * Returns the geographical point of popup.
         */
        getLatLng(): LatLng;
        /**
         * Sets the HTML content of the popup.
         */
        setContent(htmlContent: string | HTMLElement, opts?: PopupOptions): this;
        /**
         * Returns the content of the popup.
         */
        getContent(): string | HTMLElement;
        /**
         * Updates the popup content, layout and position. Useful for updating the popup after something inside changed, e.g. image loaded.
         */
        update(): this;
    }

    /**
     * Used to put markers on the map.
     */
    interface Marker extends Layer {
        /**
         * Returns the current geographical position of the marker.
         */
        getLatLng(): L.LatLng;

        /**
         * Changes the marker position to the given point.
         */
        setLatLng(latLng: L.LatLng): this;

        /**
         * Changes the zIndex offset of the marker.
         */
        setZIndexOffset(offset: number): this;

        /**
         * Changes the marker icon.
         */
        setIcon(icon: Icon): this;

        /**
         * Changes the opacity of the marker.
         */
        setOpacity(opacity: number): this;

        /**
         * Updates the marker position, useful if coordinates of its latLng object were changed directly.
         */
        update(): this;
    }

    interface Icon {

    }

    interface MarkerOptions {
        /**
         * Icon class to use for rendering the marker. See Icon documentation for details on how to customize the marker icon. Set to new L.Icon.Default() by default.
         */
        icon?: L.Icon;

        /**
         * If false, the marker will not emit mouse events and will act as a part of the underlying map.
         */
        clickable?: boolean;

        /**
         * Whether the marker is draggable with mouse/touch or not.
         */
        draggable?: boolean;

        /**
         * Whether the marker can be tabbed to with a keyboard and clicked by pressing enter.
         */
        keyboard?: boolean;

        /**
         * Text for the browser tooltip that appear on marker hover (no tooltip by default).
         */
        title?: string;

        /**
         * Text for the alt attribute of the icon image (useful for accessibility).
         */
        alt?: string;

        /**
         * By default, marker images zIndex is set automatically based on its latitude. Use this option if you want to put the marker on top of all others (or below), specifying a high value like 1000 (or high negative value, respectively).
         */
        zIndexOffset?: number;

        /**
         * The opacity of the marker.
         */
        opacity?: number;

        /**
         * If true, the marker will get on top of others when you hover the mouse over it.
         */
        riseOnHover?: boolean;

        /**
         * The z-index offset used for the riseOnHover feature.
         */
        riseOffset?: number;
    }

    function marker(latLng: L.LatLng, opts?: L.MarkerOptions): L.Marker;
}
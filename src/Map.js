import React, { useState, useEffect, useRef } from "react";
import {
    GoogleMap,
    useLoadScript,
    Circle,
    DirectionsRenderer,
    Marker,
    InfoWindow,
} from "@react-google-maps/api";

const containerStyle = {
    width: "100%",
    height: "100%",
};
const center = {
    lat: 52.4071663,
    lng: 13.019338,
};
const libraries = ["directions", "places"];

//////////////////////////////
const Map = props => {
    // const [directions, setDirections] = useState(null);
    // const [clickedPlaceIndex, setClickedPlaceIndex] = useState(-1);
    // const directionsService = () => {
    //     const DirectionsService = new window.google.maps.DirectionsService();
    //     DirectionsService.route(
    //         {
    //             origin: new window.google.maps.LatLng(52.4071663, 13.019338),
    //             destination: new window.google.maps.LatLng(
    //                 52.5396688,
    //                 13.291221
    //             ),
    //             travelMode: "WALKING",
    //         },
    //         directionsCallback
    //     );
    // };
    // const directionsCallback = response => {
    //     if (response !== null) {
    //         if (response.status === "OK") {
    //             setDirections(response);
    //         } else {
    //             console.log("response: ", response);
    //         }
    //     }
    // };
    // const renderInfoWindow = () => {
    //     let infoWIndow = null;
    //     const divStyle = {
    //         background: `white`,
    //         border: `1px solid #ccc`,
    //         padding: 15,
    //     };
    //     const place = places[clickedPlaceIndex];
    //     if (clickedPlaceIndex > -1) {
    //         infoWIndow = (
    //             <InfoWindow
    //                 position={place.geometry.location}
    //                 onCloseClick={() => setClickedPlaceIndex(-1)}
    //             >
    //                 <div style={divStyle}>
    //                     <h1>{place.name}</h1>
    //                 </div>
    //             </InfoWindow>
    //         );
    //     }
    //     return infoWIndow;
    // };
    // const onMarkerClick = ind => {
    //     setClickedPlaceIndex(ind);
    // };
    const allPoints = props.allPoints;
    const hoveredGalleryItemIndex = props.hoveredGalleryItemIndex;
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.REACT_APP_MAPS_API_KEY,
        libraries,
    });
    const photoPointOptions = {
        strokeColor: "#0000FF",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#0000FF",
        fillOpacity: 0.35,
        clickable: true,
        draggable: false,
        editable: false,
        visible: true,
        zIndex: 1,
    };

    const renderAllPoints = () => {
        return allPoints.map((point, ind) => {
            const pointCenter = {
                lat: Number(point.lat),
                lng: Number(point.lng),
            };
            if (point.is_natural === true) {
                return (
                    <Marker
                        key={ind}
                        position={pointCenter}
                        // onClick={() => onMarkerClick(ind)}
                    />
                );
            } else {
                const radius = point.radius * 1000 + 200;
                const options = { ...photoPointOptions, radius };

                return (
                    <Circle
                        key={
                            point.img_lat + point.img_lng + point.img_url || ind
                        }
                        center={pointCenter}
                        options={options}
                        onClick={e => console.log(ind)}
                        onMouseOver={() => props.handleMapPointMouseOver(ind)}
                        onMouseOut={() => props.handleMapPointMouseLeave(ind)}
                    />
                );
            }
        });
    };

    if (loadError) return "Error";
    if (!isLoaded) return "Loading...";

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            mapContainerClassName="mapContainer"
            center={center}
            zoom={10}
            onClick={e => props.onMapClick(e)}
        >
            <div
                id="googleMapsHack"
                style={{ width: "0px", height: "0px", display: "none" }}
            ></div>

            {allPoints.length && renderAllPoints()}

            {props.hoveredGalleryItemIndex && (
                <Marker
                    key={allPoints[hoveredGalleryItemIndex].id}
                    position={{
                        lat: Number(allPoints[hoveredGalleryItemIndex].lat),
                        lng: Number(allPoints[hoveredGalleryItemIndex].lng),
                    }}
                    // onClick={() => onMarkerClick(ind)}
                />
            )}

            {/* {directions !== null && (
                <DirectionsRenderer
                    // required
                    options={{
                        directions: directions,
                    }}
                    // optional
                    onLoad={directionsRenderer => {
                        console.log(
                            "DirectionsRenderer onLoad directionsRenderer: ",
                            directionsRenderer
                        );
                    }}
                    // optional
                    onUnmount={directionsRenderer => {
                        console.log(
                            "DirectionsRenderer onUnmount directionsRenderer: ",
                            directionsRenderer
                        );
                    }}
                />
            )} */}
        </GoogleMap>
    );
};
// export default Map;
export default React.memo(Map);

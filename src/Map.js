import React, { useState, useEffect, useRef } from "react";
import {
    GoogleMap,
    useLoadScript,
    Circle,
    DirectionsRenderer,
    Marker,
    InfoWindow,
} from "@react-google-maps/api";
import axios from "axios";
import search_nearby_mock_data from "./searchNearbyMock";
import mock_api_places_response from "./mockApiPlaceRes";

let _axios = axios.create({
    xsrfCookieName: "mytoken",
    xsrfHeaderName: "csrf-token",
});

const containerStyle = {
    width: "100%",
    height: "100%",
};
const center = {
    lat: 52.4071663,
    lng: 13.019338,
};
const libraries = ["directions", "places"];
const GMAPS_INITIAL_SEARCH_RADIUS_METERS = 200;

//////////////////////////////
const Map = () => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.REACT_APP_MAPS_API_KEY,
        libraries,
    });
    const isFirstRender = useRef(true);
    const [directions, setDirections] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [places, setPlaces] = useState([]);
    const [allPoints, setAllPoints] = useState([]);
    const [clickedPlaceIndex, setClickedPlaceIndex] = useState(-1);
    const [startingPoint, setStartingPoint] = useState({});
    const directionsCallback = response => {
        if (response !== null) {
            if (response.status === "OK") {
                setDirections(response);
            } else {
                console.log("response: ", response);
            }
        }
    };
    const directionsService = () => {
        const DirectionsService = new window.google.maps.DirectionsService();
        DirectionsService.route(
            {
                origin: new window.google.maps.LatLng(52.4071663, 13.019338),
                destination: new window.google.maps.LatLng(
                    52.5396688,
                    13.291221
                ),
                travelMode: "WALKING",
            },
            directionsCallback
        );
    };
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
    const onMapClick = async ({ latLng }) => {
        setStartingPoint({
            lat: latLng.lat(),
            lng: latLng.lng(),
        });
    };
    const onMarkerClick = ind => {
        setClickedPlaceIndex(ind);
    };
    const renderInfoWindow = () => {
        let infoWIndow = null;
        const divStyle = {
            background: `white`,
            border: `1px solid #ccc`,
            padding: 15,
        };
        const place = places[clickedPlaceIndex];
        if (clickedPlaceIndex > -1) {
            infoWIndow = (
                <InfoWindow
                    position={place.geometry.location}
                    onCloseClick={() => setClickedPlaceIndex(-1)}
                >
                    <div style={divStyle}>
                        <h1>{place.name}</h1>
                    </div>
                </InfoWindow>
            );
        }
        return infoWIndow;
    };

    useEffect(() => {
        if (isFirstRender.current === true) {
            isFirstRender.current = false;
            return;
        }

        async function fetchFlickr() {
            //photo is an array of photos (sic!)
            const {
                data: {
                    photos: { photo: photosArr },
                },
            } = await _axios(
                "https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=780c2a6ebd0a390c32d27af97a48da7c&content_type=1&media=photos&has_geo=1&geo_context=2&lat=52.84761308427492+&lon=13.378956684943416&radius=5&extras=geo%2Curl_o%2Curl_m&format=json&nojsoncallback=1"
            );
            // extras=owner_name%2Cdate_taken%2Cviews%2Ctags%2Cgeo%2Curl_o%2Curl_m
            setPhotos(photosArr);

            // return photosArr;
        }

        async function fetchGoogleMaps() {
            const NearbySearchService = new window.google.maps.places.PlacesService(
                // document.getElementsByClassName("mapContainer")[0]
                document.getElementById("foo")
            );
            const request = {
                location: new window.google.maps.LatLng(
                    startingPoint.lat,
                    startingPoint.lng
                ),
                radius: `${GMAPS_INITIAL_SEARCH_RADIUS_METERS}`,
            };
            const callback = (results, status) => {
                if (
                    status == window.google.maps.places.PlacesServiceStatus.OK
                ) {
                    setPlaces(results);
                    // return results;
                }
            };
            await NearbySearchService.nearbySearch(request, callback);
        }
        // setPlaces(search_nearby_mock_data);
        // setPlaces(fetchGoogleMaps());
        // setPhotos(fetchFlickr());

        fetchGoogleMaps();
        fetchFlickr();

        setAllPoints(mock_api_places_response);
    }, [startingPoint]);

    useEffect(() => {
        if (photos.length > 0 && places.length > 0) {
            (async () => {
                console.log("Places.length:", places.length);
                console.log("POINTS:", places);
                const { data: allPoints } = await _axios.post("/api/place", {
                    points: places,
                    images: photos.slice(0, 25),
                });
                setAllPoints(allPoints);
                console.log(JSON.stringify(allPoints[0]));
            })();
        }
    }, [photos, places]);

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
                // console.log("### ", ind);
                const radius = point.radius * 1000 + 200;
                // const radius = 1000;
                const options = { ...photoPointOptions, radius };
                // ind === 19 &&
                //     console.log(`${ind}: ${JSON.stringify(pointCenter)}`);

                return (
                    <Circle
                        key={
                            point.img_lat + point.img_lng + point.img_url || ind
                        }
                        center={pointCenter}
                        options={options}
                        onClick={e => console.log(ind)}
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
            onClick={e => onMapClick(e)}
        >
            <div
                id="foo"
                style={{ width: "0px", height: "0px", display: "none" }}
            ></div>
            {/* {renderInfoWindow()} */}
            {/* {allPoints.length &&
                allPoints.map((point, ind) => {
                    const pointCenter = {
                        lat: Number(point.lat),
                        lng: Number(point.lng),
                    };
                    if (point.is_natural !== true) {
                        return (
                            <Marker
                                key={ind}
                                position={pointCenter}
                                // onClick={() => onMarkerClick(ind)}
                            />
                        );
                    }
                })} */}
            {allPoints.length && renderAllPoints()}
            {/* {places.length > 0 &&
                places.map((place, ind) => {
                    return (
                        <Marker
                            key={place.id}
                            position={place.geometry.location}
                            onClick={() => onMarkerClick(ind)}
                        />
                    );
                })} */}
            {/* {random_point_berlin.map(point => {
                const pointCenter = {
                    lat: point.lat,
                    lng: point.lng,
                };
                const radius = point.place_id.endsWith("s") ? 500 : 250;
                const options = { ...photoPointOptions, radius };

                return (
                    <Circle
                        key={point.lat + point.lng}
                        center={pointCenter}
                        options={options}
                        onClick={e => console.log(point.place_id)}
                    />
                );
            })} */}

            {directions !== null && (
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
            )}
        </GoogleMap>
    );
};
// export default Map;

export default React.memo(Map);

// point_of_interest

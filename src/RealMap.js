import React, { useState, useEffect, useRef } from "react";
import {
    GoogleMap,
    useLoadScript,
    Circle,
    Marker,
    InfoWindow,
} from "@react-google-maps/api";
import axios from "./axios";

const containerStyle = {
    width: "100%",
    height: "100%",
};
const center = {
    lat: 52.4071663,
    lng: 13.019338,
};
const libraries = ["directions", "places"];
const GMAPS_INITIAL_SEARCH_RADIUS_METERS = 5000;

const fetchGoogleMaps = (startingPoint) => {
    return new Promise((resolve, reject) => {
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
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                resolve(results);
            } else {
                reject("No data successfully retrieved");
            }
        };
        NearbySearchService.nearbySearch(request, callback);
    });
};

//////////////////////////////
const Map = ({ setImages }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.REACT_APP_MAPS_API_KEY,
        libraries,
    });
    const isFirstRender = useRef(true);
    const [photos, setPhotos] = useState([]);
    const [places, setPlaces] = useState([]);
    const [allPoints, setAllPoints] = useState([]);
    const [clickedPlaceIndex, setClickedPlaceIndex] = useState(-1);
    const [startingPoint, setStartingPoint] = useState({});

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
        const initialLocation = {
            lat: latLng.lat(),
            lng: latLng.lng(),
        };
        // set marker on starting point
        setStartingPoint(initialLocation);
        // send req to flickr with lat/lng
        const {
            data: {
                photos: { photo: photosArr },
            },
        } = await axios(
            `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=780c2a6ebd0a390c32d27af97a48da7c&content_type=1&media=photos&has_geo=1&geo_context=2&lat=${initialLocation.lat}+&lon=${initialLocation.lng}&radius=5&extras=geo%2Curl_o%2Curl_m&format=json&nojsoncallback=1`
        );

        // send req to gmaps api with lat/lng
        const points = await fetchGoogleMaps(initialLocation);
        // send both arrays to backend api POST /place
        console.log("both apis", {
            points: points,
            images: photosArr,
        });
        const { data: allPoints } = await axios.post("/api/place", {
            points: points,
            images: photosArr,
        });

        console.log("allPoints", allPoints);
        setAllPoints(allPoints);
        // set points from backend to state
        setPlaces();
        // set images to state
        setImages(allPoints);
    };
    const onMarkerClick = (ind) => {
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
                        onClick={(e) => console.log(ind)}
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
            onClick={(e) => onMapClick(e)}
        >
            <div
                id="foo"
                style={{ width: "0px", height: "0px", display: "none" }}
            ></div>
            {allPoints.length && renderAllPoints()}
        </GoogleMap>
    );
};
// export default Map;

export default React.memo(Map);

// point_of_interest

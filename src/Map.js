import React, { useState, useEffect, useRef } from "react";
import {
    GoogleMap,
    useLoadScript,
    Circle,
    Marker,
    InfoWindow,
} from "@react-google-maps/api";
import axios from "./axios";
import mockDataPoints from "./mockApiPlaceRes";
import mapStyles from "./mapStyles";

const containerStyle = {
    width: "100%",
    height: "100%",
};
const options = {
    styles: mapStyles,
    disableDefaultUI: true,
    zoomControl: true,
};
const center = {
    lat: 52.4071663,
    lng: 13.019338,
};
const libraries = ["directions", "places"];
const GMAPS_INITIAL_SEARCH_RADIUS_METERS = 5000;

const fetchGoogleMaps = startingPoint => {
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
const sortPhotosByPoints = points => {
    const pointsToMap = {};
    for (let i = 0; i < points.length; i++) {
        if (points[i].id && pointsToMap[points[i].id]) {
        } else {
            pointsToMap[points[i].id] = points[i];
        }
    }
    console.log("sorted photos:", pointsToMap);
    return pointsToMap;
};

//////////////////////////////
const Map = ({ setImages, hoveredPointId }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.REACT_APP_MAPS_API_KEY,
        libraries,
    });
    const mapRef = React.useRef();
    const onMapLoad = React.useCallback(map => {
        mapRef.current = map;
    }, []);
    const panTo = React.useCallback(({ lat, lng }) => {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(13);
    }, []);
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
        // ###### FOR TESTING #######
        // setImages(mockDataPoints);
        // setAllPoints(mockDataPoints);
        // return;

        const initialLocation = {
            lat: latLng.lat(),
            lng: latLng.lng(),
        };

        panTo(initialLocation);
        // set marker on starting point
        setStartingPoint(initialLocation);
        // send req to flickr with lat/lng
        const {
            data: {
                photos: { photo: photosArr },
            },
        } = await axios("https://www.flickr.com/services/rest", {
            params: {
                method: "flickr.photos.search",
                api_key: process.env.REACT_APP_FLICKR_API_KEY,
                content_type: "1",
                media: "photos",
                has_geo: "1",
                geo_context: "2",
                lat: startingPoint.lat,
                lon: startingPoint.lng,
                radius: "5",
                extras: "geo,url_o,url_m",
                format: "json",
                nojsoncallback: "1",
            },
        });

        // send req to gmaps api with lat/lng
        const points = await fetchGoogleMaps(initialLocation);
        // send both arrays to backend api POST /place
        console.log("both apis", {
            points: points,
            images: photosArr,
        });
        const { data: allPoints } = await axios.post("/api/place", {
            points: points.slice(0, 25),
            images: photosArr.slice(0, 50),
        });

        console.log("allPoints", JSON.stringify(allPoints));
        setAllPoints(allPoints);
        // set points from backend to state

        // set images to state
        setImages(allPoints);
    };
    const onMarkerClick = ind => {
        setClickedPlaceIndex(ind);
    };
    const renderInfoWindow = point => {
        let infoWindow = null;
        const divStyle = {
            background: `white`,
            border: `1px solid #ccc`,
            padding: 15,
        };
        const pointCenter = {
            lat: Number(point.lat),
            lng: Number(point.lng),
        };
        console.log(point);
        // const place = places[clickedPlaceIndex];
        // if (clickedPlaceIndex > -1) {
        infoWindow = (
            <InfoWindow
                position={pointCenter}
                // onCloseClick={() => setClickedPlaceIndex(-1)}
            >
                <div style={divStyle}>
                    <h1>{point.id}</h1>
                </div>
            </InfoWindow>
        );
        // }
        return infoWindow;
    };

    const renderAllPoints = () => {
        const bounds = new window.google.maps.LatLngBounds();
        const elements = Object.keys(allPoints).map((pointId, ind) => {
            const point = allPoints[pointId];
            const pointCenter = {
                lat: Number(point.lat),
                lng: Number(point.lng),
            };
            if (
                pointCenter.lat > 45 &&
                pointCenter.lat < 55 &&
                pointCenter.lng > 8 &&
                pointCenter.lng < 15
            )
                bounds.extend(pointCenter);
            // if (ind === 0) console.log(pointCenter);

            if (point.is_natural === true) {
                return (
                    <Marker
                        key={point.id}
                        position={pointCenter}
                        onClick={() => panTo(pointCenter)}

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
                        key={point.id}
                        center={pointCenter}
                        options={options}
                        onClick={() => panTo(pointCenter)}
                    />
                );
            }
        });

        mapRef.current.fitBounds(bounds);

        return elements;
    };

    if (loadError) return "Error";
    if (!isLoaded) return "Loading...";

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            mapContainerClassName="mapContainer"
            center={center}
            zoom={10}
            options={options}
            onClick={e => onMapClick(e)}
            onLoad={onMapLoad}
        >
            <div
                id="foo"
                style={{ width: "0px", height: "0px", display: "none" }}
            ></div>
            {hoveredPointId && renderInfoWindow(allPoints[hoveredPointId])}
            {Object.keys(allPoints).length > 0 && renderAllPoints()}
        </GoogleMap>
    );
};
// export default Map;

export default React.memo(Map);

// point_of_interest

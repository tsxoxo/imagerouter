import React, { useState, useRef, useEffect } from "react";
import CssBaseline from "@material-ui/core/CssBaseline";

import "./App.css";

import Map from "./Map";
import Gallery from "./Gallery";
import {
    AppBar,
    Toolbar,
    Typography,
    Grid,
    Container,
} from "@material-ui/core";

import search_nearby_mock_data from "./searchNearbyMock";
import mock_api_places_response from "./mockApiPlaceRes";

import axios from "axios";

let _axios = axios.create({
    xsrfCookieName: "mytoken",
    xsrfHeaderName: "csrf-token",
});

const GMAPS_INITIAL_SEARCH_RADIUS_METERS = 200;

function App() {
    const [startingPoint, setStartingPoint] = useState({});
    const [photos, setPhotos] = useState([]);
    const [places, setPlaces] = useState([]);
    const [allPoints, setAllPoints] = useState([]);
    const [hoveredGalleryItemIndex, setHoveredGalleryItemIndex] = useState(
        null
    );
    const [hoveredMapPointIndex, setHoveredMapPointIndex] = useState(null);
    const isFirstRender = useRef(true);

    const onMapClick = async ({ latLng }) => {
        setStartingPoint({
            lat: latLng.lat(),
            lng: latLng.lng(),
        });
    };
    const handleGalleryItemMouseEnter = ind => {
        setHoveredGalleryItemIndex(ind);
    };
    const handleGalleryItemMouseLeave = () => {
        setHoveredGalleryItemIndex(null);
    };
    const handleMapPointMouseOver = ind => {
        setHoveredMapPointIndex(ind);
    };
    const handleMapPointMouseLeave = () => {
        console.log("leavin");
        setHoveredMapPointIndex(null);
    };

    useEffect(() => {
        if (isFirstRender.current === true) {
            setAllPoints(mock_api_places_response);
            isFirstRender.current = false;
            return;
        }

        async function fetchFlickr() {
            //photo is an array of photos (sic!)
            const {
                data: {
                    photos: { photo: photosArr },
                },
            } = await _axios("https://www.flickr.com/services/rest", {
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
            // extras=owner_name%2Cdate_taken%2Cviews%2Ctags%2Cgeo%2Curl_o%2Curl_m
            setPhotos(photosArr);

            // return photosArr;
        }
        async function fetchGoogleMaps() {
            const NearbySearchService = new window.google.maps.places.PlacesService(
                // document.getElementsByClassName("mapContainer")[0]
                document.getElementById("googleMapsHack")
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

        fetchGoogleMaps();
        fetchFlickr();

        // setAllPoints(mock_api_places_response);
    }, [startingPoint]);

    useEffect(() => {
        if (photos.length > 0 && places.length > 0) {
            (async () => {
                console.log("Places.length:", places.length);
                console.log("photoslength:", photos.length);
                const { data: allPoints } = await _axios.post("/api/place", {
                    points: places,
                    images: photos.slice(0, 25),
                });
                setAllPoints(allPoints);
                console.log("### allPoints from /place ###");
                console.log(allPoints);
            })();
        }
    }, [photos, places]);

    return (
        <>
            <CssBaseline />
            <Grid container style={{ height: "100%" }}>
                <Grid item sm={12}>
                    <AppBar position="static">
                        <Toolbar>
                            <Typography style={{ flexGrow: 1 }} variant="h4">
                                ImageRouter
                            </Typography>
                            <nav
                                style={{
                                    // width: 500,
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                }}
                            >
                                My Routes
                            </nav>
                        </Toolbar>
                    </AppBar>
                </Grid>
                <Grid container>
                    <Grid item sm={4}>
                        <Gallery
                            places={allPoints}
                            handleGalleryItemMouseEnter={
                                handleGalleryItemMouseEnter
                            }
                            handleGalleryItemMouseLeave={
                                handleGalleryItemMouseLeave
                            }
                            hoveredMapPointIndex={hoveredMapPointIndex}
                        />
                    </Grid>
                    <Grid item sm={8}>
                        <Map
                            onMapClick={onMapClick}
                            allPoints={allPoints}
                            hoveredGalleryItemIndex={hoveredGalleryItemIndex}
                            handleMapPointMouseOver={handleMapPointMouseOver}
                            handleMapPointMouseLeave={handleMapPointMouseLeave}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </>
    );
}

export default App;

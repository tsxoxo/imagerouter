const router = require("express").Router();
const db = require("../db");
const { distance, isSuperset, eqSet, sleep } = require("../utils");
const cryptoRandomString = require("crypto-random-string");

router.get("/", async (req, res) => {
    try {
        const { rows } = await db.readPlaces({});
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

router.post("/", async (req, res) => {
    // get data from frontend
    // {points: [GOOGLE POINTS], images: [FLICKR IMAGES]}
    const allPoints = {
        places: req.body.points.map((place) => place.place_id),
        images: req.body.images.map((image) => image.url_m),
    };

    const points = req.body.points;
    let images = req.body.images;
    let alreadySavedImages = await db.readAllImages();
    alreadySavedImages = alreadySavedImages.rows.map(
        (savedImage) => savedImage.image
    );
    // remove images already inserted into DB
    images = images.filter(
        (image) => !alreadySavedImages.includes(image.url_m)
    );

    // save google places to DB
    points.map(async (point) => {
        const {
            name,
            geometry: {
                location: { lat, lng },
            },
            types,
            place_id,
        } = point;

        console.log("points map", types);
        if (
            types.length === 0 ||
            types.find((type) =>
                [
                    "tourist_attraction",
                    "amusement_park",
                    "aquarium",
                    "art_gallery",
                    "church",
                    "zoo",
                    "synagogue",
                    "park",
                    "museum",
                    "mosque",
                ].includes(type)
            )
        ) {
            try {
                await db.createPlace({
                    id: place_id,
                    name,
                    lat,
                    lng,
                    tags: types,
                    is_natural: true,
                    radius: 0,
                });
            } catch (err) {
                // console.log("createPlace", err.message);
            }
        }
    });

    // get all current places
    const { rows } = await db.readPlaces({});
    const places = rows;

    // create obj to access the images more targeted
    const imagesObj = images.reduce((cur, val) => {
        cur[val.id] = val;
        return cur;
    }, {});

    const newPoints = new Set();
    // attribute images to existing places
    places.forEach((place) => {
        images.forEach(async (image) => {
            if (
                distance(
                    place.lat,
                    place.lng,
                    image.latitude,
                    image.longitude
                ) < 0.5
            ) {
                try {
                    await db.createImage({
                        place_id: place.id,
                        image: image.url_m,
                        lat: image.latitude,
                        lng: image.longitude,
                        title: image.title,
                    });
                } catch (err) {
                    // console.log("createImage", err.message);
                }
            } else {
                // if there are no previously saved places to
                // attribute the image to, then add to list of newPoints to save as Places
                newPoints.add(JSON.stringify(image));
            }
        });
    });

    const newClusteredPoints = [];

    // bundle points into clusters of points
    [...newPoints].map((point, index) => {
        point = JSON.parse(point);
        newClusteredPoints.push(new Set([point.id]));

        newPoints.forEach((otherPoint) => {
            otherPoint = JSON.parse(otherPoint);

            if (
                distance(
                    point.latitude,
                    point.longitude,
                    otherPoint.latitude,
                    otherPoint.longitude
                ) < 0.5 &&
                point.id !== otherPoint.id
            ) {
                newClusteredPoints[index].add(otherPoint.id);
            }
        });
    });

    // find which clusters are subsets that need removal
    const clustersToRemove = new Set();
    newClusteredPoints.forEach((cluster) => {
        newClusteredPoints.forEach((otherCluster) => {
            if (
                isSuperset(cluster, otherCluster) &&
                !eqSet(cluster, otherCluster)
            ) {
                clustersToRemove.add(JSON.stringify([...otherCluster]));
            }
        });
    });

    // save clusters as places and add images to those places
    await [...newClusteredPoints].map(async (cluster) => {
        let newPlace;

        // if cluster is not in clustersToRemove saved to DB
        if (!clustersToRemove.has(JSON.stringify([...cluster]))) {
            // get radius by getting the distance between the 2 furthest points within the cluster
            let maxDistance = 0;
            if (cluster.size > 1) {
                cluster.forEach((pointId) => {
                    cluster.forEach((otherPointId) => {
                        const distanceAtoB = distance(
                            imagesObj[pointId].latitude,
                            imagesObj[pointId].longitude,
                            imagesObj[otherPointId].latitude,
                            imagesObj[otherPointId].longitude
                        );
                        if (distanceAtoB > maxDistance) {
                            maxDistance = distanceAtoB;
                        }
                    });
                });
            }
            // pick the first point as the central location of the place
            let centralPoint = imagesObj[[...cluster][0]];

            // save to place to DB
            try {
                const { rows } = await db.createPlace({
                    id: cryptoRandomString({
                        length: 10,
                    }),
                    lat: centralPoint.latitude,
                    lng: centralPoint.longitude,
                    is_natural: false,
                    radius: maxDistance,
                });
                newPlace = rows[0];
            } catch (err) {
                // console.log(err.message);
            }

            // insert images to DB connecting to saved Point
            const filteredImages = images.filter((image) => {
                return [...cluster].includes(image.id);
            });

            await Promise.all(
                filteredImages.map(async (image) => {
                    try {
                        await db.createImage({
                            place_id: newPlace.id,
                            image: image.url_m,
                            lat: image.latitude,
                            lng: image.longitude,
                            title: image.title,
                        });
                    } catch (err) {
                        // console.log(err.message);
                    }
                })
            );
        }
    });

    // due to the async calls for adding the images to places
    // not really stopping on the await, sleep just to make sure all
    // of them are added before getting all places
    sleep(10000);
    let allPointsData = await db.getRequestedPlacesAndImages(allPoints);
    allPointsData = allPointsData.rows;
    const allPointsToSend = {};
    for (let i = 0; i < allPointsData.length; i++) {
        if (!allPointsToSend[allPointsData[i].id]) {
            allPointsToSend[allPointsData[i].id] = {
                ...allPointsData[i],
                images: [allPointsData[i]],
            };
        } else {
            allPointsToSend[allPointsData[i].id].images.push(allPointsData[i]);
        }
    }

    return res.json(allPointsToSend);
});

router.get("/:id", async (req, res) => {
    try {
        const { rows } = await db.readPlace({
            id: req.params.id,
        });
        return res.json(rows[0]);
    } catch (err) {
        // console.log(err.message);
    }
});

router.get("/:id/images", async (req, res) => {
    try {
        const { rows } = await db.readPlaceImages({
            place_id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        // console.log(err.message);
    }
});

router.get("/:id/reviews", async (req, res) => {
    try {
        const { rows } = await db.readReviews({
            place_id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

router.post("/:id", async (req, res) => {
    try {
        const { name, tags } = req.body;
        const { rows } = await db.updatePlace({
            id: req.session.userId,
            name,
            tags,
        });
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

router.post("/:id/image", async (req, res) => {
    try {
        const { image, lat, lng } = req.body;
        const { rows } = await db.createImage({
            place_id: req.params.id,
            image,
            lat,
            lng,
        });
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

router.post("/:id/review", async (req, res) => {
    try {
        const { text, rating } = req.body;
        const { rows } = await db.createReview({
            place_id: req.params.id,
            text,
            rating,
        });
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

router.delete("/:id", async (req, res) => {
    try {
        await db.deletePlace({ id: req.params.id });
        return res.sendStatus(204);
    } catch (err) {
        console.log(err);
    }
});

module.exports = router;

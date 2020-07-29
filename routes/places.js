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
    const pointsThatWillBeSaved = {};

    const points = req.body.points;
    let images = req.body.images;

    // save google places to DB
    points.map((point) => {
        const {
            name,
            geometry: {
                location: { lat, lng },
            },
            types,
            place_id,
        } = point;

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
            // save natural point to res obj
            pointsThatWillBeSaved[place_id] = {
                id: place_id,
                name,
                lat,
                lng,
                tags: types,
                is_natural: true,
                radius: 0,
            };
            db.createPlace({
                id: place_id,
                name,
                lat,
                lng,
                tags: types,
                is_natural: true,
                radius: 0,
            });
        }
    });

    // create obj to access the images more targeted
    const imagesObj = images.reduce((cur, val) => {
        cur[val.id] = val;
        return cur;
    }, {});

    const newPoints = new Set();
    // attribute images to existing places
    points.forEach((place) => {
        images.forEach((image) => {
            if (
                distance(
                    place.lat,
                    place.lng,
                    image.latitude,
                    image.longitude
                ) < 0.1
            ) {
                // attach image to natural point on res obj
                if (pointsThatWillBeSaved[place.id].images) {
                    pointsThatWillBeSaved[place.id].images.push({
                        place_id: place.id,
                        image: image.url_m,
                        lat: image.latitude,
                        lng: image.longitude,
                        title: image.title,
                    });
                } else {
                    pointsThatWillBeSaved[place.id].images = [
                        {
                            place_id: place.id,
                            image: image.url_m,
                            lat: image.latitude,
                            lng: image.longitude,
                            title: image.title,
                        },
                    ];
                }
                db.createImage({
                    place_id: place.id,
                    image: image.url_m,
                    lat: image.latitude,
                    lng: image.longitude,
                    title: image.title,
                });
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
                ) < 0.1 &&
                point.id !== otherPoint.id
            ) {
                newClusteredPoints[index].add(otherPoint.id);
            }
        });
    });

    // find which clusters are subsets that need removal
    const clustersToRemove = new Set();
    newClusteredPoints.forEach((cluster, index1) => {
        newClusteredPoints.forEach((otherCluster, index2) => {
            if (index1 !== index2) {
                if (
                    isSuperset(cluster, otherCluster) ||
                    eqSet(cluster, otherCluster)
                ) {
                    clustersToRemove.add(JSON.stringify([...otherCluster]));
                }
            }
        });
    });

    // save clusters as places and add images to those places
    [...newClusteredPoints].map((cluster) => {
        // if cluster is not in clustersToRemove saved to DB
        if (!clustersToRemove.has(JSON.stringify([...cluster]))) {
            // console.log("cluster after", cluster);
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
            const randomString = cryptoRandomString({
                length: 10,
            });
            pointsThatWillBeSaved[randomString] = {
                id: randomString,
                lat: centralPoint.latitude,
                lng: centralPoint.longitude,
                is_natural: false,
                radius: maxDistance,
            };

            // save to place to DB
            const { rows } = db.createPlace({
                id: randomString,
                lat: centralPoint.latitude,
                lng: centralPoint.longitude,
                is_natural: false,
                radius: maxDistance,
            });

            // insert images to DB connecting to saved Point
            const filteredImages = images.filter((image) => {
                return [...cluster].includes(image.id);
            });

            filteredImages.map((image) => {
                if (!pointsThatWillBeSaved[randomString].images) {
                    pointsThatWillBeSaved[randomString].images = [
                        {
                            id: randomString,
                            img_url: image.url_m,
                            imag_lat: image.latitude,
                            img_lng: image.longitude,
                            img_title: image.title,
                        },
                    ];
                } else {
                    pointsThatWillBeSaved[randomString].images.push({
                        id: randomString,
                        img_url: image.url_m,
                        imag_lat: image.latitude,
                        img_lng: image.longitude,
                        img_title: image.title,
                    });
                }
            });
            filteredImages.map((image) => {
                try {
                    db.createImage({
                        place_id: randomString,
                        image: image.url_m,
                        lat: image.latitude,
                        lng: image.longitude,
                        title: image.title,
                    });
                } catch (err) {
                    // console.log(err.message);
                }
            });
        }
    });

    return res.json(pointsThatWillBeSaved);
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

const router = require("express").Router();
const db = require("../db");
const { distance, isSuperset, eqSet } = require("../utils");
const cryptoRandomString = require("crypto-random-string");

// PLACES
router.get("/", async (req, res) => {
    try {
        const { rows } = await db.readPlaces();
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

router.post("/", async (req, res) => {
    // get data from frontend
    // [[GOOGLE POINTS],[FLICKR IMAGES]]
    const points = req.body.points.results;
    const images = req.body.images;

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

        try {
            await db.createPlace({
                id: place_id,
                name,
                lat,
                lng,
                tags: types,
                is_natural: true,
            });
        } catch (err) {
            console.log(err);
        }
    });
    // get all current places
    const { rows } = await db.readPlaces({});
    const places = rows;

    const oldPoints = new Set();
    const newPoints = new Set();
    const imagesObj = images.reduce((cur, val) => {
        cur[val.id] = val;
        return cur;
    }, {});
    console.log("imagesObj", imagesObj);

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
                    const imageDB = await db.createImage({
                        place_id: place.id,
                        image: image.url_m,
                        lat: image.latitude,
                        lng: image.longitude,
                        title: image.title,
                    });
                    oldPoints.add(imageDB.place_id);
                } catch (err) {
                    console.log(err);
                }
            } else {
                newPoints.add(JSON.stringify(image));
            }
        });
    });

    const newClusteredPoints = [];

    // bundle new clusters of points
    newPoints.forEach((point, index) => {
        point = JSON.parse(point);
        newClusteredPoints.push(new Set([point.id]));
        newPoints.forEach((otherPoint) => {
            otherPoint = JSON.parse(otherPoint);
            if (
                distance(point.lat, point.lng, otherPoint.lat, otherPoint.lng) <
                0.5
            ) {
                newClusteredPoints[index].add(otherPoint.id);
            }
        });
    });
    console.log("[...newClusteredPoints]", [...newClusteredPoints]);

    // find which clusters are subsets that need removal
    const clustersToRemove = new Set(); // {[1,2],[2,3], [3,4,5]}
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
    console.log("clustersToRemove", clustersToRemove);

    // remove unnecessary clusters
    const savedNewPoints = [...newClusteredPoints].map(async (cluster) => {
        let newPlace;
        // if cluster is not in clustersToRemove
        if (![...clustersToRemove].includes(JSON.stringify(cluster))) {
            // save to place to DB
            let maxDistance = 0;
            if (cluster.size > 1) {
                cluster.forEach((pointId) => {
                    cluster.forEach((otherPointId) => {
                        const distanceAtoB = distance(
                            imagesObj[pointId].lat,
                            imagesObj[pointId].lng,
                            imagesObj[otherPointId].lat,
                            imagesObj[otherPointId].lng
                        );
                        if (distanceAtoB > maxDistance) {
                            maxDistance = distanceAtoB;
                        }
                    });
                });
            }

            let centralPoint = imagesObj[[...cluster][0]];
            console.log("centralPoint", centralPoint);

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
                console.log(err);
            }
            // insert images to DB connecting to saved Point
            const savedImages = await images.map(async (image) => {
                if ([...cluster].includes(image.id)) {
                    const { rows } = await db.createImage({
                        place_id: newPlace.id,
                        image: image.url_m,
                        lat: image.latitude,
                        lng: image.longitude,
                    });
                    return rows[0];
                }
            });
            return { place: newPlace, images: savedImages };
        }
    });
    const placesData = await db.readPlaces({ places: [...oldPoints] });
    const imageData = await db.readPlaceImages({ places: [...oldPoints] });
    const oldPointsData = placesData.rows.map((place) => {
        const images = imageData.rows.filter(
            (image) => image.place_id === place.id
        );
        return { place, images };
    });
    return { places: [...oldPointsData, ...savedNewPoints] };
});

router.get("/:id", async (req, res) => {
    try {
    } catch (err) {
        console.log(err);
    }
});

router.get("/:id/images", async (req, res) => {
    try {
        const { rows } = await db.readPlaceImages({
            place_id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        console.log(err);
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

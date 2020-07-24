const express = require("express");
const app = express();
const compression = require("compression");
const csurf = require("csurf");
const cookieSession = require("cookie-session");
const helmet = require("helmet");
const cryptoRandomString = require("crypto-random-string");
const { sendEmail } = require("./ses");
const { uploadFileS3, deleteFolderS3 } = require("./s3");
const { uploader } = require("./multer");
const cors = require("cors");
require("dotenv").config();

const { hashPassword, comparePassword } = require("./bc");
const db = require("./db");
const { distance, isSuperset, eqSet } = require("./utils");
const cookieSessionMiddleware = cookieSession({
    secret: process.env.COOKIE_SECRET,
    maxAge: 1000 * 60 * 60 * 24 * 14,
});
app.use(compression());
app.use(express.json());
app.use(helmet());
app.use(cookieSessionMiddleware);
app.use(express.static("public"));

app.use(
    express.urlencoded({
        extended: false,
    })
);
app.use(csurf());

app.use(function (req, res, next) {
    res.set("x-frame-options", "deny");
    res.cookie("mytoken", req.csrfToken());
    next();
});
app.use(cors());
app.use("/bundle.js", (req, res) => res.sendFile(`${__dirname}/bundle.js`));

// AUTH
app.post("/login", (req, res) => {
    return db.readUser({ email: req.body.email }).then((data) => {
        if (data.rowCount > 0) {
            comparePassword(req.body.password, data.rows[0].password)
                .then((check) => {
                    if (check) {
                        req.session.userId = data.rows[0].id;
                        req.session.name = data.rows[0].name;
                        req.session.email = data.rows[0].email;
                        return res.sendStatus(200);
                    } else {
                        return res.sendStatus(401);
                    }
                })
                .catch((err) => res.status(500).send(err));
        } else {
            return res.sendStatus(404);
        }
    });
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/");
});

app.post("/signup", (req, res) => {
    hashPassword(req.body.password).then((hashedPw) => {
        return db
            .createUser({ ...req.body, password: hashedPw })
            .then((data) => {
                req.session.userId = data.rows[0].id;
                req.session.name = data.rows[0].name;
                req.session.email = data.rows[0].email;
                return res.sendStatus(201);
            })
            .catch((err) => {
                console.log(err);
                return res.sendStatus(500);
            });
    });
});

app.post("/password/reset/start", (req, res) => {
    const { email } = req.body;
    return db.readUser({ email }).then((data) => {
        if (data.rowCount > 0) {
            const secretCode = cryptoRandomString({
                length: 6,
            });
            return db
                .createToken({ email, code: secretCode })
                .then(() => {
                    sendEmail(
                        email,
                        "Reset Password",
                        `Hey, psst! 
Here's your very secret reset password code: ${secretCode}`
                    );
                    return res.sendStatus(200);
                })
                .catch(() => {
                    return res.sendStatus(500);
                });
        } else {
            return res.sendStatus(404);
        }
    });
});

app.post("/password/reset/verify", async (req, res) => {
    const { email, code, password } = req.body;

    try {
        const data = await db.readToken({ code });

        if (data.rowCount > 0) {
            const newPassword = await hashPassword(password);
            db.updatePassword({
                email,
                password: newPassword,
            })
                .then(() => {
                    return res.sendStatus(200);
                })
                .catch(() => {
                    return res.sendStatus(500);
                });
        }
    } catch (err) {
        res.sendStatus(404);
    }
});

// USER
app.get("/api/user/:user_id", async (req, res) => {
    try {
        let data = await db.readUser({ id: req.params.user_id });
        if (data.rowCount > 0) {
            let user = data.rows[0];
            delete user.password;
            res.json({ success: true, user });
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        res.sendStatus(500);
    }
});

app.delete("/api/user/:user_id", deleteFolderS3, async (req, res) => {
    await Promise.all([
        db.deleteFriendship({ user_id: req.params.user_id }),
        db.deleteChat({ user_id: req.params.user_id }),
    ])
        .then(() => {
            db.deleteUser({ user_id: req.params.user_id })
                .then(() => {
                    // remove session cookie
                    req.session = null;
                    // redirect to "/"
                    return res.sendStatus(204);
                })
                .catch((err) => {
                    console.log(err);
                    return res.sendStatus("500");
                });
        })
        .catch((err) => {
            console.log(err);
            return res.sendStatus("500");
        });
});

// ROUTES
app.get("/routes", async (req, res) => {
    try {
        const { rows } = await db.readRoutes({ user_id: req.session.userId });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

app.post("/routes", async (req, res) => {
    try {
        const { name, places, duration, distance, thumbnail } = req.body;
        const { rows } = await db.createRoute({
            user_id: req.session.userId,
            name,
            places,
            duration,
            distance,
            thumbnail,
        });
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

app.get("/route/:id", async (req, res) => {
    try {
        const { rows } = await db.readRoute({
            user_id: req.session.userId,
            id: req.params.id,
        });
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

app.get("/route/:id/images", async (req, res) => {
    try {
        const { rows } = await db.readRouteImages({
            id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

app.get("/route/:id/reviews", async (req, res) => {
    try {
        const { rows } = await db.readRouteReviews({
            id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

app.post("/route/:id", async (req, res) => {
    try {
        const { name, places, duration, distance, thumbnail } = req.body;
        const { rows } = await db.updateRoute({
            user_id: req.session.userId,
            id: req.params.id,
            name,
            places,
            duration,
            distance,
            thumbnail,
        });
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

app.post("/route/:id/review", async (req, res) => {
    try {
        const { text, rating } = req.body;
        const { rows } = await db.createReview({
            route_id: req.params.id,
            text,
            rating,
        });
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

app.delete("/route/:id", async (req, res) => {
    try {
        await db.deleteRoute({
            id: req.params.id,
        });
        return res.sendStatus(204);
    } catch (err) {
        console.log(err);
    }
});

// PLACES
app.get("/places", async (req, res) => {
    try {
        const { rows } = await db.readPlaces();
        return res.json(rows[0]);
    } catch (err) {
        console.log(err);
    }
});

app.post("/places", async (req, res) => {
    // get data from frontend
    // [[GOOGLE POINTS],[FLICKR IMAGES]]
    const points = req.body.points;
    const images = req.body.images;
    // save google places to DB
    points.map((point) => {
        const { name, lat, lng, tags } = point;
        return db.createPlace({ name, lat, lng, tags, is_natural: true });
    });
    // get all current places
    const { rows } = await db.readPlaces();
    const places = rows;

    const oldPoints = new Set();
    const newPoints = new Set();
    // attribute images to existing places
    places.forEach((place) => {
        images.forEach(async (image) => {
            if (distance(place.lat, place.lng, image.lat, image.lng) < 0.5) {
                try {
                    const imageDB = await db.createImage({
                        place_id: place.id,
                        image: image.url,
                        lat: image.lat,
                        lng: image.lng,
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

    // find which clusters are subsets that need removal
    const clustersToRemove = new Set(); // {[1,2],[2,3], [3,4,5]}
    newClusteredPoints.forEach((cluster) => {
        newClusteredPoints.forEach((otherCluster) => {
            if (isSuperset(cluster, otherCluster)) {
                clustersToRemove.add(JSON.stringify([...otherCluster]));
            }
        });
    });

    // remove unnecessary clusters
    const savedNewPoints = newClusteredPoints.map(async (cluster) => {
        let newPlace;
        // if cluster is not in clustersToRemove
        if (!clustersToRemove.includes(JSON.stringify(cluster))) {
            // save to place to DB
            let maxDistance = 0;
            cluster.forEach((point) => {
                cluster.forEach((otherPoint) => {
                    const distanceAtoB = distance(
                        point.lat,
                        point.lng,
                        otherPoint.lat,
                        otherPoint.lng
                    );
                    if (distanceAtoB > maxDistance) {
                        maxDistance = distanceAtoB;
                    }
                });
            });
            let centralPoint = { ...cluster[0] };
            try {
                const { rows } = await db.createPlace({
                    id: cryptoRandomString({
                        length: 10,
                    }),
                    lat: centralPoint.lat,
                    lng: centralPoint.lng,
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
                        image: image.url,
                        lat: image.lat,
                        lng: image.lng,
                    });
                    return rows[0];
                }
            });
            return { place: newPlace, images: savedImages };
        }
    });
    const placesData = await db.readPlaces({ places: [...oldPoints] });
    const imageData = await db.readImages({ places: [...oldPoints] });
    const oldPointsData = placesData.rows.map((place) => {
        const images = imageData.rows.filter(
            (image) => image.place_id === place.id
        );
        return { place, images };
    });
    return { places: [...oldPointsData, ...savedNewPoints] };
});

app.get("/place/:id", async (req, res) => {
    try {
    } catch (err) {
        console.log(err);
    }
});

app.get("/place/:id/images", async (req, res) => {
    try {
        const { rows } = await db.readPlaceImages({
            place_id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

app.get("/place/:id/reviews", async (req, res) => {
    try {
        const { rows } = await db.readReviews({
            place_id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

app.post("/place/:id", async (req, res) => {
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

app.post("/place/:id/image", async (req, res) => {
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

app.post("/place/:id/review", async (req, res) => {
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

app.delete("/place/:id", async (req, res) => {
    try {
        await db.deletePlace({ id: req.params.id });
        return res.sendStatus(204);
    } catch (err) {
        console.log(err);
    }
});

// MISCELLANEOUS
app.post("/upload", uploader.single("image"), uploadFileS3, (req, res) => {
    if (req.file) {
        const { filename } = req.file;
        const image = `${process.env.S3_URL + req.session.userId}/${filename}`;
        return db
            .updateImage({ id: req.session.userId, image })
            .then(({ rows }) => {
                return res.json(rows[0]);
            });
    } else {
        return res.sendStatus(400);
    }
});

// app.use(/\/place[s]?/, placeRouter);

// app.use("/auth", authRouter);

// app.use(/\/route[s]?/, routeRouter);

app.listen(process.env.PORT || 8080, function () {
    console.log("I'm listening.");
});

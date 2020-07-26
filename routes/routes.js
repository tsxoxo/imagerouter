const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
    try {
        const { rows } = await db.readRoutes({ user_id: req.session.userId });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

router.post("/", async (req, res) => {
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

router.get("/:id", async (req, res) => {
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

router.get("/:id/images", async (req, res) => {
    try {
        const { rows } = await db.readRouteImages({
            id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

router.get("/:id/reviews", async (req, res) => {
    try {
        const { rows } = await db.readRouteReviews({
            id: req.params.id,
        });
        return res.json(rows);
    } catch (err) {
        console.log(err);
    }
});

router.post("/:id", async (req, res) => {
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

router.post("/:id/review", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
    try {
        await db.deleteRoute({
            id: req.params.id,
        });
        return res.sendStatus(204);
    } catch (err) {
        console.log(err);
    }
});

module.exports = router;

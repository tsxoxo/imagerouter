const express = require("express");
const app = express();
const compression = require("compression");
const csurf = require("csurf");
const cookieSession = require("cookie-session");
const helmet = require("helmet");
const { uploadFileS3, deleteFolderS3 } = require("./s3");
const { uploader } = require("./multer");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");
// routers
const authRouter = require("./routes/auth");
const placesRouter = require("./routes/places");
const routesRouter = require("./routes/routes");

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

app.use("/place", placesRouter);

app.use("/auth", authRouter);

app.use("/route", routesRouter);

app.listen(process.env.PORT || 8080, function () {
    console.log("I'm listening.");
});

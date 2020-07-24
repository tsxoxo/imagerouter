const router = require("express").Router();
const { hashPassword, comparePassword } = require("../bc");
const db = require("../db");
const { sendEmail } = require("../ses");
const cryptoRandomString = require("crypto-random-string");

// AUTH
router.post("/login", (req, res) => {
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

router.get("/logout", (req, res) => {
    req.session = null;
    return res.redirect("/");
});

router.post("/signup", (req, res) => {
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

router.post("/password/reset/start", (req, res) => {
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

router.post("/password/reset/verify", async (req, res) => {
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

module.exports = router;

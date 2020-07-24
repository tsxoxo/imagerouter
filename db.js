const spicedPg = require("spiced-pg");

let db;
if (process.env.DATABASE_URL) {
    db = spicedPg(process.env.DATABASE_URL);
} else {
    db = spicedPg(
        `postgres:${process.env.AWS_POSTGRES_USERNAME}:${process.env.AWS_POSTGRES_PASSWORD}:@${process.env.AWS_POSTGRES_HOST}:5432/postgres`
    );
}

// USER
exports.createUser = ({ name, email, password }) => {
    const query = `INSERT INTO users (name, email, password) 
                   VALUES ($1, $2, $3) RETURNING *;`;
    return db.query(query, [name, email, password]);
};

exports.readUser = ({ email, id }) => {
    const query = `SELECT * FROM users WHERE ${id ? "id" : "email"} = $1;`;
    return db.query(query, [email || id]);
};

exports.updateUser = ({ name, email, location }) => {
    const query = `UPDATE users
                   SET name = $1, 
                        email = $2,
                        location = $3
                   WHERE email = $2;`;
    return db.query(query, [name, email, location || ""]);
};

exports.updatePassword = ({ email, password }) => {
    const query = `UPDATE users
                   SET password = $2
                   WHERE email = $1;`;
    return db.query(query, [email, password]);
};

exports.updateImage = ({ id, image }) => {
    const query = `UPDATE users
                   SET image = $2
                   WHERE id = $1
                   RETURNING image;`;
    return db.query(query, [id, image]);
};

exports.deleteUser = ({ user_id }) => {
    const query = `DELETE FROM users WHERE id = $1`;
    return db.query(query, [user_id]);
};

// RESET CODES
exports.createToken = ({ email, code }) => {
    const query = `INSERT INTO reset_codes (email, code) 
                   VALUES ($1, $2) RETURNING *;`;
    return db.query(query, [email, code]);
};

exports.readToken = ({ code }) => {
    const query = `SELECT * 
                  FROM reset_codes 
                  WHERE code = $1 AND CURRENT_TIMESTAMP - created_at < INTERVAL '10 minutes';`;
    return db.query(query, [code]);
};

exports.deleteToken = ({ id }) => {
    const query = `DELETE FROM reset_codes WHERE id = $1`;
    return db.query(query, [id]);
};

// ROUTES
exports.createRoute = ({
    name,
    user_id,
    places,
    duration,
    distance,
    thumbnail,
}) => {
    const query = `INSERT INTO routes (name, user_id, places, duration, distance, thumbnail) 
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
    return db.query(query, [
        name,
        user_id,
        places,
        duration,
        distance,
        thumbnail,
    ]);
};

exports.readRoutes = ({ user_id }) => {
    const query = `SELECT * 
                  FROM routes 
                  WHERE user_id = $1;`;
    return db.query(query, [user_id]);
};

exports.readRoute = ({ user_id, id }) => {
    const query = `SELECT * 
                  FROM routes 
                  WHERE user_id = $1 
                    AND id = $2;`;
    return db.query(query, [user_id, id || ""]);
};

exports.updateRoute = ({
    id,
    name,
    places,
    duration,
    distance,
    thumbnail,
    user_id,
}) => {
    const query = `UPDATE routes
                   SET name = $2,
                       places = $3,
                       duration = $4,
                       distance = $5,
                       thumbnail = $6
                   WHERE (id = $1 OR name = $1)
                    AND user_id = $7
                   RETURNING *;`;
    return db.query(query, [
        id,
        name,
        places,
        duration,
        distance,
        thumbnail,
        user_id,
    ]);
};

exports.deleteRoute = ({ id, user_id }) => {
    const query = `DELETE FROM routes 
                   WHERE id = $1
                    AND user_id = $3`;
    return db.query(query, [id, user_id]);
};

// PLACES
exports.createPlace = ({ name, lat, lng, tags, is_natural, id }) => {
    const query = `INSERT INTO places (name, lat, lng, tags, is_natural, id) 
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
    return db.query(query, [name, lat, lng, tags, is_natural, id]);
};

exports.readPlaces = ({ places }) => {
    let query = `SELECT * 
                  FROM places`;
    query = places
        ? query + ` WHERE id = ANY(ARRAY($1));`
        : query + ` WHERE $1 = $1`;
    console.log("readPlaces", query);

    return db.query(query, [places || []]);
};

exports.readPlace = ({ id }) => {
    const query = `SELECT * 
                  FROM places 
                  WHERE id = $1;`;
    return db.query(query, [id]);
};

exports.updatePlace = ({ id, name, tags }) => {
    const query = `UPDATE places
                   SET name = $2,
                       tags = $3
                   WHERE id = $1
                   RETURNING *;`;
    return db.query(query, [id, name, tags]);
};

exports.deletePlace = ({ id }) => {
    const query = `DELETE FROM places WHERE id = $1`;
    return db.query(query, [id]);
};

// IMAGES
exports.createImage = ({ image, place_id }) => {
    const query = `INSERT INTO images (image, place_id) 
                   VALUES ($1, $2) RETURNING *;`;
    return db.query(query, [image, place_id]);
};

exports.readPlaceImages = ({ place_id, places }) => {
    const query = `SELECT * 
                  FROM images 
                  WHERE place_id = $1 OR place_id = ANY(ARRAY(${places}));`;
    return db.query(query, [place_id, places || []]);
};

exports.readRouteImages = ({ id }) => {
    const query = `SELECT routes.id, place_id, image 
                  FROM images
                  LEFT JOIN routes ON place_id = ANY(routes.places)
                  WHERE routes.id = $1;`;
    return db.query(query, [id]);
};

exports.deleteImage = ({ id, place_id }) => {
    const query = `DELETE FROM images 
                   WHERE id = $1 OR place_id = $2;`;
    return db.query(query, [id || "", place_id || ""]);
};

// REVIEWS
exports.createReview = ({ place_id, route_id, text, rating }) => {
    const query = `INSERT INTO reviews (place_id, route_id, text, rating) 
                   VALUES ($1, $2, $3, $4) RETURNING *;`;
    return db.query(query, [place_id || "", route_id || "", text, rating]);
};

exports.readReviews = ({ place_id, route_id }) => {
    const query = `SELECT * 
                  FROM reviews 
                  WHERE place_id = $1 OR route_id = $2;`;
    return db.query(query, [place_id, route_id]);
};

exports.readRouteReviews = ({ id }) => {
    const query = `SELECT routes.id, place_id, text, rating 
                  FROM reviews
                  LEFT JOIN routes 
                    ON place_id = ANY(routes.places) 
                        OR routes.id = reviews.route_id
                  WHERE routes.id = $1;`;
    return db.query(query, [id]);
};

exports.updateReview = ({ id, text, rating }) => {
    const query = `UPDATE reviews
                   SET text = $2,
                       rating = $3
                   WHERE id = $1
                   RETURNING *;`;
    return db.query(query, [id, text, rating]);
};

exports.deleteReview = ({ id }) => {
    const query = `DELETE FROM reviews WHERE id = $1`;
    return db.query(query, [id]);
};

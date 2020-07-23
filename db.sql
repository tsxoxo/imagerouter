CREATE TABLE users(
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      image TEXT,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      location VARCHAR(255)
      )

CREATE TABLE places(
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat NUMERIC(14, 11) NOT NULL,
    lng NUMERIC(14, 11) NOT NULL,
    tag VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routes(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL REFERENCES users(id),
    places TEXT [] NOT NULL,
    duration INT NOT NULL,
    distance FLOAT NOT NULL,
    thumbnail TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE images(
    id SERIAL PRIMARY KEY,
    image TEXT NOT NULL,
    place_id VARCHAR(255) REFERENCES places(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews(
    id SERIAL PRIMARY KEY,
    place_id VARCHAR(255) REFERENCES places(id),
    route_name INT REFERENCES routes(id),
    review_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_not_null CHECK (num_nonnulls(place_id, route_name) = 1)
);

CREATE TABLE ratings(
    id SERIAL PRIMARY KEY,
    place_id VARCHAR(255) REFERENCES places(id),
    route_name INT REFERENCES routes(id),
    rating INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_not_null CHECK (num_nonnulls(place_id, route_name) = 1)
);

CREATE TABLE reset_codes(
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL,
  code VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
const bcrypt = require("bcryptjs");
const { promisify } = require("util");

let { genSalt, hash, compare } = bcrypt;
genSalt = promisify(genSalt);
hash = promisify(hash);
compare = promisify(compare);

exports.hashPassword = (password) => {
    return genSalt().then((salt) => hash(password, salt));
};

exports.comparePassword = (password, DbPass) => {
    return compare(password, DbPass);
};

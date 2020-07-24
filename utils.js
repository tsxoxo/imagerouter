// https://en.wikipedia.org/wiki/Haversine_formula
export function distance(lat1, lon1, lat2, lon2) {
    const p = 0.017453292519943295;
    const a =
        0.5 -
        Math.cos((lat2 - lat1) * p) / 2 +
        (Math.cos(lat1 * p) *
            Math.cos(lat2 * p) *
            (1 - Math.cos((lon2 - lon1) * p))) /
            2;
    return 12742 * Math.asin(Math.sqrt(a));
}

export function isSuperset(set, subset) {
    for (let elem of subset) {
        if (!set.has(elem)) {
            return false;
        }
    }
    return true;
}

export function eqSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (var a of as) if (!bs.has(a)) return false;
    return true;
}

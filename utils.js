/**
 * @param {string} uuid The uuid to convert, in 8-4-4-4-12 format
 * @returns {string} A representation of the uuid in base 64
 */
function uuid_to_base64(uuid) {
    const UUID_REGEX = /^[\da-fA-F]{8}-(?:[\da-fA-F]{4}-){3}[\da-fA-F]{12}$/;
    if (!UUID_REGEX.exec(uuid)) {
        throw new Error("Invalid uuid");
    }
    const hex = uuid.replace(/-/g, "");
    let binary = "";
    for (let i = 0; i < hex.length; i += 2) {
        const int = parseInt(hex.slice(i, i + 2), 16);
        binary += String.fromCharCode(int);
    }
    return btoa(binary).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 *
 * @param {string} b64 The base-64 representation of the uuid
 * @returns {string} The uuid
 */
function base64_to_uuid(b64) {
    const binary = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    let hex = "";
    for (let i = 0; i < binary.length; i++) {
        const int = binary.charCodeAt(i);
        hex += int.toString(16);
    }

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

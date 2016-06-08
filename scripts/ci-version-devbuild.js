"use strict";
const fs = require("fs");
function setNewDevBuildVersion(pkgJsonPath) {
    let pkgJsonParsed = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    let oldVersion = pkgJsonParsed.version;
    // Update the version
    let newDevVersion = getNextDevVersion(pkgJsonParsed.version);
    pkgJsonParsed.version = newDevVersion;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJsonParsed, undefined, 2), { encoding: 'utf8' });
    let pkgJsonParsedNew = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (pkgJsonParsed.version === oldVersion) {
        throw 'Version update failed';
    }
}
exports.setNewDevBuildVersion = setNewDevBuildVersion;
function getNextDevVersion(versionString) {
    // Get date and time string in the format YYMMDDHHMMSS
    let timeStamp = new Date().toISOString().replace(/[TZ:\-\.]/g, "").slice(2, 14);
    if (versionString.indexOf('-') != -1) {
        versionString = versionString.slice(0, versionString.indexOf('-'));
    }
    return versionString + '-dev.' + timeStamp;
}

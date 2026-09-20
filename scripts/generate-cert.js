#!/usr/bin/env node
// Generates a self-signed certificate for local network use.
//
// The certificate has to name every address a browser might use to reach the
// app, including the LAN IPs. Modern browsers ignore the Common Name entirely
// and only read subjectAltName, and an IP address has to be listed as IP:, not
// DNS:, or it will not match.

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const certDir = path.join(__dirname, "..", "certs");
const keyPath = path.join(certDir, "key.pem");
const certPath = path.join(certDir, "cert.pem");

function localAddresses() {
    const addresses = [];
    const interfaces = os.networkInterfaces();

    for (const name in interfaces) {
        for (const alias of interfaces[name]) {
            if (alias.family === "IPv4" && !alias.internal) {
                addresses.push(alias.address);
            }
        }
    }

    return addresses;
}

const ips = localAddresses();
const altNames = [
    "DNS.1 = localhost",
    "IP.1 = 127.0.0.1",
    ...ips.map((ip, i) => `IP.${i + 2} = ${ip}`)
].join("\n");

const config = `
[req]
distinguished_name = dn
x509_extensions = v3_req
prompt = no

[dn]
CN = webrtc-screen-share

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
${altNames}
`;

fs.mkdirSync(certDir, { recursive: true });
const configPath = path.join(certDir, "openssl.cnf");
fs.writeFileSync(configPath, config);

try {
    execFileSync("openssl", [
        "req", "-x509",
        "-newkey", "rsa:2048",
        "-nodes",
        "-keyout", keyPath,
        "-out", certPath,
        // 825 days is the longest lifetime Apple platforms will trust.
        "-days", "825",
        "-config", configPath,
        "-extensions", "v3_req"
    ], { stdio: ["ignore", "ignore", "pipe"] });
} catch (error) {
    console.error("Could not run openssl. Is it installed and on your PATH?");
    console.error(error.stderr ? error.stderr.toString() : error.message);
    process.exit(1);
} finally {
    fs.unlinkSync(configPath);
}

console.log("Created:");
console.log(`  ${certPath}`);
console.log(`  ${keyPath}`);
console.log("\nValid for:");
console.log("  localhost, 127.0.0.1");
ips.forEach(ip => console.log(`  ${ip}`));
console.log("\nStart the server again and it will serve HTTPS automatically.");
console.log("Browsers will warn that the certificate is not trusted; that is");
console.log("expected for a self-signed certificate. Accept it once per device.");
console.log("\nIf your LAN IP changes, run this again to reissue the certificate.");

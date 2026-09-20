#!/usr/bin/env node
// Generates a self-signed certificate for local network use.
//
// The certificate has to name every address a browser might use to reach the
// app, including the LAN IPs. Modern browsers ignore the Common Name entirely
// and only read subjectAltName, and an IP address has to be listed as IP:, not
// DNS:, or it will not match.
//
// Usable two ways: `npm run cert` on the command line, or required by main.js,
// which generates a certificate on first start when none is present.

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Inside a pkg binary __dirname points into the read-only snapshot, so the
// certificate has to be written next to the executable instead.
const baseDir = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, "..");

const certDir = path.join(baseDir, "certs");
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

function opensslConfig(ips) {
    const altNames = [
        "DNS.1 = localhost",
        "IP.1 = 127.0.0.1",
        ...ips.map((ip, i) => `IP.${i + 2} = ${ip}`)
    ].join("\n");

    return `
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
}

// Throws if openssl is unavailable, so callers can decide whether that is fatal.
function generateCert() {
    const ips = localAddresses();

    fs.mkdirSync(certDir, { recursive: true });
    const configPath = path.join(certDir, "openssl.cnf");
    fs.writeFileSync(configPath, opensslConfig(ips));

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
        // Don't leave a half-built certs/ behind; its presence is what tells the
        // server on the next start that a usable certificate exists.
        fs.rmSync(certDir, { recursive: true, force: true });
        throw error;
    } finally {
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    }

    return { keyPath, certPath, ips };
}

function certExists() {
    return fs.existsSync(keyPath) && fs.existsSync(certPath);
}

module.exports = { generateCert, certExists, certDir, keyPath, certPath };

if (require.main === module) {
    let result;
    try {
        result = generateCert();
    } catch (error) {
        console.error("Could not run openssl. Is it installed and on your PATH?");
        console.error(error.stderr ? error.stderr.toString() : error.message);
        process.exit(1);
    }

    console.log("Created:");
    console.log(`  ${result.certPath}`);
    console.log(`  ${result.keyPath}`);
    console.log("\nValid for:");
    console.log("  localhost, 127.0.0.1");
    result.ips.forEach(ip => console.log(`  ${ip}`));
    console.log("\nStart the server again and it will serve HTTPS automatically.");
    console.log("Browsers will warn that the certificate is not trusted; that is");
    console.log("expected for a self-signed certificate. Accept it once per device.");
    console.log("\nIf your LAN IP changes, run this again to reissue the certificate.");
}

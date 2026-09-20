const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const socketIo = require("socket.io");
const os = require("os");
const path = require("path");

const app = express();

// Browsers only allow screen capture over HTTPS or on localhost, so serving
// HTTPS is what lets any device on the network broadcast rather than only this
// machine. A self-signed certificate is created on first start; if that is not
// possible (no openssl) we fall back to plain HTTP, which still works for
// watching. Delete certs/ and set NO_HTTPS=1 to stay on HTTP.
const { generateCert, certExists, keyPath, certPath } = require("./scripts/generate-cert");

let useHttps = false;

if (process.env.NO_HTTPS) {
    console.log("NO_HTTPS is set, serving plain HTTP.");
} else if (certExists()) {
    useHttps = true;
} else {
    try {
        const { ips } = generateCert();
        console.log("No certificate found, generated a self-signed one for:");
        console.log(`  localhost, 127.0.0.1${ips.length ? ", " + ips.join(", ") : ""}`);
        console.log("Browsers will warn that it is untrusted. Accept it once per device.\n");
        useHttps = true;
    } catch (error) {
        console.warn("Could not generate a certificate, falling back to HTTP.");
        console.warn(`  ${error.message.split("\n")[0]}`);
    }
}

const main = useHttps
    ? https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, app)
    : http.createServer(app);

const io = socketIo(main);

app.use(express.static(path.join(__dirname, 'public')));

let broadcasters = {}; // Store broadcaster peer connections

// Helper function to get every local IPv4 address a viewer could connect to.
// More than one can be reachable (Wi-Fi, Ethernet, VPN), so return them all
// rather than guessing with the first match.
function getLocalIPv4Addresses() {
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];

    for (const interfaceName in networkInterfaces) {
        for (const alias of networkInterfaces[interfaceName]) {
            if (alias.family === "IPv4" && !alias.internal) {
                addresses.push(alias.address);
            }
        }
    }

    return addresses;
}

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Handle broadcaster event
    socket.on("broadcaster", () => {
        broadcasters[socket.id] = socket;
        console.log("Broadcaster added:", socket.id);
        socket.broadcast.emit("broadcaster"); // Notify viewers that a broadcaster exists
    });

    // Handle watcher event
    socket.on("watcher", () => {
        console.log("New viewer connected:", socket.id);
        Object.values(broadcasters).forEach((broadcasterSocket) => {
            broadcasterSocket.emit("watcher", socket.id);
        });
    });

    // Handle offer event
    socket.on("offer", (id, offer) => {
        io.to(id).emit("offer", socket.id, offer);
    });

    // Handle answer event
    socket.on("answer", (id, answer) => {
        io.to(id).emit("answer", socket.id, answer);
    });

    // Handle candidate event
    socket.on("candidate", (id, candidate) => {
        io.to(id).emit("candidate", socket.id, candidate);
    });

    // Handle disconnect event. A leaving viewer and a leaving broadcaster mean
    // very different things, so they get separate events: telling every viewer
    // the broadcast ended because some other viewer closed their tab is wrong.
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        if (broadcasters[socket.id]) {
            delete broadcasters[socket.id];
            socket.broadcast.emit("broadcaster-disconnect", socket.id);
        } else {
            // Let broadcasters tear down the peer connection they held for this viewer.
            Object.values(broadcasters).forEach((broadcasterSocket) => {
                broadcasterSocket.emit("watcher-disconnect", socket.id);
            });
        }
    });
});

// New route to return client's IP address
app.get("/ip", (req, res) => {
    const ips = getLocalIPv4Addresses();
    res.json({ ip: ips[0] || null, ips });
});

const PORT = process.env.PORT || 3000;
const scheme = useHttps ? "https" : "http";

main.listen(PORT, () => {
    console.log(`Server running on ${scheme}://localhost:${PORT}`);
    getLocalIPv4Addresses().forEach(ip =>
        console.log(`Other devices on this network: ${scheme}://${ip}:${PORT}`));

    if (!useHttps) {
        console.log("\nServing plain HTTP, so only this machine can start a share.");
        console.log("Run `npm run cert` to enable HTTPS and broadcast from any device.");
    }
});
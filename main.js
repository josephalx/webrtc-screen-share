const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");
const path = require("path");

const app = express();
const main = http.createServer(app);
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

main.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    getLocalIPv4Addresses().forEach(ip =>
        console.log(`Other devices on this network: http://${ip}:${PORT}`));
});
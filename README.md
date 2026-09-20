# webrtc-screen-share

A simple WebRTC application for screen sharing between two or more web browsers.

## Prerequisites

- Node.js and npm installed.
- A modern web browser that supports WebRTC (Chrome, Safari, Firefox, Edge, etc.).

## Installation

1.  Clone the repository:

    ```bash
    git clone git@github.com:alexandreprl/webrtc-screen-share.git
    cd webrtc-screen-share
    ```

2.  Install the dependencies:

    ```bash
    npm install
    ```

## Usage

1.  Start the server:

    ```bash
    npm start
    ```

    On startup it prints every address the app is reachable on:

    ```
    Server running on http://localhost:3000
    Other devices on this network: http://192.168.1.42:3000
    ```

    To use a different port, set `PORT`:

    ```bash
    PORT=8080 npm start
    ```

2.  On the machine whose screen you want to share, open `http://localhost:3000`.

    > **Use `localhost` here, not the network address.** Browsers only allow
    > screen capture in a secure context, which means HTTPS or `localhost`. If
    > you open the `192.168.x.x` address instead, "Start Sharing" will refuse to
    > run. Watching a stream has no such restriction.
    >
    > To broadcast from any device instead of only this one, see
    > [Enabling HTTPS](#enabling-https).

3.  Click **Start Sharing** and choose a screen or window.

4.  A bar appears at the bottom with the address for other devices, and a button
    to copy it. Open that address on another computer, tablet or phone on the
    same network.

5.  Click **Watch Stream** to view the shared screen.

### Enabling HTTPS

By default only the host machine can start a share, because `localhost` is the
only address browsers treat as secure over plain HTTP. Generating a self-signed
certificate lifts that restriction, so any device on the network can broadcast:

```bash
npm run cert
npm start
```

The certificate covers `localhost`, `127.0.0.1` and your current LAN addresses,
and the server switches to HTTPS automatically as soon as it finds one. Startup
will confirm it:

```
Server running on https://localhost:3000
Other devices on this network: https://192.168.1.42:3000
```

Two things to expect:

-   **Every browser will warn that the certificate is untrusted.** That is
    normal for a self-signed certificate — nobody vouches for it but you.
    Choose "Advanced" and proceed; the page is then a fully secure context and
    screen capture works. You only do this once per device.
-   **Plain HTTP stops working on that port.** Use `https://` URLs from then on.
    To go back to HTTP, delete or rename the `certs/` directory.

Re-run `npm run cert` if your LAN IP changes, since the address is baked into
the certificate. The `certs/` directory is gitignored; it holds a private key
and should never be committed.

On iOS, Safari may refuse screen capture even after you accept the warning. If
you need that, install and trust the certificate in Settings, or use the ngrok
route below, which gives you a properly trusted certificate.

### Sharing across different networks (using ngrok)

If you want to share your screen with someone on a different network, you can use ngrok:

1.  Install ngrok: [https://ngrok.com/download](https://ngrok.com/download)

2.  Run ngrok to expose port 3000:

    ```bash
    ngrok http 3000
    ```

3.  Ngrok will provide a public URL (e.g., `https://<random_string>.ngrok.io`).

4.  Share this ngrok URL with the person you want to share your screen with. They can then access the application using the ngrok URL.

    For example, if ngrok gives you `https://abc123def.ngrok.io`, then your friend would go to `https://abc123def.ngrok.io`

    Note that ngrok only exposes the **signalling** server. The video itself
    still travels peer-to-peer, so it must get through both networks' NAT. Only
    a STUN server is configured, which is enough for most home networks but not
    for restrictive ones; see the note about TURN below.

# Build application

`pkg .`

## How it Works

This application uses WebRTC (Web Real-Time Communication) to establish a peer-to-peer connection between browsers.

-   The server acts as a signalling server, facilitating the initial connection setup by exchanging SDP (Session Description Protocol) offers and answers, and ICE (Interactive Connectivity Establishment) candidates.
-   Once the connection is established, the screen sharing data is streamed directly between the browsers.

## Notes

-   Screen sharing requires user permission, and can only be started from
    `localhost` or over HTTPS. See [Enabling HTTPS](#enabling-https).
-   No internet connection is required. The socket.io client is served by the
    app itself, so it works on an isolated local network.
-   **There is no authentication.** Anyone who can reach the port can click
    "Watch Stream" and see your screen. Be careful on networks you don't control.
-   Only a public STUN server is configured. On networks that block peer-to-peer
    traffic (many guest and corporate Wi-Fi networks), connections will fail
    unless you add a TURN server to the `iceServers` list in `public/index.html`.
-   WebRTC performance can be affected by network conditions.
-   This is a basic implementation and can be extended with features like audio sharing, chat, and more.
-   For security, ensure you're using HTTPS in production. ngrok uses HTTPS, so it is a good option for testing across networks.
-   Ensure that the devices that are trying to connect are on the same local network, or that they are connecting via a method that allows them to communicate with each other, such as ngrok.

## Contributing

Feel free to contribute to this project by submitting pull requests or opening issues.

## License

[MIT License](LICENSE.txt)

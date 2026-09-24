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

3.  Click **Start Sharing** and choose a screen, window or tab. To include
    sound, turn on the audio toggle in the picker; see
    [Sharing audio](#sharing-audio).

4.  A bar appears at the bottom with the address for other devices, and a button
    to copy it. Open that address on another computer, tablet or phone on the
    same network.

5.  Click **Watch Stream** to view the shared screen.

### Sharing audio

Audio is sent along with the screen whenever the browser captures it. Only
Chrome and Edge can capture audio from a screen share, and only for some
choices in the picker:

| Picker choice  | Audio                                                               |
| -------------- | ------------------------------------------------------------------- |
| **Chrome Tab** | Yes, with **Also share tab audio** on. The most reliable option.    |
| **Entire Screen** | Yes, with **Also share system audio** on. Windows, ChromeOS and recent macOS. |
| **Window**     | Never.                                                              |

Safari and Firefox share video only, but can watch a stream with sound.

The sharer's status shows **Sharing with audio** when sound is being captured.
If it just says **Sharing**, a note in the bottom bar explains that no audio is
included. The viewer's status shows **Watching · no audio** in the same case.

On macOS, if the Entire Screen tab has no audio toggle, allow Chrome under
**System Settings → Privacy & Security → Screen & System Audio Recording**
and restart it.

If the viewer's browser blocks sound from playing automatically, the video
starts muted and an **Unmute** button appears in the header.

### Viewer tools

While watching, the header has:

-   **Screenshot**: saves the current frame as a PNG, at the stream's full
    resolution.
-   **Copy**: puts the current frame on the clipboard as a PNG, ready to paste
    into a chat. Needs a secure page; see below.
-   **Pop out**: moves the video into a small always-on-top window.
-   **Full screen**: fills the screen with the video.

In full screen and in the pop-out window, **Screenshot** and **Copy** float in
the top-right corner.

The pop-out window with those buttons uses Document Picture-in-Picture, which
only desktop Chrome and Edge (116+) support on a secure page. Everywhere else
the button falls back to **Pop out (basic)**: the video floats, but the
browser only shows its own controls. On phones the button just says **Pop out**
and is always the basic version.

### Using the network address as a secure page

Browsers only allow screen sharing, **Copy** and the full pop-out window on a
secure page: HTTPS or `localhost`. The network address
(`http://192.168.x.x:3000`) doesn't count, so on other devices **Copy** shows
**Needs HTTPS** and the pop-out is basic.

For testing on a home network, Chrome can be told to treat that address as
secure. On each device:

1.  Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
2.  Enter the address exactly as the server prints it, with `http://` and the
    port and no trailing slash, for example `http://192.168.1.42:3000`.
3.  Set it to **Enabled** and click **Relaunch**.

This unlocks:

| Device                  | Copy     | Full pop-out | Start Sharing |
| ----------------------- | -------- | ------------ | ------------- |
| Desktop Chrome or Edge  | Yes      | Yes          | Yes           |
| Chrome on Android       | Yes      | No, basic only | No          |

If the host machine gets a new IP address, update the flag to match. The flag
only affects the address you list, but the page is still sent unencrypted, so
avoid it on networks you don't trust. The video and audio themselves are always
encrypted by WebRTC.

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

-   Screen sharing requires user permission, and can only be started from `localhost` or over HTTPS.
-   No internet connection is required. The socket.io client is served by the
    app itself, so it works on an isolated local network.
-   **There is no authentication.** Anyone who can reach the port can click
    "Watch Stream" and see your screen. Be careful on networks you don't control.
-   Only a public STUN server is configured. On networks that block peer-to-peer
    traffic (many guest and corporate Wi-Fi networks), connections will fail
    unless you add a TURN server to the `iceServers` list in `public/index.html`.
-   WebRTC performance can be affected by network conditions.
-   This is a basic implementation and can be extended with features like chat, and more.
-   VS Code's built-in browser can't share the screen or use the full pop-out
    window. Open the page in Chrome or Edge instead.
-   For security, ensure you're using HTTPS in production. ngrok uses HTTPS, so it is a good option for testing across networks.
-   Ensure that the devices that are trying to connect are on the same local network, or that they are connecting via a method that allows them to communicate with each other, such as ngrok.

## Contributing

Feel free to contribute to this project by submitting pull requests or opening issues.

## License

[MIT License](LICENSE.txt)

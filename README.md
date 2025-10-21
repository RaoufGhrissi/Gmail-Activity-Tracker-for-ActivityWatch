# ActivityWatch Watcher for Gmail

A browser extension that precisely tracks your Gmail activity and pushes detailed events to your local [ActivityWatch](https://activitywatch.net/) server. Works in both **Google Chrome** and **Mozilla Firefox**.

## Features

- **Reading Inbox**: Tracks when you are browsing the inbox or label lists.
- **Reading Emails**: Automatically extracts Subject, Sender, and Recipients (To).
- **Composing Emails**: Tracks real-time drafting, capturing the Subject and all recipients (To/CC/BCC).
- **Tab Awareness**: Accurately measures active time by finishing sessions immediately when you change or minimize the Gmail tab (`visibilitychange`). 
- **ActivityWatch Integration**: Creates an `aw-watcher-gmail` bucket and pushes completed events with exact durations directly to the ActivityWatch API.
- **Local Dashboard**: A modern, dark-themed popup UI to monitor current active sessions, recent history, and connection status.
- **Configurable Port**: Change the ActivityWatch port directly from the extension popup if using a custom setup.

## Architecture

- **`content.js`**: Runs inside Gmail. It monitors DOM state and tab visibility (`visibilityState`) to tightly capture active durations directly in the browser.
- **`background.js`**: A lightweight background script that manages the ActivityWatch connection, processes finished event messages from the content script, and synchronizes data to local storage for the popup.
- **`popup.html/js`**: Provides a clean UI to view the `compose_cache`, `reading_cache`, and `event_history`.

## Building the Extension

This extension utilizes a single codebase optimized to run natively on both Chrome (Manifest V3) and Firefox (Manifest V2). To generate the browser-specific versions, use the provided build script:

```bash
chmod +x build.sh
./build.sh
```

This will wrap your code and create two output directories: `dist/chrome` and `dist/firefox`.

## Installation

Ensure **ActivityWatch** is running locally (default: `http://localhost:5600`) before tracking.

### Google Chrome
1. Build the extension using `./build.sh`
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the `dist/chrome` directory.

### Mozilla Firefox
1. Build the extension using `./build.sh`
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...**.
4. Select the `manifest.json` located inside the `dist/firefox` directory.

## Known Limitations

- **Multiple Composing Windows**: Currently, if multiple email compose forms are open simultaneously, the tracker focuses primarily on the first detected form for simplicity.

## Contributing

Contributions to improve tracking mechanics, UI, or stability are heavily encouraged! To get started:

1. **Fork & Clone** the repository.
2. Ensure you can compile the dist outputs using `./build.sh`.
3. Make your modifications inside the **root** source files. 
   > **Note:** Whenever interacting with extension APIs, rely on the cross-browser shim located at the top of the JS files (`const api = typeof browser !== "undefined" ? browser : chrome;`). Always call `api.` instead of `chrome.` so your new code works in both Firefox and Chrome.
4. Test your logic by loading your generated `./dist/` folders into your browser.
5. Create a descriptive Pull Request with details outlining what you fixed or implemented!

## ActivityWatch Details

- **Bucket ID**: `aw-watcher-gmail`
- **Event Type**: `gmail.activity`
# Gmail Activity Tracker for ActivityWatch

A simplified Chrome extension that tracks Gmail activity and pushes heartbeats directly to your local [ActivityWatch](https://activitywatch.net/) server.

## Features

- **Reading Inbox**: Tracks when you are browsing the inbox or label lists.
- **Reading Emails**: Automatically extracts Subject, Sender, and Recipients (To/CC).
- **Composing Emails**: Tracks real-time drafting, capturing the Subject and all recipients (To/CC/BCC).
- **ActivityWatch Integration**: Creates an `aw-watcher-gmail` bucket and sends heartbeats every 10 seconds.
- **Configurable Port**: Change the ActivityWatch port directly from the extension popup if you use a custom setup.

## Architecture

The extension is designed for simplicity and stability:

- **`content.js`**: Samples Gmail every 10 seconds. It determines your current activity (Composing > Reading Email > Inbox) and scrapes the necessary metadata from the DOM.
- **`background.js`**: A lightweight service worker that manages the connection to ActivityWatch and forwards heartbeats from the content script.
- **`popup.html/js`**: Provides a modern, dark-themed UI to monitor connection status and view recent events fetched directly from the ActivityWatch API.

## Installation

1. Ensure **ActivityWatch** is running locally (default: `http://localhost:5600`).
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select this directory.
5. Open [Gmail](https://mail.google.com). Activity will be logged automatically.

## Debugging

Open the browser console (F12) while on Gmail to see real-time heartbeats:
`[AW-Gmail] Heartbeat: reading_email { ... }`

## ActivityWatch Details

- **Bucket ID**: `aw-watcher-gmail`
- **Event Type**: `gmail.activity`
- **Heartbeat Pulsetime**: 60 seconds (merges events within a 1-minute window).
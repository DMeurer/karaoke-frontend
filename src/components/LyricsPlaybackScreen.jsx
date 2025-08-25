import React, { useRef, useState } from "react";
import LyricsPlayback from "./LyricsPlayback";

// Helper to read JSON file
function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target.result));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function LyricsPlaybackScreen() {
  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h2>Page Playback loaded</h2>
    </div>
  );
}

export default LyricsPlaybackScreen;

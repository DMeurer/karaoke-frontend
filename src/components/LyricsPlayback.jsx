import React from "react";

// Helper to get color shades
function getColor(color, type = "normal") {
  if (type === "past") return "#888"; // dark shade for past
  if (type === "future") return "#ccc"; // light shade for future
  return color || "#fff";
}

// Progress bar for a line
function LineProgressBar({ line, currentTime }) {
  if (!line.words || line.words.length === 0) return null;
  // Calculate total line duration
  const lineStart = line.start;
  const lineEnd = line.end;
  const progress = Math.max(0, Math.min(1, (currentTime - lineStart) / (lineEnd - lineStart)));
  return (
    <div style={{ width: "100%", height: 4, background: "#222", marginTop: 2 }}>
      <div style={{ width: `${progress * 100}%`, height: "100%", background: "#fff", transition: "width 0.1s linear" }} />
    </div>
  );
}

function LyricsPlayback({ lyricsJson, currentTime }) {
  if (!lyricsJson || !lyricsJson.blocks) return null;
  const voices = lyricsJson.voices || [];

  // Find current block
  const currentBlockIdx = lyricsJson.blocks.findIndex(
    (block) => currentTime >= block.start && currentTime <= block.end
  );
  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      {lyricsJson.blocks.map((block, bIdx) => {
        const blockVoice = voices[block.voice - 1] || { color: "#fff" };
        // Block color logic
        let blockColorType = "future";
        if (currentTime > block.end) blockColorType = "past";
        else if (currentTime >= block.start && currentTime <= block.end) blockColorType = "normal";
        return (
          <div key={bIdx} style={{ margin: "24px 0" }}>
            <div style={{ color: getColor(blockVoice.color, blockColorType), fontSize: 28, fontWeight: "bold" }}>
              {/* Block text if present */}
              {block.text}
            </div>
            {/* Lines */}
            {block.lines && block.lines.map((line, lIdx) => {
              const lineVoice = voices[line.voice - 1] || blockVoice;
              let lineColorType = "future";
              if (currentTime > line.end) lineColorType = "past";
              else if (currentTime >= line.start && currentTime <= line.end) lineColorType = "normal";
              return (
                <div key={lIdx} style={{ margin: "8px 0", fontSize: 22 }}>
                  {/* Words */}
                  {line.words && line.words.length > 0 ? (
                    <span>
                      {line.words.map((word, wIdx) => {
                        const wordVoice = voices[word.voice - 1] || lineVoice;
                        let wordColorType = "future";
                        if (currentTime > word.end) wordColorType = "past";
                        else if (currentTime >= word.start && currentTime <= word.end) wordColorType = "normal";
                        return (
                          <span key={wIdx} style={{ color: getColor(wordVoice.color, wordColorType), marginRight: 4 }}>
                            {/* Chars */}
                            {word.chars && word.chars.length > 0 ? (
                              word.chars.map((char, cIdx) => {
                                const charVoice = voices[char.voice - 1] || wordVoice;
                                let charColorType = "future";
                                if (currentTime > char.end) charColorType = "past";
                                else if (currentTime >= char.start && currentTime <= char.end) charColorType = "normal";
                                return (
                                  <span key={cIdx} style={{ color: getColor(charVoice.color, charColorType) }}>
                                    {char.text}
                                  </span>
                                );
                              })
                            ) : word.text}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span style={{ color: getColor(lineVoice.color, lineColorType) }}>{line.text}</span>
                  )}
                  {/* Progress bar below line */}
                  <LineProgressBar line={line} currentTime={currentTime} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default LyricsPlayback;


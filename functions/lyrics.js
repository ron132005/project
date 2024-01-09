const cheerio = require("cheerio");
const google = require("googlethis");

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const removeSymbols = (string) => {
  return string.replace(/[^a-zA-Z0-9 ]/g, "");
};

const removeArtistName = (songQuery) => {
  const artistNameRegex = /(\bby\b|\bfeat\b|\bft\b)\s.*/i;
  return songQuery.replace(artistNameRegex, "").trim();
};

const getSongDetails = async (song) => {
  let options = {
    page: 0,
    safe: false,
    additional_params: {
      hl: "en",
    },
  };

  let searchResults = await google.search(`${song} song lyrics`, options);
  let knowledgePanel = searchResults.knowledge_panel;
  let lyrics = knowledgePanel.lyrics || null;
  let artist = knowledgePanel.type || "Unknown Artist";

  return {
    artist,
    lyrics,
  };
};

module.exports = async (api, event) => {
  let songQuery = event.body;

  if (!songQuery) {
    api.sendMessage(
      "⚠️ Please enter your query.",
      event.threadID,
      event.messageID
    );
    return;
  }

  let song = removeSymbols(songQuery.trim());
  let songCapitalized = capitalizeFirstLetter(song);

  let songDetails = await getSongDetails(song);
  let artist = songDetails.artist;
  let lyrics = songDetails.lyrics;

  if (!lyrics) {
    api.sendMessage(
      "🔁 𝗟𝘆𝗿𝗶𝗰𝘀 𝗻𝗼𝘁 𝗳𝗼𝘂𝗻𝗱.",
      event.threadID,
      event.messageID
    );
    return;
  }

  let artistCapitalized = capitalizeFirstLetter(artist);

  let songWithoutArtist = removeArtistName(songCapitalized);

  let message = `🎵 𝗦𝗼𝗻𝗴: ${songWithoutArtist}\n\n${lyrics}`;

  api.sendMessage(message, event.threadID, event.messageID);
};

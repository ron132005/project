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
  const options = {
    page: 0,
    safe: false,
    additional_params: {
      hl: "en",
    },
  };

  try {
    const searchResults = await google.search(`${song} song lyrics`, options);
    const knowledgePanel = searchResults.knowledge_panel;
    const lyrics = knowledgePanel.lyrics || null;
    const artist = knowledgePanel.type || "Unknown Artist";

    return {
      artist,
      lyrics,
    };
  } catch (error) {
    console.error('Error fetching song details:', error);
    return {
      artist: "Unknown Artist",
      lyrics: null,
    };
  }
};

module.exports = async (api, event) => {
  try {
    const songQuery = event.body;

    if (!songQuery) {
      api.sendMessage(
        "⚠️ Please enter your query.",
        event.threadID,
        event.messageID
      );
      return;
    }

    const song = removeSymbols(songQuery.trim());
    const songCapitalized = capitalizeFirstLetter(song);

    const songDetails = await getSongDetails(song);
    const artist = songDetails.artist;
    const lyrics = songDetails.lyrics;

    if (!lyrics) {
      api.sendMessage(
        "🔁 𝗟𝘆𝗿𝗶𝗰𝘀 𝗻𝗼𝘁 𝗳𝗼𝘂𝗻𝗱.",
        event.threadID,
        event.messageID
      );
      return;
    }

    const artistCapitalized = capitalizeFirstLetter(artist);

    const songWithoutArtist = removeArtistName(songCapitalized);

    const message = `🎵 𝗦𝗼𝗻𝗴: ${songWithoutArtist}\n\n${lyrics}`;

    api.sendMessage(message, event.threadID, event.messageID);
  } catch (error) {
    console.error('Error processing song request:', error);
    api.sendMessage("❌ An error occurred while processing your request.", event.threadID, event.messageID);
  }
};

const axios = require('axios');
const fs = require('fs');

const readKeys = () => {
  try {
    const keysData = fs.readFileSync('keys.txt', 'utf8');
    return JSON.parse(keysData);
  } catch (error) {
    console.error("Error reading keys:", error.message);
    return {};
  }
};

const downloadTikTokVideo = async (api, event) => {
  try {
    const tikTokUrl = event.body;

    // Read API keys from the file
    const keys = readKeys();
    const rapidApiKey = keys?.ttapi;

    if (!rapidApiKey) {
      console.error("Error: RapidAPI key not found in keys.txt.");
      api.sendMessage("❌ Error: RapidAPI key not found.", event.threadID);
      return;
    }

    const options = {
      method: 'GET',
      url: 'https://tiktok89.p.rapidapi.com/tiktok',
      params: {
        link: tikTokUrl,
      },
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'tiktok89.p.rapidapi.com',
      },
    };

    const response = await axios.request(options);

    if (!response.data || !response.data.video) {
      console.error("Error: Unexpected API response format.");
      api.sendMessage("❌ Error: Unexpected API response format.", event.threadID);
      return;
    }

    const videoInfo = response.data;
    const videoUrl = response.data.video
    const playAddr = videoUrl.play_addr?.url_list?.[0];

    if (!playAddr) {
      console.error("Error: Unable to fetch video information.");
      api.sendMessage("❌ Error: Unable to fetch video information.", event.threadID);
      return;
    }

    // Extract additional information
    const viewCount = videoInfo.statistics?.play_count;
    const likesCount = videoInfo.statistics?.digg_count;
    const caption = videoInfo.desc;

    // Download the video and save it to a file path
    const filePath = `./temp/video/${viewCount}.mp4`;
    const videoBuffer = await axios.get(playAddr, { responseType: 'arraybuffer' });

    if (!videoBuffer.data || videoBuffer.data.length === 0) {
      console.error("Error: Video download failed.");
      api.sendMessage("❌ Error: Video download failed.", event.threadID);
      return;
    }

    fs.writeFileSync(filePath, videoBuffer.data);

    // Send the video as an attachment, including additional information
    const message = `✏️ Caption: ${caption}\n\n${viewCount} views 🎥\n${likesCount} likes ♥️`;
    await api.sendMessage({ attachment: fs.createReadStream(filePath), body: message }, event.threadID);

    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Handle expired API key
      console.error("Error: Expired API key. Please update your key.");
      api.sendMessage("❌ Error: Expired API key. Please update your key.", event.threadID);
    } else {
      console.error("Error:", error.message);
      api.sendMessage(`❌ Error: ${error.message}`, event.threadID);
    }
  }
};

module.exports = async (api, event) => {
  try {
    if (event.body.toLowerCase().includes("tiktok.com")) {
      await downloadTikTokVideo(api, event);
    }
  } catch (error) {
  }
};

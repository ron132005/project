const fs = require("fs");
const axios = require("axios");
const ytdl = require("ytdl-core");

const songCache = {};

const downloadSong = async (videoId, filePath) => {
  if (songCache[videoId]) {
    fs.copyFileSync(songCache[videoId], filePath);
    return;
  }

  const videoInfo = await ytdl.getInfo(videoId);
  const audioFormat = ytdl.chooseFormat(videoInfo.formats, { filter: "audioonly" });
  const downloadURL = audioFormat.url;

  const writer = fs.createWriteStream(filePath);

  const response = await axios({
    url: downloadURL,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      songCache[videoId] = filePath;
      resolve();
    });
    writer.on("error", reject);
  });
};

const searchAndDownloadSong = async (songQuery) => {
  const apiKey = "AIzaSyCbg9kpSEX1eB1Q5skjamCNbqorkmUKZ8E";
  const searchURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(
    songQuery
  )}&key=${apiKey}`;

  const response = await axios.get(searchURL);
  const videoId = response.data.items[0].id.videoId;
  const videoTitle = response.data.items[0].snippet.title;
  const channelName = response.data.items[0].snippet.channelTitle;

  if (!videoId || !videoTitle || !channelName) {
    throw new Error("Video information not found");
  }

  const filePath = `./temp/${videoTitle.replace(/\s/g, "-")}.mp3`;
  await downloadSong(videoId, filePath);

  return { filePath, videoTitle, channelName };
};

module.exports = async (api, event) => {
  const songQuery = event.body;

  if (!songQuery) {
    api.sendMessage("🔃 𝗘𝗻𝘁𝗲𝗿 𝘆𝗼𝘂𝗿 𝗾𝘂𝗲𝗿𝘆.", event.threadID, event.messageID);
    return;
  }

  try {
    api.sendMessage("🔍 𝗦𝗲𝗮𝗿𝗰𝗵𝗶𝗻𝗴 𝘀𝗼𝗻𝗴...", event.threadID, event.messageID);

    const { filePath, videoTitle, channelName } = await searchAndDownloadSong(songQuery);

    const stream = fs.createReadStream(filePath);

    api.sendMessage(
      {
        body: `🎵𝗦𝗼𝗻𝗴 𝗡𝗮𝗺𝗲: ${videoTitle}\n👤𝗔𝗿𝘁𝗶𝘀𝘁: ${channelName}`,
        attachment: stream,
      },
      event.threadID,
      (err, messageInfo) => {
        if (err) {
          console.log(err);
          return;
        }

        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.log(unlinkErr);
          }
        });
      }
    );
  } catch (error) {
    console.log(error);
    api.sendMessage("🚨 𝗦𝗼𝗻𝗴 𝗻𝗼𝘁 𝗳𝗼𝘂𝗻𝗱.", event.threadID, event.messageID);
  }
};

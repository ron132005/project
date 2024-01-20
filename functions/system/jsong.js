const fs = require("fs");
const ytdl = require("ytdl-core");
const search = require("yt-search");
const axios = require("axios");

const downloadSong = async (videoId, filePath) => {

  const videoInfo = await ytdl.getInfo(videoId);
  const downloadStream = ytdl(videoId, { quality: 'lowestaudio' });

  const writer = fs.createWriteStream(filePath);
  downloadStream.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      resolve();
    });
    writer.on("error", reject);
  });
};

const searchAndDownloadSong = async (songQuery) => {
  const { videos } = await search(songQuery);
  const firstVideo = videos[0];

  if (!firstVideo) {
    throw new Error("Video information not found");
  }

  const { videoId, title, author } = firstVideo;
  const filePath = `./temp/song/${title.replace(/\s/g, "-")}.mp3`;

  await downloadSong(videoId, filePath);

  return { filePath, videoTitle: title, channelName: author.name };
};

module.exports = async (api, event, extractedSongName) => {
  const songQuery = extractedSongName;

  if (!songQuery) {
    api.sendMessage("❌ An error occured: Executed song.js through [12345-SONGNAME].", event.threadID, event.messageID);
    return;
  }

  try {
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

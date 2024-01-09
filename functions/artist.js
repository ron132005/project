const axios = require("axios");
const fs = require("fs");

const downloadMeme = async (api, event) => {
  try {
    const response = await axios.get("https://api.imgflip.com/get_memes");
    const memes = response.data.data.memes;

    if (memes.length === 0) {
      api.sendMessage("⚠️ No memes found.", event.threadID, event.messageID);
      return;
    }

    const randomMeme = memes[Math.floor(Math.random() * memes.length)];
    const memeUrl = randomMeme.url;

    const memeResponse = await axios.get(memeUrl, {
      responseType: "arraybuffer",
    });

    const memeName = `${randomMeme.id}.jpg`;
    const memePath = `./temp/${memeName}`;

    fs.writeFileSync(memePath, memeResponse.data);

    api.sendMessage(
      {
        body: "🎉 Here's a meme for you!",
        attachment: fs.createReadStream(memePath),
      },
      event.threadID
    );

    fs.unlinkSync(memePath);
  } catch (error) {
    console.error(error);
    api.sendMessage(
      "🔁 Please try again, an error has occurred.",
      event.threadID,
      event.messageID
    );
  }
};

module.exports = async (api, event) => {
  await downloadMeme(api, event);
};

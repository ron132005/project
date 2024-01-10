const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const filepath = path.join(__dirname, "..", "api_key.json");
const apikey = JSON.parse(fs.readFileSync(filepath, "utf8"));
const openai = new OpenAI({
  apiKey: apikey.openai,
  username: apikey.username,
});

module.exports = async (api, event) => {
  try {
    if (!event.body) {
      let stopTyping = api.sendTypingIndicator(event.threadID, (err) => {
        if (err) return console.log(err);

        api.sendMessage(
          "⚠️ 𝗣𝗹𝗲𝗮𝘀𝗲 𝗲𝗻𝘁𝗲𝗿 𝘆𝗼𝘂𝗿 𝗽𝗿𝗼𝗺𝗽𝘁.",
          event.threadID,
          event.messageID
        );
        stopTyping();
      });

      return;
    }
    const response = await openai.images.generate({
      prompt: event.body,
      n: 1,
      size: "1024x1024",
    });
    api.sendMessage("🔨 𝗔𝗜 𝗚𝗲𝗻𝗲𝗿𝗮𝘁𝗶𝗼𝗻 𝗽𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴...", event.threadID, (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });

    const imageDataUrl = response.data.data[0].url;
    const { data: imageData } = await axios.get(imageDataUrl, {
      responseType: "stream",
    });

    const uuid = require("uuid").v4();
    const path = `image/${uuid}.png`;

    const writeStream = fs.createWriteStream(path);
    imageData.pipe(writeStream);
    // Save the file to disk
    await new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        if (fs.existsSync(path)) {
          resolve();
        } else {
          reject();
        }
      });
    });

    // const fileStream = fs.createWriteStream(path);
    // imageData.pipe(fileStream);

    await new Promise((resolve) => {
      const checkExist = setInterval(() => {
        if (fs.existsSync(path)) {
          clearInterval(checkExist);
          resolve();
        }
      }, 1000); // check every 1 second
    });

    api.getThreadInfo(event.threadID, async (err, info) => {
      if (err) {
        console.error(err);
        return;
      }

      const sender = info.userInfo.find((p) => p.id === event.senderID);
      const senderName = sender.firstName;

      const image = fs.createReadStream(path);

      const img = {
        body: `𝗛𝗲𝗿𝗲'𝘀 𝘁𝗵𝗲 𝗴𝗲𝗻𝗲𝗿𝗮𝘁𝗲𝗱 𝗶𝗺𝗮𝗴𝗲 ${senderName}!`,
        attachment: image,
      };

      await new Promise((resolve) => {
        setTimeout(() => {
          api.sendMessage(img, event.threadID, (err) => {
            if (err) {
              console.error(err);
              api.sendMessage("🚨 𝗘𝗿𝗿𝗼𝗿 𝗽𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴 𝗶𝗺𝗮𝗴𝗲.", event.threadID);

              fs.unlink(path, (err) => {
                if (err) {
                  console.error(err);
                  return;
                }
              });
            }
            resolve();
          });
        }, 6000); // add a 6 seconds delay
      });

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err);
          return;
        }
      });
    });
  } catch (error) {
    console.error(error);
    if (error == "Error: Request failed with status code 400") {
      api.sendMessage(
        "❌ 𝗠𝗮𝗸𝗲 𝗮𝗻 𝗮𝗽𝗽𝗿𝗼𝗽𝗿𝗶𝗮𝘁𝗲 𝗿𝗲𝗾𝘂𝗲𝘀𝘁!...",
        event.threadID
      );
    }
  }
};

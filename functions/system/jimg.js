const google = require("googlethis");
const cloudscraper = require("cloudscraper");
const fs = require("fs");

const openSettings = () => {
  return JSON.parse(
    fs.readFileSync(configs.APP_SETTINGS_LIST_FILE, { encoding: "utf8" })
  );
};

const imageSearch = async (api, event, extractedImgName) => {
  let query = extractedImgName;;
  if (!query) {
    let stopTyping = api.sendTypingIndicator(event.threadID, (err) => {
      if (err) return console.log(err);

      api.sendMessage(
        "❌ Triggered jimg.js through [6789-NAME].",
        event.threadID,
        event.messageID
      );
      stopTyping();
    });

    return;
  }

  try {
    let result = await google.image(query, { safe: false });
    if (result.length === 0) {
      api.sendMessage(
        `⚠️ 𝗜𝗺𝗮𝗴𝗲 𝘀𝗲𝗮𝗿𝗰𝗵 𝗱𝗶𝗱 𝗻𝗼𝘁 𝗿𝗲𝘁𝘂𝗿𝗻 𝗮𝗻𝘆 𝗿𝗲𝘀𝘂𝗹𝘁.`,
        event.threadID,
        event.messageID
      );
      return;
    }

    let streams = [];
    let counter = 0;

    for (let image of result) {
      // Only show 6 images
      if (counter >= 6) break;

      // Ignore urls that do not end with .jpg or .png
      let url = image.url;
      if (!url.endsWith(".jpg") && !url.endsWith(".png")) continue;

      let path = `./temp/img/search-image-${counter}.jpg`;
      let hasError = false;
      await cloudscraper
        .get({ uri: url, encoding: null })
        .then((buffer) => fs.writeFileSync(path, buffer))
        .catch((error) => {
          console.log(error);
          hasError = true;
        });

      if (hasError) continue;

      streams.push(
        fs.createReadStream(path).on("end", async () => {
          if (fs.existsSync(path)) {
            fs.unlink(path, (err) => {
              if (err) return console.log(err);
            });
          }
        })
      );

      counter += 1;
    }

    if (streams.length === 0) {
      api.sendMessage(
        "🔁 𝗣𝗹𝗲𝗮𝘀𝗲 𝘁𝗿𝘆 𝗮𝗴𝗮𝗶𝗻, 𝗮𝗻 𝗲𝗿𝗿𝗼𝗿 𝗵𝗮𝘀 𝗼𝗰𝗰𝘂𝗿𝗲𝗱.",
        event.threadID,
        event.messageID
      );
      return;
    }

    api.sendMessage(
      "⏳ 𝗦𝗲𝗻𝗱𝗶𝗻𝗴 𝘀𝗲𝗮𝗿𝗰𝗵 𝗿𝗲𝘀𝘂𝗹𝘁𝘀...",
      event.threadID,
      event.messageID
    );

    let msg = {
      body: `🖼️ 𝗜𝗺𝗮𝗴𝗲 𝗦𝗲𝗮𝗿𝗰𝗵 𝗥𝗲𝘀𝘂𝗹𝘁𝘀`,
      attachment: streams,
    };

    api.sendMessage(msg, event.threadID, event.messageID);
  } catch (error) {
    console.log(error);
    api.sendMessage(
      "🔁 Please try again, an error has occurred.",
      event.threadID,
      event.messageID
    );
  }
};

module.exports = async (api, event, extractedImgName) => {
  await imageSearch(api, event, extractedImgName);
};

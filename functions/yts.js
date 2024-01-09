const axios = require('axios');
const fs = require('fs');
const util = require('util');
const streamPipeline = util.promisify(require('stream').pipeline);

const config = {
  downloadDirectory: './temp/movie/',
  urlShortenerBaseUrl: 'https://vurl.com/api.php?url=',
  torrentQuality: '1080p',
};

function getLanguageName(languageSymbol) {
  const languageMapping = {
    en: "English",
    es: "Spanish",
    fr: "French",
    // Add more language mappings as needed
  };
  return languageMapping[languageSymbol] || "Unknown";
}

async function downloadImage(imageUrl, imagePath) {
  const imageResponse = await axios({
    url: imageUrl,
    responseType: 'stream',
  });
  await streamPipeline(imageResponse.data, fs.createWriteStream(imagePath));
}

async function shortenUrl(longUrl) {
  const urlShortenerUrl = config.urlShortenerBaseUrl + encodeURIComponent(longUrl);
  const shortUrlResponse = await axios.get(urlShortenerUrl);
  return shortUrlResponse.data;
}

module.exports = async function (api, event) {
  const movieName = event.body;
  const movieUrl = `https://yts.mx/api/v2/list_movies.json?quality=${config.torrentQuality}&limit=1&query_term=${encodeURIComponent(movieName)}`;

  try {
    const response = await axios.get(movieUrl);
    const movieData = response.data.data.movies[0];

    if (!movieData) {
      await api.sendMessage({
        body: 'Movie not found.',
      }, event.threadID, event.messageID);
      return;
    }

    const { title_long, genres, language, mpa_rating, torrents, large_cover_image } = movieData;
    const languageName = getLanguageName(language);
    const downloadUrl = torrents.find(torrent => torrent.quality === config.torrentQuality).url;
    const imageFileName = title_long.replace(/\s/g, '-') + '.jpg';
    const imagePath = config.downloadDirectory + imageFileName;

    await downloadImage(large_cover_image, imagePath);
    const shortenedUrl = await shortenUrl(downloadUrl);

    const message = `Title: ${title_long}\n\nGenre: ${genres.join(', ')}\nLanguage: ${languageName}\nMPA Rating: ${mpa_rating}\nDownload it here: ${shortenedUrl}\n\nOnce you're in the link, click "Visit Site," and the file will automatically start downloading. You also need an application named 'Flud,' which you can download here: https://play.google.com/store/apps/details?id=com.delphicoder.flud\n\nAfter downloading the app, you can now open the file that you downloaded using it. The movie will then be downloaded with 1080p quality, which is FullHD, ranging from 1GB TO 3GB.\n\n✓Created by: Ron Funiéstas`;

    const messageOptions = {
      body: message,
      attachment: fs.createReadStream(imagePath),
    };

    await api.sendMessage(messageOptions, event.threadID, event.messageID);

    if (fs.existsSync(imagePath)) {
      try {
        await fs.promises.unlink(imagePath);
        console.log("Image deleted successfully.");
      } catch (deleteError) {
        console.error("Error deleting image:", deleteError);
      }
    } else {
      console.log("Image not found at path:", imagePath);
    }
  } catch (error) {
    await api.sendMessage({
      body: 'Movie not found.',
    }, event.threadID, event.messageID);
  }
};

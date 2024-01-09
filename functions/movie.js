const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = '7cf94d68';

async function getMovieInfo(movieName) {
  try {
    const response = await axios.get(`http://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(movieName)}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching movie data:', error.message);
    return null;
  }
}

async function fetchAndSendMovieInfo(api, event) {
  const movieName = event.body.replace('•movie', '').trim().toLowerCase();

  if (!movieName) {
    api.sendMessage('⚠️ Please enter a movie name after the command.', event.threadID, event.messageID);
    return;
  }

  const movieData = await getMovieInfo(movieName);

  if (!movieData) {
    api.sendMessage(`🔃 Could not find information for the movie "${movieName}".`, event.threadID, event.messageID);
    return;
  }

  const {
    Title,
    Year,
    Runtime,
    Genre,
    Director,
    Actors,
    Plot,
    Poster,
    Ratings,
  } = movieData;

  // Save poster image to a local directory
  const posterFileName = `${Title}.jpg`;
  const posterPath = path.join(__dirname, '../temp', posterFileName);

  try {
    const posterImage = await axios.get(Poster, { responseType: 'arraybuffer' });
    fs.writeFileSync(posterPath, posterImage.data);
  } catch (error) {
    console.error('Error saving poster image:', error.message);
    api.sendMessage('✖️ An error occurred while fetching the movie information.', event.threadID, event.messageID);
    return;
  }

  // Prepare the message
  const message = `𝗧𝗶𝘁𝗹𝗲: ${Title}\n\n𝗬𝗲𝗮𝗿: ${Year}\n𝗥𝘂𝗻𝘁𝗶𝗺𝗲: ${Runtime}\n𝗚𝗲𝗻𝗿𝗲: ${Genre}\n𝗗𝗶𝗿𝗲𝗰𝘁𝗼𝗿: ${Director}\n𝗔𝗰𝘁𝗼𝗿𝘀: ${Actors}\n\n𝗣𝗹𝗼𝘁: ${Plot}\n\n𝗥𝗼𝘁𝘁𝗲𝗻 𝗧𝗼𝗺𝗮𝘁𝗼𝗲𝘀 𝗥𝗲𝘃𝗶𝗲𝘄 𝗥𝗮𝘁𝗶𝗻𝗴 : ${Ratings.find((rating) => rating.Source === 'Rotten Tomatoes')?.Value || 'N/A'}
  `;

  // Send the message along with the poster image
  api.sendMessage({
    body: message,
    attachment: fs.createReadStream(posterPath),
  }, event.threadID, (err, res) => {
    if (err) {
      console.error('Error sending message:', err);
    }

    // Remove the poster image file after sending
    fs.unlinkSync(posterPath);
  });
}

module.exports = fetchAndSendMovieInfo;

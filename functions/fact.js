const request = require('request');
    module.exports = (api, event) =>{
const apiKey = '7piLNnlStEVQD4Ap7zArdg==zWq6SHh52UCAFNQE';
const apiUrl = `https://api.api-ninjas.com/v1/facts?limit=1`;

request.get({
  url: apiUrl,
  headers: {
    'X-Api-Key': apiKey,
  },
}, (error, response, body) => {
  if (error) {
    console.error('Error:', error);
    return;
  }

  const facts = JSON.parse(body);
  if (facts.length > 0) {
    const factText = facts[0].fact;


        api.sendMessage(`Here's a random fact for you!\n\n➣${factText}`, event.threadID, event.messageID )


  } else {
    console.log('No facts received from the API.');
  }
});
}

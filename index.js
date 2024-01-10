const http = require('http');
const axios = require('axios');
//try
let server = http.createServer((req, res) => res.end('Bot is alive on port 8080!')).listen(8080, () => {
    console.log('Server started on port 8000');
});

async function fetchWebsiteHTML() {
    try {
        const response = await axios.get('https://66f28d50-5787-4d3b-a180-15567d366812-00-39smnetq9fsz1.janeway.replit.dev/');
        const html = response.data;

        // Perform actions with the fetched HTML content here
        // For demonstration purposes, log the HTML content
        console.log('Fetched HTML:', html.substring(0, 200) + '... (truncated for brevity)');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

setInterval(() => {
    fetchWebsiteHTML();
}, 10 * 1000);
//try
const fs = require("fs");
const login = require("fb-chat-api-temp");
const { spawn } = require('child_process');

const loginCred = {
  appState: JSON.parse(fs.readFileSync("session.json", "utf-8")),
};

const loginCredEP = {email: "wixitix741@tenjb.com", password: "Arlott2005"
}
    // Here you can use the api             
let running = false;
let stopListener = null;

function startListener(api, event) {
     if (event.type == "message_reply" || event.type == "message") {
        try {
          if (event.body.startsWith("•define")) {
            event.body = event.body.replace("•define", "");
            require("./functions/define.js")(api, event);
          }
          if (event.body.startsWith("•img")) {
            event.body = event.body.replace("•img", "");
            require("./functions/imageSearch.js")(api, event);
          }
          //reaction triggers
          if (event.body.includes("ayie")) {
            api.setMessageReaction(":love:", event.messageID, (err) => {
              if (err) {
                console.error(err);
                return;
              }
            });
          }
          if (
            event.body.toLowerCase().includes("haha") ||
            event.body.toLowerCase().includes("stupid") ||
            event.body.toLowerCase().includes("fuck") ||
            event.body.toLowerCase().includes("shit")
          ) {
            api.setMessageReaction(":laughing:", event.messageID, (err) => {
              if (err) {
                console.error(err);
                return;
              }
            });
          }
          //forbidden jutsu 
          if (!event.body.toLowerCase().includes("•talk") && event.body.toLowerCase().includes("jarvis") || event.body.toLowerCase().includes("ultron")) {

            require("./functions/customprompts.js")(api, event)
          }

          //summoning ai
          if (event.body.toLowerCase().includes("howard")) {
            event.body = event.body.replace(/howard/i, "");
            event.body = "act like a conyo boy, use taglish" + event.body;


            require("./functions/handler.js")(api, event, (err, data) => {
              console.log(err);
              console.log(data);
              if (err) {
                api.sendMessage(
                  `Error: ${err}`,
                  event.threadID,
                  event.messageID
                );
                return;
              }
            });
          }
          //generate image
          if (event.body.startsWith("•ai")) {
            event.body = event.body.replace("•ai", "");
            require("./functions/imghandler")(api, event);
          }

          //lyrics
          if (event.body.startsWith("•lyrics")) {
            event.body = event.body.replace("•lyrics", "");
            require("./functions/lyrics.js")(api, event);
          }

          //song
          if (event.body.startsWith("•song")) {
            event.body = event.body.replace("•song", "");
            require("./functions/song.js")(api, event);
          }

          //meme
       if (event.body.startsWith("•meme")) {
            event.body = event.body.replace("•meme", "");
            require("./functions/meme.js")(api, event);
}
          
          if (event.body.toLowerCase().includes("•talk")) {
            require("./functions/tts.js")(api, event)
          }
          
          if (event.body.includes("•pokemon")) { require("./functions/pokemontwo.js")(api, event);
          }
          if (event.body.includes("•meme")) { require("./functions/meme.js")(api, event);
                                               }
          
          if (event.body.includes("•movie")) { require("./functions/movie.js")(api, event);
                                            }
          if(event.body.includes("•yts")) { 
    event.body =  event.body.replace("•yts", "");      require("./functions/yts.js")(api, event);
          }

          //trial0

          if (event.body === "/â€¢help") {
            startMessage(api, event);
          } 
        } catch (error) {
          console.log(error);
        }
      }
    }

function start() {
  login(loginCred, (err, api) => {
    if (err) {
      console.error("login cred error", err);
      return;
    }
    
    api.listenMqtt((err, event) => {
      if (err) {
        console.error("listen error:", err);
        return;
      }
      
      
      startListener(api, event);
    });
    //trial
//trial
  });
}

start();


// import dependencies
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const readline = require('readline');
const axios = require("axios");

const filepath = path.join(__dirname, "..", "keys.txt");
let apikey;

if (fs.existsSync(filepath)) {
  apikey = JSON.parse(fs.readFileSync(filepath));
} else {
  console.log(`Unable to locate ${filepath}`);
}

// configure OpenAI API
const openai = new OpenAI({
  apiKey: apikey.openai,
  username: apikey.username,
});

// Function to save OpenAI responses to a unique file based on user ID
function saveOpenAIResponses(userId, response) {
  // Specify the absolute path to the directory where you want to save the files
  const directoryPath = "./temp/output"; // Replace with the actual path
  const filePath = path.join(directoryPath, `openai_responses_${userId}.txt`);

  // Read the existing responses from the file
  let existingResponses = [];
  if (fs.existsSync(filePath)) {
    existingResponses = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  }

  // Add the new response to the existing responses
  existingResponses.push(response);

  // Limit the responses to the last 3
  if (existingResponses.length > 3) {
    existingResponses.shift(); // Remove the oldest response
  }

  // Write the updated responses back to the file
  fs.writeFileSync(filePath, existingResponses.join('\n'));
}

function sendErrorPrompt(api, event) {
  const audioDirectory = "./greetings";
  const audioFiles = fs.readdirSync(audioDirectory);
  const randomIndex = Math.floor(Math.random() * audioFiles.length);
  const randomFilePath = path.join(audioDirectory, audioFiles[randomIndex]);

  if (fs.existsSync(randomFilePath)) {
    api.sendMessage(
      {
        body: "🤖 Please input your request along with the trigger word.",
        attachment: fs.createReadStream(randomFilePath),
      },
      event.threadID,
      event.messageID
    );
  } else {
    api.sendMessage(
      "🤖 Please input your request along with the trigger word.",
      event.threadID,
      event.messageID
    );
  }
  // stopTyping(); // You may need to define and call this function.
}

async function openaiCompletion(type, api, event) {
  const userId = event.senderID;
   const directoryPath = "./temp/output"; // Replace with the actual path

  // Read the last 3 user inputs from the user's unique file
  const filePath = path.join(directoryPath, `openai_responses_${userId}.txt`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
}

  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  // Read and store the last 3 OpenAI responses
const lastOpenAIResponses = [];
const fileContent = fs.readFileSync(filePath, 'utf8');
const fileLines = fileContent.split('\n').filter(Boolean);

for (let i = Math.max(fileLines.length - 3, 0); i < fileLines.length; i++) {
  lastOpenAIResponses.push(fileLines[i]);
}

  const formattedContext = lastOpenAIResponses.map(input => `[YOUR PREVIOUS RESPONSE]: ${input}`).join(' ');

  const appendedEventBody = formattedContext + '\n\n'+ event.body;

  // ... (previous code)

const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo-0301",
  max_tokens: 400,
  messages: [...type, { role: "user", content: appendedEventBody }],
});

// Save the OpenAI response
saveOpenAIResponses(userId, response.choices[0].message.content);

const apiKey = apikey.openai
const apiUrl = 'https://api.openai.com/v1/audio/speech';
const now = new Date();
const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
const filePat = `./temp/openai_response_${timestamp}.mp3`;

const requestData = {
  model: 'tts-1',
  input: response.choices[0].message.content,
  voice: 'alloy',
  response_format: 'mp3'
};

const mp3Response = await axios.post(apiUrl, requestData, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  responseType: 'stream'
});

const writer = fs.createWriteStream(filePat);
mp3Response.data.pipe(writer);

await new Promise((resolve, reject) => {
  writer.on('finish', () => {
    console.log('MP3 file saved successfully!');
    resolve();
  });
  writer.on('error', (err) => {
    console.error('Error saving MP3 file:', err);
    reject(err);
  });
});

// Read the saved MP3 file
const mp3File = fs.createReadStream(filePat);
  // Send the MP3 as a reply to the original message
  api.sendMessage({
    attachment: mp3File // Only the attachment is sent without any accompanying text
  }, event.threadID, null, event.messageID)
    .then(() => {
      //  the MP3 file after sending
      fs.unlink(filePat, (err) => {
        if (err) {
          console.error('Error deleting MP3 file:', err);
        }
      });
    })
    .catch((err) => {
      console.error('Error sending MP3 file:', err);
    });

            
  }

async function getUserGender(senderName) {
  const apiUrl = `https://api.genderize.io/?name=${encodeURIComponent(senderName)}`;
  try {
    const response = await axios.get(apiUrl);
    if (response.data && response.data.gender) {
      return response.data.gender.toLowerCase();
    }
    // If the API does not return a gender, we'll assume it's unknown or neutral.
    return "unknown";
  } catch (error) {
    console.error("Error fetching user gender:", error.message);
    // In case of an error, we'll also assume the gender is unknown.
    return "unknown";
  }
}

// export function
module.exports = async (api, event) => {
  try {
    const jmp = fs.readFileSync('./functions/system/persona/tts_jarvis_male.txt', 'utf8');
    const jfp = fs.readFileSync('./functions/system/persona/jarvis_female_policy.txt', 'utf8');
    const ultron = fs.readFileSync('./functions/system/persona/ultron_rules.txt', 'utf8');


    const jarvism = [
      {
        role: "user",
        content: jmp },     
      {
        role: "assistant",
        content: "instructions applied and understood",
      },
    ];

    const jarvisf = [
      {
        role: "user",
        content: jfp },
      {
        role: "assistant",
        content: "instructions applied and understood",
      },
    ];

    const evil = [
      {
        role: "user",
        content: ultron },
      {
        role: "assistant",
        content: "instructions applied and understood",
      },
    ];

    //this is from Jarvis
    if (event.body.toLowerCase().includes("jarvis") || event.body.toLowerCase().includes("•talk")) {
      event.body = event.body.replace(/jarvis/i, "");
      event.body = event.body.replace(/•talk/i, "");
      
      if (!event.body) {
        sendErrorPrompt(api, event);
      } else {
        // Fetch user's gender
        const sender = await api.getThreadInfo(event.threadID);
        const senderName = sender.userInfo.find((p) => p.id === event.senderID)
          .firstName;
        const senderGender = await getUserGender(senderName);

        // Send response based on user gender
        if (senderGender === "male" || senderGender === "unknown") {
          const type = jarvism;
          openaiCompletion(type, api, event);
        }
        if (senderGender === "female") {
          const type = jarvisf;
          openaiCompletion(type, api, event);
        }
      }
    }

    //this is for dev
    if (event.body.toLowerCase().includes("chris")) {
      event.body = event.body.replace(/chris/i, "");
      if (!event.body) {
        sendErrorPrompt(api, event);
      } else {
        const type = chris;
        openaiCompletion(type, api, event);
      }
    }

    //this is for math
    if (event.body.includes("/math")) {
      event.body = event.body.replace("/math", "");
      if (!event.body) {
        sendErrorPrompt(api, event);
      } else {
        const type = math;
        openaiCompletion(type, api, event);
      }
    }

    if (event.body.toLowerCase().includes("ultron")) {
      event.body = event.body.replace(/ultron/i, "");
      if (!event.body) {
        sendErrorPrompt(api, event);
      } else {
        const type = evil;
        openaiCompletion(type, api, event);
      }
    }
  } catch (error) {
    api.getThreadInfo(event.threadID, (err, info) => {
      if (err) {
        console.error(err);
        return;
      }

      // get sender info
      const sender = info.userInfo.find((p) => p.id === event.senderID);
      const senderName = sender.firstName;
      if (error.message.includes("Request failed with status code 400")) {
        api.sendMessage(
          {
            body: `Hi @${senderName}! Error too many requests or your request is too long. Please try again.`,
            mentions: [{ tag: `@${senderName}`, id: event.senderID }],
          },
          event.threadID,
          event.messageID
        );
      }
    });
  }
};

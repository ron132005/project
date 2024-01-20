const fs = require("fs");
const path = require("path");
const readline = require('readline');
const axios = require("axios");

const filepath = path.join(__dirname, "..", "api_key.json");
let apikey;

if (fs.existsSync(filepath)) {
  apikey = JSON.parse(fs.readFileSync(filepath));
} else {
  console.log(`Unable to locate ${filepath}`);
}

const { OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: apikey.openai,
  username: apikey.username,
});

function saveOpenAIResponses(userId, response) {
  const directoryPath = "./temp/output";
  const filePath = path.join(directoryPath, `openai_responses_${userId}.txt`);

  let existingResponses = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean)
    : [];

  existingResponses.push(response);

  if (existingResponses.length > 3) {
    existingResponses.shift();
  }

  fs.writeFileSync(filePath, existingResponses.join('\n'));
}

function sendErrorPrompt(api, event) {
  const audioDirectory = "./greetings";
  const audioFiles = fs.readdirSync(audioDirectory);
  const randomIndex = Math.floor(Math.random() * audioFiles.length);
  const randomFilePath = path.join(audioDirectory, audioFiles[randomIndex]);

  api.sendMessage(
    {
      body: "🤖 Please input your request along with the trigger word.",
      attachment: fs.existsSync(randomFilePath)
        ? fs.createReadStream(randomFilePath)
        : null,
    },
    event.threadID,
    event.messageID
  );
}

async function openaiCompletion(type, api, event) {
  const userId = event.senderID;
  const directoryPath = "./temp/output";
  const filePath = path.join(directoryPath, `openai_responses_${userId}.txt`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const lastOpenAIResponses = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean).slice(-3);
  const formattedContext = lastOpenAIResponses.map(input => `[YOUR PREVIOUS RESPONSE]: ${input}`).join(' ');
  const appendedEventBody = formattedContext + '\n\n' + event.body;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0301",
    max_tokens: 400,
    messages: [...type, { role: "user", content: appendedEventBody }],
  });

  saveOpenAIResponses(userId, response.choices[0].message.content);

  api.getThreadInfo(event.threadID, async (err, info) => {
    if (err) {
      console.error(err);
      return;
    }

    api.sendTypingIndicator(event.threadID);
    const sender = info.userInfo.find((p) => p.id === event.senderID);
    const senderName = sender.firstName;
    const senderGender = await getUserGender(senderName);

    if (response.choices[0].message.content.includes('[12345-')) {
      const randomWaitPhrase = getRandomWaitPhrase();
      const extractedSongName = extractNameFromResponse(response.choices[0].message.content, /\[12345-(.*?)\]/);
      require("./system/jsong.js")(api, event, extractedSongName);
      api.sendTypingIndicator(event.threadID);
      api.sendMessage({
        body: `Hi @${senderName}! ${randomWaitPhrase}`,
        mentions: [{ tag: `@${senderName}`, id: event.senderID }],
      }, event.threadID, event.messageID);
    } else if (response.choices[0].message.content.includes('[6789-')) {
      const randomWaitPhrase = getRandomWaitPhrase();
      const extractedImgName = extractNameFromResponse(response.choices[0].message.content, /\[6789-(.*?)\]/);
      require("./system/jimg.js")(api, event, extractedImgName);
      api.sendTypingIndicator(event.threadID);
      api.sendMessage({
        body: `Hi @${senderName}! ${randomWaitPhrase}`,
        mentions: [{ tag: `@${senderName}`, id: event.senderID }],
      }, event.threadID, event.messageID);
    } else {
      api.sendTypingIndicator(event.threadID);
      api.sendMessage({
        body: `Hi @${senderName}! ${response.choices[0].message.content}`,
        mentions: [{ tag: `@${senderName}`, id: event.senderID }],
      }, event.threadID, event.messageID);
    }
  });
}

async function getUserGender(senderName) {
  const apiUrl = `https://api.genderize.io/?name=${encodeURIComponent(senderName)}`;
  try {
    const response = await axios.get(apiUrl);
    return (response.data && response.data.gender) ? response.data.gender.toLowerCase() : "unknown";
  } catch (error) {
    console.error("Error fetching user gender:", error.message);
    return "unknown";
  }
}

function getRandomWaitPhrase() {
  const waitPhrases = ["🔎 Please wait", "Hold on...", "Wait a second!", "Wait 🙏", "Hold on 🙏", "I'm searching for it!", "I'm searching...", "Okay! I'm searching that 🔎", "Wait! I'll try and get that", "Okay, wait up🔎" ];
  return waitPhrases[Math.floor(Math.random() * waitPhrases.length)];
}

function extractNameFromResponse(content, pattern) {
  const nameMatch = content.match(pattern);
  return nameMatch ? nameMatch[1].replace('-', ' ') : '';
}

module.exports = async (api, event) => {
  try {
    const jmp = fs.readFileSync('./functions/system/persona/jarvis_male_policy.txt', 'utf8');
    const jfp = fs.readFileSync('./functions/system/persona/jarvis_female_policy.txt', 'utf8');
    const ultron = fs.readFileSync('./functions/system/persona/ultron_rules.txt', 'utf8');

    const jarvism = [{ role: "user", content: jmp }, { role: "assistant", content: "instructions applied and understood" }];
    const jarvisf = [{ role: "user", content: jfp }, { role: "assistant", content: "instructions applied and understood" }];
    const evil = [{ role: "user", content: ultron }, { role: "assistant", content: "instructions applied and understood" }];

    if (event.body.toLowerCase().includes("jarvis")) {
      event.body = event.body.replace(/jarvis/i, "");
      if (!event.body) {
        sendErrorPrompt(api, event);
      } else {
        const sender = await api.getThreadInfo(event.threadID);
        const senderName = sender.userInfo.find((p) => p.id === event.senderID).firstName;
        const senderGender = await getUserGender(senderName);

        if (senderGender === "male" || senderGender === "unknown") {
          openaiCompletion(jarvism, api, event);
        }
        if (senderGender === "female") {
          openaiCompletion(jarvisf, api, event);
        }
      }
    }

    if (event.body.toLowerCase().includes("ultron")) {
      event.body = event.body.replace(/ultron/i, "");
      if (!event.body) {
        sendErrorPrompt(api, event);
      } else {
        openaiCompletion(evil, api, event);
      }
    }
  } catch (error) {
    api.getThreadInfo(event.threadID, (err, info) => {
      if (err) {
        console.error(err);
        return;
      }

      const senderName = info.userInfo.find((p) => p.id === event.senderID).firstName;
      if (error.message.includes("Request failed with status code 400")) {
        api.sendMessage({
          body: `Hi @${senderName}! Error too many requests or your request is too long. Please try again.`,
          mentions: [{ tag: `@${senderName}`, id: event.senderID }],
        }, event.threadID, event.messageID);
      }
    });
  }
};

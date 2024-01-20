const fs = require('fs');
const axios = require('axios');

const logsPath = './temp/output/logs.txt';
const imgFolderPath = './temp/img/';
const maxImageCount = 15;

async function saveLogsToFile(api, event) {
    if (event.type === 'message') {
        if (event.attachments.length === 0) {
            saveMessageLogs(event);
        } else if (event.attachments[0].type === 'photo' || event.attachments[0].type === 'animated_image') {
            await saveImageFromEvent(api, event);
        }
    }
}

function saveMessageLogs(event) {
    try {
        const existingLogs = fs.existsSync(logsPath) ? JSON.parse(fs.readFileSync(logsPath, 'utf-8')) : [];
        const newLogEntry = { messageID: event.messageID, body: event.body };
        const lastHundredLogs = [...existingLogs.slice(-100), newLogEntry].filter(entry => Object.keys(entry).length > 0);
        const logsString = JSON.stringify(lastHundredLogs, null, 2);
        fs.writeFileSync(logsPath, logsString, 'utf-8');
    } catch (error) {
        console.error('Error saving logs to file:', error);
    }
}

async function saveImageFromEvent(api, event) {
    const imgUrl = event.attachments[0].url;
    const imgPath = `${imgFolderPath}${event.messageID}.png`;

    try {
        await saveImageFromUrl(imgUrl, imgPath);
        console.log('Image downloaded and saved successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

function unSend(api, event) {
    if (event.type === 'message_unsend') {
        try {
            const imgPath = `${imgFolderPath}${event.messageID}.png`;

            if (fs.existsSync(imgPath)) {
                handleUnsentImage(api, event, imgPath);
            } else {
                handleUnsentMessage(api, event);
            }
        } catch (error) {
            console.error('Error handling unsent message:', error);
        }
    }
}

function handleUnsentImage(api, event, imgPath) {
    const imgStream = fs.createReadStream(imgPath);

    api.getUserInfo(event.senderID, (err, userInfo) => {
        api.sendMessage({
            body: `${userInfo[event.senderID].name} unsent this photo`,
            mentions: [{ tag: `${userInfo[event.senderID].name}`, id: event.senderID }],
            attachment: imgStream
        }, event.threadID, (err, messageInfo) => {
            handleSendMessageResult(err, imgPath);
        });
    });
}

function handleUnsentMessage(api, event) {
    const unsentMessageID = event.messageID;
    const existingLogs = fs.existsSync(logsPath) ? JSON.parse(fs.readFileSync(logsPath, 'utf-8')) : [];
    const originalMessage = existingLogs.find(entry => entry.messageID === unsentMessageID);

    if (originalMessage && originalMessage.body) {
        api.getUserInfo(event.senderID, (err, userInfo) => {
            if (!err && userInfo[event.senderID]) {
                const messageBody = `${userInfo[event.senderID].name} unsent the message:\n\n➣ ${originalMessage.body}`;
                api.sendMessage({ body: messageBody, mentions: [{ tag: `${userInfo[event.senderID].name}`, id: event.senderID }] }, event.threadID);
            } else {
                console.error('Error fetching user information:', err);
            }
        });
    }
}

async function saveImageFromUrl(imgurl, imgfilePath) {
    const response = await axios({
        method: 'GET',
        url: imgurl,
        responseType: 'stream',
    });
    manageImageCount();
    const writer = fs.createWriteStream(imgfilePath);
    
    manageImageCount();

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            manageImageCount();
            resolve();
        });

        writer.on('error', (err) => {
            console.error('Error saving image:', err);
            reject(err);
        });

        response.data.pipe(writer);
    });
}

function manageImageCount() {
    fs.readdir(imgFolderPath, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }

        files.sort((a, b) => fs.statSync(`${imgFolderPath}${a}`).birthtimeMs - fs.statSync(`${imgFolderPath}${b}`).birthtimeMs);

        if (files.length > maxImageCount) {
            const oldestImagePath = `${imgFolderPath}${files[0]}`;
            fs.unlink(oldestImagePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error unlinking file:', unlinkErr);
                } else {
                    console.log('Oldest image deleted successfully:', oldestImagePath);
                }
            });
        }
    });
}

function handleSendMessageResult(err, imgPath) {
    if (!err) {
        fs.unlink(imgPath, (unlinkErr) => {
            if (unlinkErr) {
                console.error('Error unlinking file:', unlinkErr);
            }
        });
    } else {
        console.error('Error sending message:', err);
    }
}

module.exports = (api, event) => {
    saveLogsToFile(api, event);
    unSend(api, event);
};

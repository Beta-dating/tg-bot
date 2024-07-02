const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const token = '7477448573:AAF1Tnj2iJoUjUWUkwposB60T1Vg9Odvens';

const bot = new TelegramBot(token, { polling: true });
let users = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || 'NoUsername';
  const filepath = getFilePath(username, chatId);

  fs.readFile(filepath, 'utf8', (err, data) => {
    if (err) {
      users[chatId] = {
        username: username,
        step: 'name'
      };
      askName(chatId);
    } else {
      const user = JSON.parse(data);
      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Edit', callback_data: 'edit' }]
          ]
        }
      };
      bot.sendMessage(chatId, `Ur profile:\nName: ${user.name}\nAge: ${user.age}\nGender: ${user.gender}`, options);
    }
  });
});

bot.onText(/\/cancel/, (msg) => {
  const chatId = msg.chat.id;

  if (users[chatId]) {
    const username = users[chatId].username;
    const filepath = getFilePath(username, chatId);

    delete users[chatId];
    fs.unlink(filepath, (err) => {
      if (err) {
        console.error('Error:', err);
      }
    });
    bot.sendMessage(chatId, 'Reg cancelled.');
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!users[chatId] || text.startsWith('/')) {
    return;
  }

  const step = users[chatId].step;
  if (stepHandlers[step]) {
    stepHandlers[step](chatId, text);
  }
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'edit') {
    startEdit(chatId);
  } else {
    handleGender(chatId, data);
  }
});

const stepHandlers = {
  'name': handleName,
  'age': handleAge,
  'gender': handleGender
};

function askName(chatId) {
  bot.sendMessage(chatId, 'Try to recall your name?');
}

function handleName(chatId, name) {
  users[chatId].name = name;
  users[chatId].step = 'age';
  askAge(chatId);
}

function askAge(chatId) {
  bot.sendMessage(chatId, 'Ur age (>=18)');
}

function handleAge(chatId, age) {
  if (isNaN(age) || age < 18) {
    bot.sendMessage(chatId, '>=18');
  } else {
    users[chatId].age = age;
    users[chatId].step = 'gender';
    askGender(chatId);
  }
}

function askGender(chatId) {
  const options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'M', callback_data: 'M' }],
        [{ text: 'F', callback_data: 'F' }]
      ]
    })
  };
  bot.sendMessage(chatId, 'Gender (M/F)?', options);
}

function handleGender(chatId, gender) {
  if (gender !== 'M' && gender !== 'F') {
    bot.sendMessage(chatId, 'Use buttons');
  } else {
    users[chatId].gender = gender;
    users[chatId].step = 'done';
    saveUser(chatId);
    bot.sendMessage(chatId, 'Done.');
  }
}

function getFilePath(username, chatId) {
  return path.join(__dirname, `user_${username}_${chatId}.json`);
}

function saveUser(chatId) {
  const user = users[chatId];
  const userJson = JSON.stringify(user, null, 2);
  const filepath = getFilePath(user.username, chatId);

  const tempFilepath = path.join(__dirname, `temp_user_${user.username}_${chatId}.json`);

  fs.readdir(__dirname, (err, files) => {
    if (err) {
      console.error('Error while reading folder:', err);
    } else {
      files.forEach(file => {
        if (file.startsWith(`user_${user.username}_`) && file !== `temp_user_${user.username}_${chatId}.json`) {
          fs.unlink(path.join(__dirname, file), (err) => {
            if (err) {
              console.error('Error while delete:', err);
            }
          });
        }
      });

      fs.writeFile(tempFilepath, userJson, (err) => {
        if (err) {
          console.error('Error:', err);
        } else {
          fs.rename(tempFilepath, filepath, (err) => {
            if (err) {
              console.error('Rename error:', err);
            } else {
              console.log('Profile saved.');
            }
          });
        }
      });
    }
  });
}

function startEdit(chatId) {
  const username = users[chatId] ? users[chatId].username : 'NoUsername';
  users[chatId] = {
    username: username,
    step: 'name'
  };
  askName(chatId);
}

console.log('rocket launched');

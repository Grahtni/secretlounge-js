const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
fs = require("fs");
dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const db = new sqlite3.Database("users.db");

db.serialize(function () {
  db.run(
    "CREATE TABLE IF NOT EXISTS users ( chatId INTEGER, firstName TEXT, lastName TEXT, username TEXT, joinDate TEXT, leaveDate TEXT )"
  );
});

// Commands

bot.onText(/\/start/, (msg) => {
  db.get(
    "SELECT chatId FROM users WHERE chatId = ?",
    [msg.chat.id],
    (err, row) => {
      if (err) throw err;
      if (!row) {
        db.run(
          "INSERT INTO users (chatId, firstName, lastName, username, joinDate) VALUES (?, ?, ?, ?, datetime('now'))",
          [
            msg.chat.id,
            msg.from.first_name,
            msg.from.last_name,
            msg.from.username,
          ],
          function (err) {
            if (err) throw err;
          }
        );
        console.log("User", msg.chat.id, "has joined the chat.");
        bot.sendMessage(
          msg.chat.id,
          "*Welcome!* ✨ _You've joined the chat._",
          {
            reply_to_message_id: msg.message_id,
            parse_mode: "Markdown",
          }
        );
      } else {
        bot.sendMessage(msg.chat.id, "_You're already in the chat._", {
          parse_mode: "Markdown",
          reply_to_message_id: msg.message_id,
        });
      }
    }
  );
});

bot.onText(/\/stop/, (msg) => {
  db.run(
    "UPDATE users SET leaveDate = datetime('now') WHERE chatId = ?",
    [msg.chat.id],
    (err) => {
      if (err) throw err;
    },
    console.log("User", msg.chat.id, "has left the chat."),
    bot.sendMessage(msg.chat.id, "_You've left the chat._", {
      reply_to_message_id: msg.message_id,
      parse_mode: "Markdown",
    })
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "*Commands:*\n\n/start - _Start to receive messages_\n/stop - _Stop receiving messages_\n/help - _Show commands_\n/rules - _Show rules_\n\n_You can use /info to see user information._",
    { reply_to_message_id: msg.message_id, parse_mode: "Markdown" }
  );
});

bot.onText(/\/info/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "_This is a Telegram anonymous chat. All messages sent here are anonymous. Just send a message to participate!_",
    { reply_to_message_id: msg.message_id, parse_mode: "Markdown" }
  );
});

bot.onText(/\/rules/, (msg) => {
  fs.readFile("rules.txt", "utf-8", (err, data) => {
    if (err) {
      bot.sendMessage(msg.chat.id, "Error reading rules file.");
    } else {
      bot.sendMessage(msg.chat.id, data, {
        reply_to_message_id: msg.message_id,
        parse_mode: "Markdown",
      });
    }
  });
});

// Messages

bot.on("message", (msg) => {
  // Media Handling

  if (msg.audio || msg.video || msg.document || msg.photo || msg.video_note) {
    db.all("SELECT chatId FROM users", [], (err, rows) => {
      if (err) throw err;
      rows.forEach((row) => {
        if (row.chatId !== msg.chat.id) {
          const fileId = msg.photo[msg.photo.length - 1].file_id;
          bot.getFile(fileId).then((file) => {
            bot.sendPhoto(row.chatId, fileId);
          });
        }
      });
    });

    // Text
  } else if (!msg.text.startsWith("/")) {
    db.all("SELECT chatId FROM users", [], (err, rows) => {
      if (err) throw err;
      rows.forEach((row) => {
        //if (row.chatId !== msg.chat.id) {
        bot.sendMessage(row.chatId, msg.text);
      });
    });
  }
});

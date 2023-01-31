const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
dotenv.config();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const db = new sqlite3.Database("users.db");

db.serialize(function () {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (chatId INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT, username TEXT, languageCode TEXT)"
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
          "INSERT INTO users (chatId, firstName, lastName, username, languageCode) VALUES (?, ?, ?, ?, ?)",
          [
            msg.chat.id,
            msg.from.first_name,
            msg.from.last_name,
            msg.from.username,
            msg.from.language_code,
          ],
          function (err) {
            if (err) throw err;
            bot.sendMessage(
              msg.chat.id,
              "*Welcome!* ✨ You've joined the chat.",
              {
                reply_to_message_id: msg.message_id,
                parse_mode: "Markdown",
              }
            );
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

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "*Commands:*\n\n/start - _Start to receive messages_\n/help - _Show commands_\n/info - _Know more_",
    { reply_to_message_id: msg.message_id, parse_mode: "Markdown" }
  );
});

bot.onText(/\/info/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "_This is a Telegram anonymous chat bot. All messages sent here are anonymous. Just send a message to participate!_",
    { reply_to_message_id: msg.message_id, parse_mode: "Markdown" }
  );
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
        if (row.chatId !== msg.chat.id) {
          bot.sendMessage(row.chatId, msg.text);
        }
      });
    });
  }
});

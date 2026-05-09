import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "./config.js";
import fs from "fs";

const bot = new Telegraf(BOT_TOKEN);

/* ================= CONFIG ================= */

const ADMIN_ID = 8136997138;
const METHOD_CHANNEL = "@Global_Method_Channel";
const MAIN_CHANNEL = "-1002315458574";
const GROUP_ID = "-1003820143618";
const DB_FILE = "./db.json";
let randomOn = true;

/* ================= DB ================= */

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ banned: [], users: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* ================= JOIN CHECK ================= */

async function isJoined(ctx) {
  try {
    const res = await ctx.telegram.getChatMember(METHOD_CHANNEL, ctx.from.id);
    return ["member", "administrator", "creator"].includes(res.status);
  } catch {
    return false;
  }
}

/* ================= UI ================= */

function joinUI() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚙️ Global Channel", url: "https://t.me/Global_Method_Channel" }],
        [{ text: "📢 Main Channel", url: "https://t.me/+75BQ2Qw9UZI4OTM1" }],
        [{ text: "✅ Joined", callback_data: "check_join" }]
      ]
    }
  };
}

/* ================= TEMP LINK ================= */

async function createTempLink(chatId) {
  return await bot.telegram.createChatInviteLink(chatId, {
    expire_date: Math.floor(Date.now() / 1000) + 3600,
    member_limit: 1
  });
}

/* ================= START MESSAGE ================= */

const START_MSG = `🌸 Bot Started Successfully 🚀
👋 Welcome!

📌 Commands:
🔹 /start
🔹 /panel
🔹 /help

⚠️ Admin Only:
❌ /block
❌ /unblock
❌ /boardchat

🚀 Enjoy!`;

/* ================= STATES ================= */

const supportState = {};
const adminReply = {};
const boardchatState = {};

/* ================= MIDDLEWARE ================= */

bot.use(async (ctx, next) => {
  if (!ctx.from) return;

  const id = ctx.from.id;
  const text = ctx.message?.text;
  const db = loadDB();

  if (!db.users[id]) {
    db.users[id] = true;
    saveDB(db);
  }

  if (id === ADMIN_ID) return next();

  if (text?.startsWith("/start")) return next();

  if (db.banned.includes(String(id))) {
    return ctx.reply("⛔ You are blocked");
  }

  const joined = await isJoined(ctx);
  if (!joined) {
    return ctx.reply("⚠️ Join channels first", joinUI());
  }

  return next();
});

/* ================= START ================= */

bot.start(async (ctx) => {
  if (!(await isJoined(ctx))) {
    return ctx.reply("⚠️ Join channels first", joinUI());
  }
  return ctx.reply(START_MSG);
});

bot.action("check_join", async (ctx) => {
  const ok = await isJoined(ctx);
  if (!ok) return ctx.answerCbQuery("❌ Not Joined", { show_alert: true });
  return ctx.editMessageText(START_MSG);
});

/* ================= HELP ================= */

bot.command("help", (ctx) => {
  ctx.reply("📌 Help Menu", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🆘 Support", callback_data: "support_msg" }]
      ]
    }
  });
});

/* ================= SUPPORT ================= */

bot.action("support_msg", (ctx) => {
  supportState[ctx.from.id] = true;
  ctx.reply("✍️ Send your message");
});

/* ================= PANEL ================= */

bot.command("panel", (ctx) => {
  return ctx.reply("🍊 PANEL", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📧 Gmail", callback_data: "gmail" }],
        [{ text: "🔐 Password", callback_data: "pass" }],
        [{ text: "🌐 Login", url: "https://www.orangecarrier.com/" }],
        [{ text: "👤 Support", url: "https://t.me/Smart_Method_Owner" }]
      ]
    }
  });
});

bot.action("gmail", (ctx) => ctx.reply("📧 Gmail: example@gmail.com"));
bot.action("pass", (ctx) => ctx.reply("🔐 Password: 123456"));

/* ================= ADMIN CHECK ================= */

function adminOnly(ctx) {
  if (ctx.from.id !== ADMIN_ID) {
    ctx.reply("🚫 Admin only");
    return false;
  }
  return true;
}

/* ================= BLOCK ================= */

bot.command("block", (ctx) => {
  if (!adminOnly(ctx)) return;
  const id = ctx.message.text.split(" ")[1];
  const db = loadDB();
  db.banned.push(String(id));
  saveDB(db);
  ctx.reply("✅ Blocked");
});

bot.command("unblock", (ctx) => {
  if (!adminOnly(ctx)) return;
  const id = ctx.message.text.split(" ")[1];
  const db = loadDB();
  db.banned = db.banned.filter(u => u !== String(id));
  saveDB(db);
  ctx.reply("✅ Unblocked");
});

/* ================= BOARDCHAT ================= */

bot.command("boardchat", (ctx) => {
  if (!adminOnly(ctx)) return;
  boardchatState[ADMIN_ID] = true;
  ctx.reply("✍️ Send broadcast message");
});

/* ================= TEXT HANDLER ================= */

bot.on("text", async (ctx) => {
  const id = ctx.from.id;
  const text = ctx.message.text;
  const db = loadDB();

  /* BOARDCHAT */
  if (boardchatState[ADMIN_ID] && id === ADMIN_ID) {
    boardchatState[ADMIN_ID] = false;

    await bot.telegram.sendMessage(GROUP_ID, `📢 ${text}`);

    for (let uid of Object.keys(db.users)) {
      try {
        await bot.telegram.sendMessage(uid, `📢 ${text}`);
      } catch {}
    }

    return ctx.reply("📩 Sent");
  }

  /* SUPPORT */
  if (supportState[id]) {
    supportState[id] = false;

    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 NEW MESSAGE

👤 ${ctx.from.first_name}
🆔 ${id}

💬 ${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💬 Reply", callback_data: `reply_${id}` }]
          ]
        }
      }
    );

    return ctx.reply("📩 Sent to admin");
  }

  /* ADMIN REPLY */
  if (id === ADMIN_ID && adminReply[ADMIN_ID]) {
    const target = adminReply[ADMIN_ID];
    adminReply[ADMIN_ID] = null;

    await bot.telegram.sendMessage(
      target,
      `💬 Admin Reply

👤 Admin
🆔 ${ADMIN_ID}

💬 ${text}`
    );

    return ctx.reply("📩 Sent");
  }
});

/* ================= REPLY BUTTON ================= */

bot.action(/reply_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  adminReply[ADMIN_ID] = ctx.match[1];
  ctx.reply("✍️ Now type reply");
});

/* ================= RANDOM MESSAGES ================= */

const randomMessages = [
"🔥 Don't miss updates!",
"🚀 Join now!",
"💎 Premium access!",
"📢 Stay connected!",
"⚡ New updates!",
"🎯 Best service!",
"💥 Limited offer!",
"🚨 Don't miss!",
"🌐 Join channels!",
"🎉 Daily tricks!"
];

function getRandomMsg() {
  return randomMessages[Math.floor(Math.random() * randomMessages.length)];
}

/* ================= AUTO POST ================= */

setInterval(async () => {
  if (!randomOn) return;

  try {
    const globalLink = await createTempLink(METHOD_CHANNEL);
    const mainLink = await createTempLink(MAIN_CHANNEL);

    const sent = await bot.telegram.sendMessage(
      GROUP_ID,
      `📢 ${getRandomMsg()}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌏 Global", url: globalLink.invite_link }],
            [{ text: "📢 Main", url: mainLink.invite_link }]
          ]
        }
      }
    );

    setTimeout(() => {
      bot.telegram.deleteMessage(GROUP_ID, sent.message_id).catch(() => {});
    }, 240000);

  } catch (e) {
    console.log(e);
  }
}, 120000);

/* ================= LAUNCH ================= */

bot.launch();
console.log("✅ BOT RUNNING");

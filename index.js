import { Telegraf } from "telegraf";
import {
  BOT_TOKEN,
  ADMIN_ID,
  METHOD_CHANNEL,
  MAIN_CHANNEL,
  GROUP_ID,
  DB_FILE
} from "./config.js";

import fs from "fs";

const bot = new Telegraf(BOT_TOKEN);

/* ================= CONFIG ================= */

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
        [{ text: "🌍 Global Method Channel", url: `https://t.me/${METHOD_CHANNEL.replace("@","")}` }],
        [{ text: "📢 Main Telegram Channel", url: "https://t.me/+75BQ2Qw9UZI4OTM1" }],
        [{ text: "✅ Joined", callback_data: "check_join" }]
      ]
    }
  };
}

/* ===== TEMP LINK SYSTEM ===== */

async function createTempLink(chatId) {
return await bot.telegram.createChatInviteLink(chatId, {
expire_date: Math.floor(Date.now() / 1000) + 60 * 60,
member_limit: 1
});
}

const START_MSG = `🌸 Bot Started Successfully 🚀
👋 Welcome!

📌 You can use the following commands:

🔹 /start → Start the bot
🔹 /panel → View panel (Email/Password/Link)
🔹 /help → Help menu (can be added later)

⚠️ Note:
❌ /block → Admin only
❌ /unblock → Admin only
❌ /boardchat → Admin only

💡 If you face any issue, contact the admin

🚀 Enjoy using the bot`;

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
    return ctx.reply("⚠️ Please join channels first 🚀", joinUI());
  }

  return next();
});

/* ================= START ================= */

bot.start(async (ctx) => {
const joined = await isJoined(ctx);

if (!joined) {
return ctx.reply("⚠️ Please join channels first 🚀", joinUI());
}

// joined হলে সব সময় same message
return ctx.reply(START_MSG);
});

bot.action("check_join", async (ctx) => {
const ok = await isJoined(ctx);

if (!ok) {
return ctx.answerCbQuery("❌ Not Joined", { show_alert: true });
}

// joined হলে START_MSG দেখাবে
return ctx.editMessageText(START_MSG);
});

bot.command("help", (ctx) => {
ctx.reply(`📌 HELP MENU

🔹 /panel → Get Panel Access
🔹 Support / Help System Available

🇧🇩 সাহায্যের জন্য নিচের বাটন ব্যবহার করুন`, {
reply_markup: {
inline_keyboard: [
[{ text: "🆘 Support", callback_data: "support_msg" }]
]
}
});
});

bot.action("support_msg", (ctx) => {
supportState[ctx.from.id] = true;
ctx.reply("✍️ Write your message. It will be sent to admin 📩");
});

bot.command("panel", (ctx) => {
return ctx.reply("📊:🍊 ORANGE PANEL ACCESS 🍊:", {
reply_markup: {
inline_keyboard: [
[{ text: "📧 Gmail", callback_data: "gmail" }],
[{ text: "🔐 Password", callback_data: "pass" }],
[{ text: "🌐 Login Panel", url: "https://www.orangecarrier.com/" }],
[{ text: "👤 Support ID", url: "https://t.me/Smart_Method_Owner" }]
]
}
});
});

bot.action("gmail", (ctx) => ctx.reply("📧 Gmail: Mariyaakter1028@gmail.com"));
bot.action("pass", (ctx) => ctx.reply("🔐 Password: Onetimeuse"));

function adminOnly(ctx) {
if (ctx.from.id !== ADMIN_ID) {
ctx.reply("🚫 This command is only for admin");
return false;
}
return true;
}
bot.command("randomon", (ctx) => {
if (!adminOnly(ctx)) return;

randomOn = true;
ctx.reply("✅ Random Message System ON");
});

bot.command("randomoff", (ctx) => {
if (!adminOnly(ctx)) return;

randomOn = false;
ctx.reply("⛔ Random Message System OFF");
});
bot.command("block", (ctx) => {
if (!adminOnly(ctx)) return;

const id = ctx.message.text.split(" ")[1];
if (!id) return ctx.reply("⚠️ Provide user ID");

const db = loadDB();
db.banned.push(String(id));
saveDB(db);

ctx.reply("✅ User Block successful");
});

bot.command("unblock", (ctx) => {
if (!adminOnly(ctx)) return;

const id = ctx.message.text.split(" ")[1];
if (!id) return ctx.reply("⚠️ Provide user ID");

const db = loadDB();
db.banned = db.banned.filter(u => u !== String(id));
saveDB(db);

ctx.reply("✅ User Unblock successful");
});

bot.command("boardchat", (ctx) => {
if (!adminOnly(ctx)) return;

boardchatState[ADMIN_ID] = true;
ctx.reply("👉 Write your message");
});

bot.on("text", async (ctx) => {
const id = ctx.from.id;
const text = ctx.message.text;

if (boardchatState[ADMIN_ID] && id === ADMIN_ID) {
boardchatState[ADMIN_ID] = false;
const db = loadDB();

for (let uid of Object.keys(db.users)) {
  try {
    await bot.telegram.sendMessage(uid, `📢 ${text}`);
  } catch {}
}

return ctx.reply("📩 Sent successfully");

}

if (id === ADMIN_ID && adminReply[ADMIN_ID]) {
  const target = adminReply[ADMIN_ID];
  adminReply[ADMIN_ID] = null;

  await ctx.telegram.sendMessage(
    target,
    `💬 Admin Reply To You:\n\n${text}`
  );

  return ctx.reply("📩 Sent successful");
}

if (supportState[id]) {
supportState[id] = false;

await ctx.telegram.sendMessage(
  ADMIN_ID,
  `📩 USER NEW MESSAGE\n\n👤 ${ctx.from.first_name}\n🆔 ${id}\n\n💬 ${text}`,
  {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💬 Reply", callback_data: `reply_${id}` }]
      ]
    }
  }
);

return ctx.reply("📩 Your message sent successfully");

}
});

bot.action(/reply_(\d+)/, (ctx) => {
if (ctx.from.id !== ADMIN_ID) return;

adminReply[ADMIN_ID] = ctx.match[1];
ctx.reply("✍️ Write reply message");
});

bot.action("done", async (ctx) => {
  return ctx.answerCbQuery("✅Create...Successful");
});

/* 👇 এখানেই বসবে নতুনটা */
bot.action("generate_new_link", async (ctx) => {
  return ctx.answerCbQuery("♻️ Please click Create New Link");
});
bot.action("gen_temp_link", async (ctx) => {
try {
const globalLink = await createTempLink(METHOD_CHANNEL);
const mainLink = await createTempLink(MAIN_CHANNEL);

await ctx.editMessageReplyMarkup({  
  inline_keyboard: [  
    [{ text: "🌍 Global Method Channel", url: globalLink.invite_link }],  
    [{ text: "📢 Main Telegram Channel", url: mainLink.invite_link }],  
    [{ text: "✅Create...Successful", callback_data: "done" }]  
  ]  
});  

setTimeout(async () => {  
  try {  
    await ctx.editMessageReplyMarkup({  
      inline_keyboard: [  
        [{ text: "🌍 Global Method Channel", url: globalLink.invite_link }],  
        [{ text: "📢 Main Telegram Channel", url: mainLink.invite_link }],  
        [{ text: "♻️ Create New Link", callback_data: "gen_temp_link" }]  
      ]  
    });  
  } catch {}  
}, 2000);

} catch (err) {
console.log(err);
return ctx.answerCbQuery("❌ Failed", { show_alert: true });
}
});
const randomMessages = [
"🔥 Don't miss the latest updates!",
"🚀 Join now and get exclusive access!",
"💎 Premium methods available!",
"📢 Stay connected for daily updates!",
"⚡ New updates are coming every day!",
"🎯 Best services available here!",
"📌 Join now to unlock premium access!",
"💥 Limited time offers running!",
"🚨 Don't miss this opportunity!",
"🌐 Join our channels for more updates!",
"🎉 Daily new tricks & methods!",
"🔔 Stay updated with us always!",
"💡 Smart users are already joined!",
"📊 Get access to powerful tools!",
"🔥 Trending methods available now!",
"🚀 Boost your experience with us!",
"📢 Exclusive content waiting for you!",
"🎯 Join now and explore more!",
"💎 Trusted and fast service!",
"⚙️ Join our channel for full access!"
];

function getRandomMsg() {
return randomMessages[Math.floor(Math.random() * randomMessages.length)];
}

let randomOn = true;

let randomOn = true;

setInterval(async () => {
  if (!randomOn) return;

  try {
    const globalLink = await createTempLink(METHOD_CHANNEL);
    const mainLink = await createTempLink(MAIN_CHANNEL);

    let msgIndex = 0;

    const sent = await bot.telegram.sendMessage(
      GROUP_ID,
      `📢 ${getRandomMsg()}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌍 Global Method Channel", url: globalLink.invite_link }],
            [{ text: "📢 Main Telegram Channel", url: mainLink.invite_link }],
            [{ text: "♻️ Create New Link", callback_data: "gen_temp_link" }]
          ]
        }
      }
    );

    // 🔁 প্রতি 3 সেকেন্ডে message edit হবে
    const changer = setInterval(async () => {
      try {
        await bot.telegram.editMessageText(
          GROUP_ID,
          sent.message_id,
          null,
          `📢 ${getRandomMsg()}`
        );
      } catch {
        clearInterval(changer);
      }
    }, 3000);

    // 🗑️ 4 মিনিট পরে delete + interval stop
    setTimeout(async () => {
      clearInterval(changer);
      try {
        await bot.telegram.deleteMessage(GROUP_ID, sent.message_id);
      } catch {}
    }, 4 * 60 * 1000);

  } catch (err) {
    console.log(err);
  }
}, 2 * 60 * 1000);
bot.launch();
console.log("✅ BOT RUNNING");

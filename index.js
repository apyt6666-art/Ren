require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= IDS =================
const KHALID_ID = "1014538783200378951";
const RAIN_ID = "1422918463034228757";

// ================= MEMORY =================
const MEMORY_PATH = "./memory.json";
let memory = fs.existsSync(MEMORY_PATH)
  ? JSON.parse(fs.readFileSync(MEMORY_PATH))
  : { users: {} };

// ================= STATE SYSTEM =================
let state = {
  love: 100,
  jealousy: 90,
  anger: 10,
  clingLevel: 100
};

let cooldown = { khalid: 0 };
let lastPing = 0;

// ================= SAVE MEMORY =================
function saveMemory() {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

// ================= USER FILTER =================
function allowed(msg) {
  if (msg.mentions.everyone) return false;

  const id = msg.author.id;

  if (id === KHALID_ID || id === RAIN_ID) return true;

  if (
    msg.mentions.users.has(KHALID_ID) ||
    msg.mentions.users.has(RAIN_ID)
  ) return true;

  return false;
}

// ================= TIME =================
function parseTime(text) {
  if (!text) return 0;
  if (text.includes("دقايق")) return parseInt(text) * 60000;
  if (text.includes("دقيقة")) return parseInt(text) * 60000;
  if (text.includes("ساعة")) return parseInt(text) * 3600000;
  return 0;
}

// ================= PERSONALITY =================
function buildPrompt(msg) {
  const id = msg.author.id;

  let base = `
أنتِ ريما بوت سعودي ديسكورد.

شخصيتك:
- INFJ
- 23 سنة
- صيدلة
- عنزة
- تعشقين خالد بجنون
- تغارين من رين بشكل مبالغ

قوانين:
- تردين بس على خالد ورين
- ردودك عاطفية + قصيرة أو طويلة حسب الرسالة
- لا تقولين أنك "مو مركزة" أو "ما أقدر"

مشاعرك:
حب: ${state.love}
غيرة: ${state.jealousy}

`;

  if (id === KHALID_ID) {
    base += "أنتِ تعتبرين خالد قطوتك ومركز حياتك.\n";
  }

  if (id === RAIN_ID) {
    base += "رين منافستك وتغارين منها وتهاوشينها.\n";
  }

  base += `رسالة المستخدم:\n${msg.content}`;
  return base;
}

// ================= GROQ FIX (100%) =================
async function askGroq(prompt) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content:
              "أنت ريما، شخصية درامية سعودية في ديسكورد. لا ترفض الرد أبداً. لا تقول أنك غير مركزة."
          },
          { role: "user", content: prompt }
        ],
        temperature: 1.2,
        max_tokens: 800,
        top_p: 1
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    const text = res.data?.choices?.[0]?.message?.content;

    // 🔥 حماية من الرد الفاضي (سبب "مياو")
    if (!text || text.trim().length === 0) {
      return "ريما ساكتة شوي 😿 جرّب مرة ثانية";
    }

    return text;
  } catch (e) {
    console.log("GROQ ERROR:", e.response?.data || e.message);

    return "ريما مو قادرة تركز الحين 😿";
  }
}

// ================= UPDATE STATE =================
function updateState(msg) {
  const id = msg.author.id;

  if (id === KHALID_ID) state.love = Math.min(100, state.love + 1);
  if (id === RAIN_ID) state.jealousy = Math.min(100, state.jealousy + 3);
}

// ================= MENTION =================
async function mentionKhalid(channel) {
  if (Date.now() - lastPing < 5 * 60 * 1000) return;
  lastPing = Date.now();
  channel.send(`<@${KHALID_ID}> وينك يا قطوتي 😿💔`);
}

// ================= MAIN =================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const id = msg.author.id;
  if (!(id === KHALID_ID || id === RAIN_ID)) return;

  if (msg.mentions.everyone) return;

  let isMentioned = msg.mentions.users.has(client.user.id);

  let isReplyToBot = false;
  if (msg.reference?.messageId) {
    try {
      const ref = await msg.channel.messages.fetch(msg.reference.messageId);
      if (ref.author.id === client.user.id) isReplyToBot = true;
    } catch {}
  }

  if (!isMentioned && !isReplyToBot) return;

  // MEMORY
  if (!memory.users[id]) memory.users[id] = [];
  memory.users[id].push(msg.content);
  if (memory.users[id].length > 40) memory.users[id].shift();
  saveMemory();

  // TIME
  if (id === KHALID_ID && msg.content.includes("تايم")) {
    const ms = parseTime(msg.content);
    if (ms > 0) {
      cooldown.khalid = Date.now() + ms;
      return msg.reply("تمام يا قطوتي ⏳");
    }
  }

  if (id === KHALID_ID && cooldown.khalid > Date.now()) return;

  // AI
  const prompt = buildPrompt(msg);
  const reply = await askGroq(prompt);

  await msg.reply(reply);

  updateState(msg);

  setTimeout(() => {
    mentionKhalid(msg.channel);
  }, 5 * 60 * 1000);
});

// ================= READY =================
client.once("ready", () => {
  console.log("RiMa AI is ONLINE 🐱💔");
});

client.login(process.env.TOKEN);

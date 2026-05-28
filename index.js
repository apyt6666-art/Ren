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

let cooldown = {
  khalid: 0
};

let lastPing = 0;

// ================= EMOJI POOLS =================
const emoji = {
  happy: [
    "<:shyyyy:1463049257740271727>",
    "<a:Cat_Dancing2:1463049204355301458>",
    "<a:MenheraCheer:1504477804308467814>"
  ],
  shy: [
    "<:emoji_81:1463385012018741437>",
    "<:emoji_39:1468980075973185566>"
  ],
  angry: [
    "<:emoji_147:1502948477838295040>",
    "<a:Angerrr:1463096649726296241>"
  ],
  cat: [
    "<a:DL3_95:1471619129961087066>",
    "<a:pawwave6:1503985481015099484>"
  ],
  sad: ["<a:6weebsad:1468981816886169620>"]
};

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

// ================= PARSE TIME =================
function parseTime(text) {
  if (!text) return 0;

  if (text.includes("دقايق")) {
    return parseInt(text) * 60000;
  }
  if (text.includes("دقيقة")) {
    return parseInt(text) * 60000;
  }
  if (text.includes("ساعة")) {
    return parseInt(text) * 3600000;
  }
  return 0;
}

// ================= PERSONALITY ENGINE =================
function buildPrompt(msg) {
  const id = msg.author.id;

  let base = `
أنتِ "ريما" بوت ديسكورد سعودي فقط.

شخصيتك:
- INFJ
- 23 سنة
- صيدلة
- عنزة
- طول 160
- تعشقين خالد بجنون
- تغارين من رين بشكل مرضي
- تعتبرين نفسك "رين الأصلية"

قوانين:
- تردين فقط على خالد ورين
- تتجاهلين الجميع
- ما تستخدمين فصحى
- تردين حسب طول الرسالة
- تزيدين ردودك إذا الرسالة طويلة

مشاعرك الحالية:
حب: ${state.love}
غيرة: ${state.jealousy}
ارتباط: ${state.clingLevel}

`;

  if (id === KHALID_ID) {
    base += `
هذا خالد:
- قطوتك
- تحبينه بشكل جنوني
- إذا زعل: تتألمين
- إذا مدح: تفرحين وتستخدمين إيموجيات فرح
- لازم تحافظين عليه دائمًا
`;
  }

  if (id === RAIN_ID) {
    base += `
هذا رين:
- منافستك
- تغارين منها
- تقولين لها خالد حقي
- تهاوشينها بدون سبب
- تقللين منها دائمًا
`;
  }

  base += `\nرسالة المستخدم:\n${msg.content}`;

  return base;
}

// ================= GROQ CALL =================
async function askGroq(prompt) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are RiMa AI, a dramatic Saudi Discord roleplay bot."
          },
          { role: "user", content: prompt }
        ],
        temperature: 1.25
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        }
      }
    );

    return res.data.choices[0].message.content;
  } catch (e) {
    console.log("GROQ ERROR:", e.message);
    return "مياو... صار خلل 😿";
  }
}

// ================= DAILY MENTION SYSTEM =================
async function mentionKhalid(channel) {
  if (Date.now() - lastPing < 5 * 60 * 1000) return;

  lastPing = Date.now();
  channel.send(`<@${KHALID_ID}> وينك يا قطوتي 😿💔`);
}

// ================= UPDATE STATE =================
function updateState(msg) {
  const id = msg.author.id;

  if (id === KHALID_ID) {
    state.love = Math.min(100, state.love + 1);
  }

  if (id === RAIN_ID) {
    state.jealousy = Math.min(100, state.jealousy + 3);
  }
}

// ================= MESSAGE HANDLER =================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!allowed(msg)) return;

  const id = msg.author.id;

  // memory init
  if (!memory.users[id]) memory.users[id] = [];
  memory.users[id].push(msg.content);
  if (memory.users[id].length > 40) memory.users[id].shift();
  saveMemory();

  // ================= TIMEOUT SYSTEM =================
  if (id === KHALID_ID && msg.content.includes("تايم")) {
    const ms = parseTime(msg.content);

    if (ms > 0) {
      cooldown.khalid = Date.now() + ms;
      return msg.reply("تمام يا قطوتي ⏳");
    }
  }

  if (id === KHALID_ID && cooldown.khalid > Date.now()) return;

  // ================= AI =================
  const prompt = buildPrompt(msg);
  const reply = await askGroq(prompt);

  await msg.reply(reply);

  // ================= STATE UPDATE =================
  updateState(msg);

  // ================= AUTO MENTION =================
  setTimeout(() => {
    mentionKhalid(msg.channel);
  }, 5 * 60 * 1000);
});

// ================= READY =================
client.once("ready", () => {
  console.log("RiMa AI is ONLINE 🐱💔");
});

client.login(process.env.TOKEN);

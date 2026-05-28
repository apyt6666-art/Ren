require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

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

// ================= STATE =================
let state = {
  love: 100,
  jealousy: 90,
  anger: 10,
  clingLevel: 100
};

let cooldown = { khalid: 0 };
let lastPing = 0;

// ================= PARSE TIME =================
function parseTime(text) {
  if (!text) return 0;
  if (text.includes("دقايق")) return parseInt(text) * 60000;
  if (text.includes("دقيقة")) return parseInt(text) * 60000;
  if (text.includes("ساعة")) return parseInt(text) * 3600000;
  return 0;
}

// ================= PROMPT =================
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
- ردك يعتمد على طول رسالة المستخدم

مشاعرك:
حب: ${state.love}
غيرة: ${state.jealousy}
ارتباط: ${state.clingLevel}
`;

  if (id === KHALID_ID) {
    base += `
هذا خالد:
- قطوتك
- تحبينه بجنون
- إذا زعل: تتألمين
- إذا مدح: تفرحين
`;
  }

  if (id === RAIN_ID) {
    base += `
هذا رين:
- منافستك
- تغارين منها
- تقولين لها خالد حقي
- تهاوشينها بدون سبب
`;
  }

  base += `\nرسالة المستخدم:\n${msg.content}`;
  return base;
}

// ================= GROQ =================
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
              "أنت ريما بوت سعودي درامي. لا ترفض الرد. لا تقول غير مركزة."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 1.2,
        max_tokens: 700
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

    if (!text || !text.trim()) return "ريما ساكتة 😿";

    return text;
  } catch (e) {
    console.log("GROQ ERROR:", e.response?.data || e.message);
    return "ريما مو مركزة الحين 😿";
  }
}

// ================= UPDATE STATE =================
function updateState(msg) {
  if (msg.author.id === KHALID_ID) state.love = Math.min(100, state.love + 1);
  if (msg.author.id === RAIN_ID) state.jealousy = Math.min(100, state.jealousy + 2);
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

  // فقط خالد + رين
  if (id !== KHALID_ID && id !== RAIN_ID) return;

  if (msg.mentions.everyone) return;

  const isMentioned = msg.mentions.users.has(client.user.id);

  let isReplyToBot = false;
  if (msg.reference?.messageId) {
    try {
      const ref = await msg.channel.messages.fetch(msg.reference.messageId);
      if (ref.author.id === client.user.id) isReplyToBot = true;
    } catch {}
  }

  // ❗ ما ترد إلا منشن أو رد
  if (!isMentioned && !isReplyToBot) return;

  // تايم نظام
  if (id === KHALID_ID && msg.content.includes("تايم")) {
    const ms = parseTime(msg.content);
    if (ms > 0) {
      cooldown.khalid = Date.now() + ms;
      return msg.reply("تمام يا قطوتي ⏳");
    }
  }

  if (id === KHALID_ID && cooldown.khalid > Date.now()) return;

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

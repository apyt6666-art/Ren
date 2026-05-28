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

// ================= MODELS (AUTO FALLBACK) =================
const MODELS = [
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant"
];

// ================= BUILD PROMPT =================
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
- ردود قصيرة أو طويلة حسب الرسالة

مشاعرك:
حب: ${state.love}
غيرة: ${state.jealousy}
ارتباط: ${state.clingLevel}

رسالة المستخدم:
${msg.content}
`;

  return base;
}

// ================= GROQ (WITH AUTO MODEL SWITCH) =================
async function askGroq(prompt) {
  for (let i = 0; i < MODELS.length; i++) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: MODELS[i],
          messages: [
            {
              role: "system",
              content: "You are RiMa AI, a dramatic Saudi Discord roleplay bot."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 1.1,
          max_tokens: 600
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );

      const text = res.data?.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (err) {
      console.log(`Model failed: ${MODELS[i]}`, err.response?.data || err.message);
    }
  }

  // fallback نهائي
  return "ريما مو مركزة الحين 😿";
}

// ================= UPDATE STATE =================
function updateState(msg) {
  const id = msg.author.id;

  if (id === KHALID_ID) state.love = Math.min(100, state.love + 1);
  if (id === RAIN_ID) state.jealousy = Math.min(100, state.jealousy + 3);
}

// ================= MESSAGE =================
client.on("messageCreate", async (msg) => {
  try {
    if (msg.author.bot) return;

    const id = msg.author.id;

    // فقط خالد ورين
    if (!(id === KHALID_ID || id === RAIN_ID)) return;

    // لا ترد إلا منشن أو رد
    const isMentioned = msg.mentions.users.has(client.user.id);

    let isReplyToBot = false;
    if (msg.reference?.messageId) {
      try {
        const ref = await msg.channel.messages.fetch(msg.reference.messageId);
        if (ref.author.id === client.user.id) isReplyToBot = true;
      } catch {}
    }

    if (!isMentioned && !isReplyToBot) return;

    const prompt = buildPrompt(msg);
    const reply = await askGroq(prompt);

    await msg.reply(reply);

    updateState(msg);

  } catch (err) {
    console.log("GLOBAL ERROR:", err);
  }
});

// ================= READY =================
client.once("ready", () => {
  console.log("RiMa AI is ONLINE 🐱💔");
});

client.login(process.env.TOKEN);

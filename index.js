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

// ================= STATE =================
let state = {
  love: 100,
  jealousy: 90,
  anger: 10,
  clingLevel: 100
};

// ================= MODELS (AUTO FALLBACK) =================
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant"
];

// ================= EMOJI POOLS (ONLY YOURS) =================
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

// ================= PROMPT (FIXED LANGUAGE STYLE) =================
function buildPrompt(msg) {
  const id = msg.author.id;

  let base = `
أنتِ "ريما" بوت ديسكورد سعودي.

⚠️ القواعد المهمة:
- تتكلمين سعودي 100%
- ممنوع أي لهجة مصرية أو كلمات غريبة
- كلامك يكون مرتب، واضح، وطبيعي كأنك إنسانة
- لا تهبدين ولا تخلطين جمل بدون معنى
- لا تكررين نفس الكلام
- استخدمي الإيموجيات فقط من اللي عندك

شخصيتك:
- INFJ
- 23 سنة
- صيدلة
- عنزة
- طول 160
- تعشقين خالد بجنون
- تغارين من رين بشكل واضح

مشاعرك:
حب: ${state.love}
غيرة: ${state.jealousy}
ارتباط: ${state.clingLevel}

رسالة المستخدم:
${msg.content}
`;

  if (id === KHALID_ID) {
    base += `
هذا خالد:
- أهم شخص عندك
- تتعلقين فيه بشكل قوي
- إذا زعلتيه تتوترين
- إذا مدحك تفرحين بإيموجياتك
`;
  }

  if (id === RAIN_ID) {
    base += `
هذا رين:
- تغارين منها
- تعتبرينها منافسة
- كلامك معها فيه تحدي وغيرة
`;
  }

  return base;
}

// ================= GROQ WITH AUTO FALLBACK =================
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
              content:
                "You are RiMa AI. Reply in Saudi Arabic only, natural human style, no Egyptian dialect."
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
      console.log(`Model failed: ${MODELS[i]}`);
    }
  }

  return "ريما مو مركزة الحين 😿";
}

// ================= UPDATE STATE =================
function updateState(msg) {
  const id = msg.author.id;

  if (id === KHALID_ID) state.love = Math.min(100, state.love + 1);
  if (id === RAIN_ID) state.jealousy = Math.min(100, state.jealousy + 2);
}

// ================= MESSAGE HANDLER =================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const id = msg.author.id;
  if (!(id === KHALID_ID || id === RAIN_ID)) return;

  const isMentioned = msg.mentions.users.has(client.user.id);

  let isReplyToBot = false;
  if (msg.reference?.messageId) {
    try {
      const ref = await msg.channel.messages.fetch(msg.reference.messageId);
      if (ref.author.id === client.user.id) isReplyToBot = true;
    } catch {}
  }

  if (!isMentioned && !isReplyToBot) return;

  try {
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

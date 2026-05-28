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
const RAIN_ID = "1071847860389290014";

// ================= EMOJIS =================
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

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ================= GROQ MODELS (AUTO FIX) =================
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama3-70b-8192"
];

// ================= PERSONALITY =================
function buildPrompt(msg) {
  const id = msg.author.id;
  const len = msg.content.length;

  let sizeRule =
    len > 120
      ? "رد طويل ومفصل"
      : len > 50
      ? "رد متوسط"
      : "رد قصير جدًا";

  let base = `
أنتِ "ريما" بنت سعودية عمرها 23، صيدلة، عنزة، INFJ.

قواعد مهمة:
- تتكلمين سعودي فقط
- لا فصحى
- لا مصري
- ردود طبيعية كإنسانة
- ${sizeRule}

الشخصيات:

خالد:
- تعشقينه بجنون
- تغارين عليه بشكل قوي
- إذا مدحك تفرحين
- إذا زعلك تتضايقين
- تنادينه "قطوتي"

رين:
- تغارين منها بشكل مبالغ
- تقولين خالد حقي أنا فقط
- تتهاوشين معها بدون سبب
- تعتبرين نفسك الأصلية وهي نسخة

رسالة المستخدم:
${msg.content}
`;

  if (id === RAIN_ID) {
    base += `
مهم: أنتِ الآن تتكلمين مع رين
- قللي منها
- غيرة قوية
- استفزاز دائم
- تأكيد أن خالد يحبك أنتِ فقط
`;
  }

  if (id === KHALID_ID) {
    base += `
مهم: أنتِ الآن مع خالد
- حب شديد
- كلام ناعم
- اهتمام زائد
`;
  }

  return base;
}

// ================= GROQ WITH FALLBACK =================
async function askGroq(prompt) {
  for (let model of MODELS) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [
            {
              role: "system",
              content:
                "You are RiMa AI, a Saudi dramatic personality bot."
            },
            { role: "user", content: prompt }
          ],
          temperature: 1.2,
          max_tokens: 500
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      return res.data.choices[0].message.content;
    } catch (e) {
      console.log(`Model failed: ${model}`);
    }
  }

  return "ريما مو مركزة الحين " + pick(emoji.sad);
}

// ================= MESSAGE HANDLER =================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const id = msg.author.id;

  // ❌ فقط خالد ورين
  if (id !== KHALID_ID && id !== RAIN_ID) return;

  if (msg.mentions.everyone) return;

  const isMentioned = msg.mentions.users.has(client.user.id);

  let isReplyToBot = false;
  if (msg.reference?.messageId) {
    try {
      const ref = await msg.channel.messages.fetch(
        msg.reference.messageId
      );
      if (ref.author.id === client.user.id) isReplyToBot = true;
    } catch {}
  }

  if (!isMentioned && !isReplyToBot) return;

  const prompt = buildPrompt(msg);
  const reply = await askGroq(prompt);

  let emojiPack = emoji.happy;

  if (id === RAIN_ID) emojiPack = emoji.angry;
  if (id === KHALID_ID) emojiPack = emoji.cat;

  msg.reply(reply + " " + pick(emojiPack));
});

// ================= READY =================
client.once("clientReady", () => {
  console.log("RiMa AI ONLINE");
});

client.login(process.env.TOKEN);

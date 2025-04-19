const { Bot } = require("grammy");
const {
  conversations,
  createConversation,
} = require("@grammyjs/conversations");
const Question = require("./schema/QuestionModel");

const bot = new Bot(process.env.TOKEN);
bot.use(conversations());

const adminMiddleware = async (ctx, next) => {
  if (ctx.from?.id !== process.env.ADMIN) {
    await ctx.reply("You are not admin to use this bot.");
    return;
  }
  return next();
};

bot.command("start", async (ctx) => {
  await ctx.reply(`Welcome to study up ${ctx.message.from.first_name}!

You can control me by sending these commands:
        
/newword - create a new quiz
/mywords - start your quizzes
        `);
});

async function newWordConversation(conversation, ctx) {
  await ctx.reply("This format send: `short-kichik:work-ish:late-kech=6`", {
    parse_mode: "Markdown",
  });

  const msg = await conversation.wait();
  const word = msg.message?.text;

  if (word) {
    const target = await Question.findOne({
      memberId: String(ctx.from?.id),
    }).exec();

    if (target) {
      await Question.findOneAndUpdate(
        { memberId: String(ctx.from?.id) },
        { question: word },
        { new: true }
      ).exec();
    } else {
      try {
        await Question.create({
          memberId: String(ctx.from?.id),
          question: word,
        });
      } catch (err) {
        await ctx.reply("Something went wrong!");
      }
    }
    await ctx.reply(`Successfully add! Start your quizzes /mywords`);
  } else {
    await ctx.reply("This format sending please!");
  }
}

bot.use(createConversation(newWordConversation));

bot.command("newword", async (ctx) => {
  await ctx.conversation.enter("newWordConversation");
});

bot.command("mywords", async (ctx) => {
  const result = await Question.findOne({
    memberId: String(ctx.from?.id),
  }).exec();

  if (result) {
    const [pairStr, delayStr] = result.question.split("=");
    const delay = parseInt(delayStr) * 1000;

    const pairList = pairStr.split(":").map((pair) => pair.split("-"));

    function shuffleArray(arr) {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    const questions = pairList.map(([eng, uz], _, arr) => {
      let wrongOptions = arr.filter(([e]) => e !== eng).map(([_, u]) => u);

      wrongOptions = shuffleArray(wrongOptions).slice(0, 2);
      const options = shuffleArray([uz, ...wrongOptions, "i don't"]);

      return {
        question: `${eng}`,
        options,
        correct_option_id: options.indexOf(uz),
        explanation: `${eng} - ${uz}`,
      };
    });

    let previousPollMessageId = null;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      setTimeout(async () => {
        try {
          if (previousPollMessageId) {
            await ctx.api.deleteMessage(ctx.chat.id, previousPollMessageId);
          }

          const sentPoll = await ctx.api.sendPoll(
            ctx.chat.id,
            q.question,
            q.options,
            {
              is_anonymous: false,
              allows_multiple_answers: false,
              type: "quiz",
              correct_option_id: q.correct_option_id,
              explanation: q.explanation,
            }
          );

          previousPollMessageId = sentPoll.message_id;

          if (i === questions.length - 1) {
            setTimeout(() => {
              ctx.reply("Question end! Tap to /mywords");
            }, 2000);
          }
        } catch (error) {
          ctx.reply("Something went wrong! Tap to /start");
        }
      }, i * delay);
    }
  } else {
    await ctx.reply(`Not found your words!`);
  }
});

bot.command("admin", adminMiddleware, async (ctx) => {
  await ctx.reply("Welcome admin!");
});

bot.catch((err) => console.error("Error in bot:", err));

module.exports = bot;

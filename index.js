const {
    Client,
    GatewayIntentBits,
    AttachmentBuilder
} = require("discord.js");

const puppeteer = require("puppeteer-extra");
const ffmpeg = require("fluent-ffmpeg");

const path = require("path");
const fs = require("fs");

const {
    PuppeteerScreenRecorder
} = require("puppeteer-screen-recorder");

const Config = {
    followNewTab: true,
    fps: 60,
    ffmpeg_Path: "C:\\ffmpeg\\bin\\ffmpeg.exe" || null,
    videoFrame: {
        width: 1920,
        height: 1080,
    },
    videoCrf: 18,
    videoBitrate: 2500
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
    if (message.content.match(new RegExp(`^<@!?${client.user.id}>( |)$`))) {

        if (!message.reference) {
            return;
        }

        console.log("creation pour " + message.author.username);

        const m = await message.fetchReference();
        await createVideo(m, message.author.username, Date.now());
    }
});
async function createVideo(message, username, time) {
    const browser = await puppeteer.launch({
        defaultViewport: null
    });

    time = time.toString();

    fs.cpSync(path.join(__dirname, "website"), path.join(__dirname, "data", time), {
        recursive: true
    });

    const content = message.content.replace(/\n\s*\n\s*\n/g, "\n\n");
    let data = fs.readFileSync(path.join(__dirname, "data", time, "index.html"), "utf-8");

    data = data.replace("%USER%", username);

    const hey = content.split("\n");
    let s = "";

    for (const h of hey) {
        s = s + "<p>" + h + "</p>\n";
    }

    data = data.replace("%PARAGRAPHS%", s);

    fs.writeFileSync(path.join(__dirname, "data", time, "index.html"), data);

    const [page] = await browser.pages()
    const recorder = new PuppeteerScreenRecorder(page, Config);

    await page.goto("file://" + path.join(__dirname, "data", time, "index.html"));
    await recorder.start(path.join(__dirname, "data", time, "simple.mp4"));

    const now = Date.now();

    await waitForCondition(page);

    await recorder.stop();
    await browser.close();

    console.log((now - Date.now()) / 1000);

    ffmpeg()
        .addInput(path.join(__dirname, "data", time, "simple.mp4"))
        .addInput("./website/audio.mp3")
        .duration((Date.now() - now) / 1000)
        .output(path.join(__dirname, "data", time, "output.mp4"))
        .videoCodec("libx264")
        .outputOptions("-preset ultrafast")
        .on("end", async function() {
            if (message) {
                const file = await new AttachmentBuilder(path.join(__dirname, "data", time, "output.mp4"));

                await message.reply({
                    files: [file]
                });
            }

            fs.rmSync(path.join(__dirname, "data", time), {
                recursive: true,
                force: true
            });
        })
        .run();
}

async function waitForCondition(page) {
    while (true) {
        const element = await page.$(".HIDEPLEASE");
        const x = await page.evaluate(el => el.getBoundingClientRect().x, element);

        console.log(x);

        if (x > 300) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

client.login("MTA5NjYwNDgwODQ5ODEyMjg3Mg.G3b2Ta.fXgalLOGMMLlN1fZ_xqkXW7aWyoQPq08ksknq0");
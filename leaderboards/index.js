// this is dumb

const { Client, Events, GatewayIntentBits } = require("discord.js");
const { readFileSync, writeFileSync, existsSync } = require("fs");
const Emotes = require("./tables/emotes.json");
const { parse } = require("./parser.js");
const { execSync } = require("child_process");
const axios = require("axios");
const { exit } = require("process");
const test = process.argv.indexOf("--test");

let weeklySeed, dailySeed;

const params = {
    token: process.env.DISCORD_API_TOKEN,
    token_github: process.env.API_TOKEN_GITHUB,
    mail: process.env.MAIL,

    webhooks: {
        daily: process.env.WEBHOOK_DAILY,
        weekly: process.env.WEBHOOK_WEEKLY
    }
};

const client = new Client({
    intents: [ GatewayIntentBits.Guilds | GatewayIntentBits.MessageContent ]
});

function getCurrentDate() {
    let today = new Date();
    let minute = today.getMinutes();
    let day = today.getDate();
    let month = (today.getMonth() + 1);

    if (minute < 10)
        minute = "0" + minute;
    if (day < 10)
        day = "0" + day;
    if (month < 10)
        month = "0" + month;

    return day + "/" + month + " " + today.getHours() + ":" + minute;
}

function sendLeaderboards(kind, list) {
    if (test)
        return;

    let url = params.webhooks[kind];

    if (!url)
        return;
    
    let title = kind.replace(kind[0], kind[0].toUpperCase());
    
    let embed = {
        title: title + " Leaderboards at " + getCurrentDate() + ` (${list.length} entries) ${Emotes.None.repeat(6)}`,
        description: ""
    };

    for(let i = 0; i < Math.min(10, list.length); i ++) {
        let item = list[i];
        let icon = Emotes.Characters[item.char][item.skin ? 1 : 0];
        
        let place = (i + 1),
            suffix = "th.";

        switch (place) {
            case 1: suffix = "st."; break;
            case 2: suffix = "nd."; break;
            case 3: suffix = "rd."; break;
        }

        let areaString = areaGetString(item.area, item.subarea, item.loops);

        // living hell, you might say
        embed.description += `## ${place + suffix} ${icon} ${item.name}\n${Emotes.None}${Emotes.Kills} **Kills**: ${item.kills}\n${Emotes.None}${Emotes.Distance} **Distance**: ${areaString}\n\n`
    }

    axios.post(url, { content: "", embeds: [ embed ] });
}

function getWeekNumber(d) {
    let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

    return Math.ceil(( ( (d - yearStart) / 86400000) + 1) / 7);
}

function areaGetString(area, subarea, loops) {
    let _area = "?",
        _subarea = "?",
        _loop = "";

    if (area == 106) {
        _area = "HQ";
        _subarea = subarea;
    }
    else if (area == 107) {
        _area = "$$$";
        _subarea = "";
    }
    else if (area > 100) {
        _area = area - 100;
        _subarea = "-?";
    }
    else if (area == 100) {
        _area = "???";
        _subarea = "";
    }
    else {
        _area = area;
        _subarea = "-" + subarea;
    }

    if (loops > 0)
        _loop = " L" + loops;

    return _area + _subarea + _loop;
}



client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

    const checkSeed = (stat, seed) => (Number.isInteger(stat.runId) && stat.runId == seed);

    client.user.setActivity("Nuclear Throne Mobile");

    let channel;

    //#region Daily
    channel = client.channels.cache.get("676014515078430751");

    channel.messages.fetch({ limit: 100 }).then(messages => {
        let date = new Date().getDate();
        let dailylist = {};
        let entries = {};

        let reset = false;

        if (existsSync("./leaderboards/dailylist.json")) {
            dailylist = JSON.parse(readFileSync("./leaderboards/dailylist.json", "utf-8"));

			entries = dailylist.entries;
			
            if (dailylist.day != date)
                reset = true;
        }

        console.log(`(Daily) Received ${messages.size} messages`);

        messages.forEach(message => {
            if (!message.embeds || !message.embeds[0])
                return;

            let stats = parse(message.embeds[0]);
            let uid = stats.uid ?? message.id;

            if (!entries[uid]) {
                let day = new Date(message.createdTimestamp);

                console.log(stats.name, "day:", day.getDate(), date);
        
                if (day.getDate() == date) {//(checkSeed(stats, dailySeed) || (stats.version && stats.version[2] == "5" && day.getDate() == date)) {
                    console.log("New entry from", stats.name + "|" + uid);
                    entries[uid] = stats;
                }
            }
        });

        let list = Object.values(entries);

        console.log("Entires count:", list.length);

        if (reset) {
            list.sort((a, b) => b.kills - a.kills);

            sendLeaderboards("daily", list);

            entries = {};
        }

        writeFileSync("./leaderboards/dailylist.json",
            JSON.stringify(
            {
                day: date,
                entries: entries
            },
            null, 2)
        );
    });

    //#endregion

    //#region Weekly

    channel = client.channels.cache.get("764114358052585492");

    channel.messages.fetch({ limit: 100 }).then(messages => {
        let weeklylist = {};
        let entries = {};

        let weekNumber = getWeekNumber(new Date());

        let reset = false;

        if (existsSync("./leaderboards/weeklylist.json")) {
            weeklylist = JSON.parse(readFileSync("./leaderboards/weeklylist.json", "utf-8"));

			entries = weeklylist.entries;
			
            if (weeklylist.seed != weeklySeed)
                reset = true;
        }

        console.log(`(Weekly) Received ${messages.size} messages`);

        messages.forEach(message => {
            if (!message.embeds || !message.embeds[0])
                return;

            if (message.embeds[0].footer.text == "(no score improvement)")
                return;

            let stats = parse(message.embeds[0]);
            let uid = stats.uid ?? stats.name;
    
            let num = getWeekNumber(new Date(message.createdTimestamp));

            console.log(stats.name, "week:", num, weekNumber);

            if (num == weekNumber) {//(checkSeed(stats, weeklySeed) || (stats.version[2] == "5" && num == weekNumber)) {
                let entry = entries[uid];
    
                if (!entry || (entry && entry.kills < stats.kills)) {
                    console.log("New entry from", stats.name + "|" + uid);
                    entries[uid] = stats;
                }
            }
        });

        let list = Object.values(entries);

        console.log("Entires count:", list.length);

        if (reset) {
            list.sort((a, b) => b.kills - a.kills);

            sendLeaderboards("weekly", list);

            entries = {};
        }

        writeFileSync("./leaderboards/weeklylist.json",
            JSON.stringify(
            {
                seed: weeklySeed,
                entries: entries
            },
            null, 2)
        );
    });

    //#endregion
    
});

async function start() {
    let dailydata = await (axios.get("https://raw.githubusercontent.com/toarch7/torcherdev/main/dailydata.json"));
    let weeklydata = await (axios.get("https://raw.githubusercontent.com/toarch7/torcherdev/main/weeklydata.json"));

    dailySeed = dailydata.data.seed;
    weeklySeed = weeklydata.data.seed;

    console.log("Daily seed", dailySeed);
    console.log("Weekly seed", weeklySeed);

    client.login(params.token);

    setTimeout(() => {
        if (!test) {
            console.log("Pushing changes");
            execSync("chmod +x ./push.sh && bash ./push.sh");
        }

        console.log("Trying to shutdown the client...");

        client.destroy()
			.catch(() => {
                console.log("Shutdown failed! I hate Discord.JS");
            });
    },
    10000);
}

start()
.catch((err) => {
    console.log(err);
    console.error("Something went wrong...");
});
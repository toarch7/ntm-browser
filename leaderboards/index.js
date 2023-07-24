const { Client, Events, GatewayIntentBits } = require("discord.js");
const { readFileSync, writeFileSync, existsSync } = require("fs");
const Emotes = require("./tables/emotes.json");
const { parse } = require("./parser.js");
const axios = require("axios");

const params = {
    token: process.env.DISCORD_API_TOKEN,

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

        // living hell, you might say
        embed.description += `## ${place + suffix} ${icon} ${item.name}\n${Emotes.None}${Emotes.Kills} **Kills**: ${item.kills}\n${Emotes.None}${Emotes.Distance} **Distance**: ${item.areaString}\n\n`
    }

    axios.post(url, { content: "", embeds: [ embed ] });
}

function getWeekNumber(d) {
    let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

    return Math.ceil(( ( (d - yearStart) / 86400000) + 1) / 7);
}

let weeklySeed = 123;

client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

    let channel;

    //#region Daily
    channel = client.channels.cache.get("676014515078430751");

    channel.messages.fetch({ limit: 100 }).then(messages => {
        let date = new Date().getDate();
        let dailylist = {};
        let entries = {};

        let reset = false;

        if (existsSync("dailylist.json")) {
            dailylist = JSON.parse(readFileSync("./dailylist.json", "utf-8"));

			entires = dailylist.entries;
			
            if (dailylist.day != date)
                reset = true;
        }

        console.log(`Received ${messages.size} messages`);

        messages.forEach(message => {
            if (!entries[message.id]) {
                let day = new Date(message.createdTimestamp);
        
                if (date != day.getDate())
                    return;

				let stats = parse(message.embeds[0]);
				console.log("New entry from", stats.name);
                entries[message.id] = stats;
            }
        });

        let list = Object.values(entries);

        console.log("Entires count:", list.length);

        if (reset) {
            list.sort((a, b) => b.kills - a.kills);

            sendLeaderboards("daily", list);

            entries = {};
        }

        writeFileSync("dailylist.json",
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

        if (existsSync("weeklylist.json")) {
            weeklylist = JSON.parse(readFileSync("./weeklylist.json", "utf-8"));

			entries = weeklylist.entries;
			
            if (weeklylist.seed != weeklySeed)
                reset = true;
        }

        console.log(`Received ${messages.size} messages`);

        messages.forEach(message => {
            let num = getWeekNumber(new Date(message.createdTimestamp));

            if (num == weekNumber) {
                let stats = parse(message.embeds[0]);
                let entry = entries[stats.name];
    
                if (!entry || (entry && entry.kills < stats.kills)) {
					console.log("New entry from", entry.name);
                    entries[stats.name] = stats;
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

        writeFileSync("weeklylist.json",
            JSON.stringify(
            {
                seed: weeklySeed,
                entries: entries
            },
            null, 2)
        );
    });

    //#endregion

    setTimeout(() => {
        console.log("Destroying client.");
        client.destroy();
    },
    1000);
    
});

axios.get("https://raw.githubusercontent.com/toarch7/torcherdev/main/weeklydata.json")
    .then(res => {
        weeklySeed = res.data.seed;

        console.log("Weekly seed:", weeklySeed);
        client.login(params.token);
    })

    .catch();


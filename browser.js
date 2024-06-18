const axios = require("axios");
const fs = require("fs");

const unix = str => (new Date(str)).getTime();
const removeNTText = str => str.replace(/@.|\@\([^)]*\)/g, "").trim();
const path2repo = path => {
    let p = path.split("/");
    return p[1] + "/" + p[2];
}

const params = {
    webhooks: {
        updates: process.env.WEBHOOK_UPDATES,
        errors: process.env.WEBHOOK_ERRORS
    },

    token: process.env.API_TOKEN,
};

const perpage = 30;

let packs = {};
let packsRaw = {};
let packCount = 0;

let packsLast = {};
let packsNew = [];
let packsUpdated = [];
let packsMalformed = [];
let packsBlacklisted = [];

let blacklist = [ ];

let requestList = [];
let failureWait = 45;
let page = 1;

const checkFailed = (then, caught) => {
    return function(responses) {
        responses.forEach(response => {
            if (!response || response?.error)
                return caught(response);
            
            return then(response);
        });
    }
}

async function gather() {
    const request = {
        url: "https://api.github.com/search/repositories",
        method: "GET",
    
        params: {
            "q": "ntm resourcepack",
            "perpage": perpage,
            "page": page
        }
    };
    
    const reduce = () => (!(-- packCount)) ? allDone() : null;

    axios.request(request)
        .then((response) => {
        let data = response.data;
        let items = data.items;

        let maxPages = Math.ceil(data.total_count / perpage);

        console.log("Gathered", page + "/" + maxPages);
        
        for(let item of items) {
            if (!item.size)
                continue;
            
            let name = item.full_name;

            let url = "https://raw.githubusercontent.com/" + name + "/" + item.default_branch + "/meta.json";

            requestList.push(axios.get(url).catch(() => {}));
            
            packsRaw[name] = item;

            packCount ++;
        }

        if ((page ++) >= maxPages) {
            console.log("Gathering complete.");
            console.log("Collecting metafiles...");

            
            axios.all(requestList)
                .then(
                    checkFailed(
                        (response) => {
                            let name = path2repo(response.request.path);
                            
                            handlePack(name, packsRaw[name], response.data)
                                .then(reduce)
                                .catch(() => {
                                    reduce();
                                });
                        },

                        (error) => {
                            reduce();
                        }
                    )
                )
                .catch((e) => {
                    console.log("axios.all Failed.");
                });
        }
        else setTimeout(() => gather(), 1000);
    })
    .catch((e) => {
        console.log("Something went wrong - likely due to rate limit. Retrying in " + failureWait + "s.");
        setTimeout(() => gather(), failureWait * 1000);
    });
}

async function handlePack(name, item, meta) {
	var last = packsLast[name];
	
	let updated = last && last.updated != unix(item.pushed_at);
    
	let malformed = false;
	let hidden = false;

    let hasIcon = false;

    if (blacklist.indexOf(name) != -1 || blacklist.indexOf("user:" + item.owner.login) != -1) {
        if (!last || (last && !last.hidden))
			packsMalformed.push({ name: name, descriptionShort: "blacklisted" });
		
		console.warn("Pack hidden", name);

        hidden = true;
    }
    else if (typeof meta != "object") {
		if (!last || (last && !last.malformed))
            packsMalformed.push({ name: name, descriptionShort: "malformed meta.json" });
        
        console.warn("Malformed meta.json", name);

        malformed = true;
    }
    else {
        if (meta.hidden)
            return console.info("meta.hidden:", name);
        
        if (typeof meta.name != "string" || typeof meta.description != "string" || typeof meta.descriptionShort != "string")
            return console.info("Invalid meta fields");
        
        if (!packsLast[name]) {
            packsNew.push(meta);
        }
        else if (updated) {
            packsUpdated.push(meta);
        }
    }

    const cdn = "https://raw.githubusercontent.com";

    try {
        await axios.get(`${cdn}/${name}/${item.default_branch}/icon.png`);
        hasIcon = true;
    }
    catch(e) { }
    
    packs[name] = {
        full_name: name,
        name: item.name,
        owner: item.owner.login,
        created: unix(item.created_at),
        updated: unix(item.pushed_at),
        stars: item.stargazers_count,
        branch: item.default_branch,
        hasIcon: hasIcon,

        malformed: malformed,
        hidden: hidden,

        meta: {
            name: removeNTText(meta.name ?? name),
            descriptionShort: removeNTText(meta.descriptionShort ?? "NTM Resourcepack"),
            description: removeNTText(meta.description ?? "No description provided")
        }
    };

	if (!malformed && !hidden)
		console.info("Pack added!", name);
}

function allDone() {
    let today = new Date();
    let packList = Object.values(packs);
    let time = today.getHours() + ":" + today.getMinutes() + " " + today.getDate() + "/" + (today.getMonth() + 1) + "/" + today.getFullYear();

    console.log("All done.");

    const sendEmbed = (kind, embeds) => {
	console.log("Webhooks are disabled.");
	return;
	
        let url = params.webhooks[kind];
    
        if (!url)
            return;
    
        axios.post(url, { content: "", embeds: embeds });
    }

    let diff = packList.length - Object.keys(packsLast).length;

    if (diff > 0) {
        diff = "(+" + diff + ")";
    }
    else if (diff < 0) {
        diff = "(" + diff + ")";
    }
    else diff = "";
    
    const embed = {
        title: "",
        description: time + " Total: " + packList.length + " " + diff,
        color: 0xFFFFFF,
        fields: [ ],
        footer: {
            "text": time
        }
    };
    
    let fields = [];
    
    embed.title = "Resourcepacks updates";
    embed.color = 0xe6d927;

    if (packsUpdated.length > 0) {
        for(let pack of packsUpdated) {
            fields.push({
                name: "♻ " + pack.name,
                value: pack.descriptionShort
            });
        }
    }
    
    if (packsNew.length > 0) {
        for(let pack of packsNew) {
            fields.push({
                name: "🆕 " + removeNTText(pack.name),
                value: pack.descriptionShort
            });
        }
    }

    embed.fields = fields;

    if (fields.length > 0)
        sendEmbed("updates", [ embed ]);
    
    fields = [];
    
    embed.title = "Malformed packs";
    embed.color = 0xf00048;

    if (packsBlacklisted.length > 0) {
        for(let pack of packsBlacklisted) {
            fields.push({
                name: "❌ " + removeNTText(pack.name),
                value: pack.descriptionShort
            });
        }
    }

    if (packsMalformed.length > 0) {
        for(let pack of packsMalformed) {
            fields.push({
                name: "⚠ " + removeNTText(pack.name),
                value: pack.descriptionShort
            });
        }
    }

    embed.fields = fields;

    if (fields.length > 0)
        sendEmbed("errors", [ embed ]);

    console.log("New:", packsNew.length);
    console.log("Updates:", packsUpdated.length);
    console.log("Unlisted:", packsMalformed.length);
    
    fs.writeFileSync("resourcepacks.json",
        JSON.stringify(packList, null, 2));
}

// beware the pipeline

async function getResourcepacks() {
    console.log("Fetch last list");

    try {
        let packs = (await axios.get("https://raw.githubusercontent.com/toarch7/ntm-browser/main/resourcepacks.json")).data;

        if (!Array.isArray(blacklist))
            throw new TypeError("Invalid `resourcepacks`. Expected Array, got " + (typeof blacklist));

        for(let i of packs)
            packsLast[i.full_name] = i;

        await getBlacklist();
    }
    catch(e) {
        console.error("Was unable to fetch resourcepack list.");
    }
}

async function getBlacklist() {
    console.log("Fetch blacklist");

    try {
        blacklist = (await axios.get("https://raw.githubusercontent.com/toarch7/ntm-browser/main/resourcepack-blacklist.json")).data;

        if (!Array.isArray(blacklist))
            throw new TypeError("Invalid `blacklist`. Expected Array, got " + (typeof blacklist));

        await gather();
    }
    catch(e) {
        console.error("Was unable to fetch pack blacklist.");
    }
}

getResourcepacks();

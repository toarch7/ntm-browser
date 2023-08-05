// this is dumb too

const CharNames = require("./tables/characters.json");
const SkillNames = require("./tables/skills.json");
const UltraNames = require("./tables/ultras.json");
const WeaponNames = require("./tables/weapons.json");
const Emotes = require("./tables/emotes.json");

let charCurrent = 1;

function parseTitle(str) {
	let ret = { };

	ret.name = str.replace(/, Windows|, Linux|, iOS/, "").split(" ")[1];

	str = str.toLowerCase();

	CharNames.every((name, i) => {
		if (!str.startsWith(name))
			return true;

		charCurrent = i;
		
		ret.char = i;
		ret.skin = str[name.length] == "b";

		return false;
	});

	return ret;
}

function ultraGet(name) {
	let x = UltraNames[charCurrent];
	return x.indexOf(name) + 1;
}

function parseDescription(str) {
	let ret = {area: null, subarea: 1, loops: 0, wep: 0, bwep: 0, win: false };
	
	let desc = str.split("\n");
	
	for(let i = 0; i < desc.length; i ++) {
		let d = desc[i];

		if(d == "")
			continue;

		if (ret.area == null) {
			let a = d.substring(2).split(" ");
			let b = a[0].split("-");

			if (b[0] != "???") {
				ret.area = parseInt(b[0]);

				if (b[1] == "?") {
				    ret.area += 100;
				}
				else ret.subarea = parseInt(b[1]);
			}
			else if (b[0].startsWith("HQ")) {
				ret.area = 106;
				ret.subarea = parseInt(b[1].substring(2));
			}
			else if (b[0].startsWith("$$$")) {
				ret.area = 104;
				ret.subarea = 1;
			}
			else if (b[0] == "END1") {
				ret.area = 7;
				ret.subarea = 3;
				ret.win = true;
			}
			else if (b[0] == "END2") {
				ret.area = 106;
				ret.subarea = 3;
				ret.win = true;
			}
			else ret.area = 100;

			if (a[1] && a[1][0] == "L")
				ret.loops = parseInt(a[1].substring(1));

			ret.kills = parseInt(a.pop().replace ("**", ""))

			continue;
		}

		if (d.startsWith("**Weapon")) {
			d = desc[++ i];
			let a = d.split(", ");
			
            if (a[0])
			    ret.wep = Math.max(0, WeaponNames.indexOf(a[0].toUpperCase()));
            
            if (a[1])
			    ret.bwep = Math.max(0, WeaponNames.indexOf(a[1].toUpperCase()));
            
			continue;
		}

		if (d.startsWith("<:")) {
			let list = d.split(" ");
			let skills = [];

			for(let l of list) {
                let _skill = l.split(":")[1];
                let ind = SkillNames.indexOf(_skill);

                if (ind == -1) {
                    if(!ret.ultra)
                        ret.ultra = ultraGet(_skill);
                    
                    continue;
                }
                
                skills.push(ind);
			}

			ret.skills = skills;

			continue;
		}

		if (d.startsWith("**Crown")) {
			let a = d.split("**Crown**: <:Crown")[1];
			ret.crown = parseInt(a.split(":")[0]);
			
			continue;
		}
	}

	return ret;
}

function parseFooter(str) {
    let ret = { version: null, uid: null };

	let parts = str.split(" ");

	if (parts[1] && parts[1] != "Entry")
		ret.uid = parts[1];
	
	if (parts[0] && parts[0] != "(no")
		ret.version = parts[0].slice(1, parts[0].length - 1);

    return ret;
}

function doTheThing(embed) {
    let stats = {
        ...parseTitle(embed.title.substring(2)), // char, skin, name
        ...parseDescription(embed.description.replaceAll(Emotes.None, "")),
        ...parseFooter(embed.footer.text),
    };

    return stats;
}

module.exports = {
    parse: doTheThing
}


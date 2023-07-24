const CharNames = require("./tables/characters.json");
const SkillNames = require("./tables/skills.json");
const UltraNames = require("./tables/ultras.json");
const WeaponNames = require("./tables/weapons.json");
const Emotes = require("./tables/emotes.json");

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

let charCurrent = 1;

function parseTitle(str) {
	let ret = { };
	
	ret.name = str.split(" ")[1];

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
	let ret = {area: 0, subarea: 1, loops: 0, wep: 0, bwep: 0 };
	
	let desc = str.split("\n");
	
	for(let i = 0; i < desc.length; i ++) {
		let d = desc[i];

		if(d == "")
			continue;

		if (!ret.area) {
			let a = d.substring(2).split(" ");
			let b = a[0].split("-");

			if (b[0] != "???") {
				ret.area = parseInt(b[0]);

				if (b[1] == "?") {
				    ret.area += 100;
				}
				else ret.subarea = parseInt(b[1]);
			}
			else ret.area = 100;

			if (a[1] && a[1][0] == "L")
				ret.loops = parseInt(a[1].substring(1));

            ret.areaString = areaGetString(ret.area, ret.subarea, ret.loops);

			ret.kills = parseInt(a.pop().replace ("**", ""))

			continue;
		}

		if (d.startsWith("**Weapon")) {
			d = desc[++ i];
			let a = d.split(", ");
			// todo weapon id dictionary 
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

function parseFooter() {
    let ret = {};



    return ret;
}

function doTheThing(embed) {
    let stats = {
        ...parseTitle(embed.title.substring(2)), // char, skin, name
        ...parseDescription(embed.description.replaceAll(Emotes.None, "")),
        ...parseFooter(embed.footer.text)
    };

    return stats;
}

module.exports = {
    parse: doTheThing
}


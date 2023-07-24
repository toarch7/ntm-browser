let chricon = [];

for(let i = 0; i <= 15; i ++) {
    chricon[i] = [
        "","",""
    ]
}

chricon[1][1] = "<:FISHA:763750012605431808>"
chricon[1][2] = "<:FISHB:763750013129850880>"

chricon[2][1] = "<:CRYSTALA:763750012613820426>"
chricon[2][2] = "<:CRYSTALB:763750013100490752>"

chricon[3][1] = "<:EYESA:763750012663889941>"
chricon[3][2] = "<:EYESB:763750013012148246>"

chricon[4][1] = "<:MELTINGA:763750012601237504>"
chricon[4][2] = "<:MELTINGB:763750013054353448>"

chricon[5][1] = "<:PLANTA:763750012353118229>"
chricon[5][2] = "<:PLANTB:763750013171138600>"

chricon[6][1] = "<:YVA:763750012467019777>"
chricon[6][2] = "<:YVB:763750013066674187>"

chricon[7][1] = "<:STEROIDSA:763750012630597632>"
chricon[7][2] = "<:STEROIDSB:763750013306011648>"

chricon[8][1] = "<:ROBOTA:763750012798631946>"
chricon[8][2] = "<:ROBOTB:763750013100228618>"

chricon[9][1] = "<:CHICKENA:763750012286271500>"
chricon[9][2] = "<:CHICKENB:763750012878192641>"

chricon[10][1] = "<:REBELA:763750012524953651>"
chricon[10][2] = "<:REBELB:763750013062742026>"

chricon[11][1] = "<:HORRORA:763750012361768962>"
chricon[11][2] = "<:HORRORB:763750012856303648>"

chricon[12][1] = "<:ROGUEA:763750012634660874>"
chricon[12][2] = "<:ROGUEB:763750013086990356>"

chricon[13][1] = ":dog:"
chricon[13][2] = ":dog:"

chricon[14][1] = "<:SKELETONA:763754120250392616>"
chricon[14][2] = "<:SKELETONA:763754120250392616>"

chricon[15][1] = "<:FROGA:763754120246198272>"
chricon[15][2] = "<:FROGA:763754120246198272>"

for(let index in chricon) {
    let value = chricon[index];
    
    value.shift();
    console.log(index, value)
    chricon[index] = value;
}

// require("fs").writeFileSync("./tables/emotes.json",JSON.stringify(chricon,null,2));
import sharp from "sharp";
const SRC = "E:/PANGEA/BioFido_ICON_CLEAN.png";
const meta = await sharp(SRC).metadata();
console.log("sorgente:", meta.width + "x" + meta.height);
const S = 128;
const { data, info } = await sharp(SRC).resize(S,S).raw().ensureAlpha().toBuffer({resolveWithObject:true});
const px = (x,y)=>{const i=(y*info.width+x)*info.channels;return [data[i],data[i+1],data[i+2],data[i+3]];};
// verde di sfondo: scendo lungo la colonna centrale fino al primo verde pieno
let green = {r:124,g:194,b:77};
for (let y=0;y<S;y++){const [r,g,b,a]=px(Math.floor(S/2),y); if(a>200 && g>110 && g>r+15 && g>b+15){green={r,g,b};break;}}
console.log("verde sfondo:", green);

// "any": l'icona com'è (angoli arrotondati, trasparenza preservata)
await sharp(SRC).resize(192,192).png().toFile("public/brand/icon-192.png");
await sharp(SRC).resize(512,512).png().toFile("public/brand/icon-512.png");
// apple-touch: niente trasparenza → appiattisco sul verde
await sharp(SRC).resize(180,180).flatten({background:green}).png().toFile("public/brand/icon-180.png");
// maskable: il verde arriva già al bordo; riempio solo gli angoli arrotondati col verde
await sharp(SRC).flatten({background:green}).resize(512,512).png().toFile("public/brand/icon-512-maskable.png");
console.log("ok");

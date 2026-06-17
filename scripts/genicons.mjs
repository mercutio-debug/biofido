import sharp from "sharp";
const SRC = "E:/PANGEA/BioFido_ICON.png";
const S = 128;
const { data, info } = await sharp(SRC).resize(S,S).raw().ensureAlpha().toBuffer({resolveWithObject:true});
const px = (x,y)=>{const i=(y*info.width+x)*info.channels;return [data[i],data[i+1],data[i+2],data[i+3]];};
// scendo lungo la colonna centrale finché trovo un verde pieno
let green = {r:124,g:194,b:77};
for (let y=0;y<S;y++){const [r,g,b,a]=px(Math.floor(S/2),y); if(a>200 && g>110 && g>r+20 && g>b+20){green={r,g,b};break;}}
console.log("verde:", green);

// "any": l'icona così com'è, con i suoi angoli arrotondati e il bordino bianco
await sharp(SRC).resize(192,192).png().toFile("public/brand/icon-192.png");
await sharp(SRC).resize(512,512).png().toFile("public/brand/icon-512.png");
// apple-touch: niente trasparenza, bordo bianco va benissimo
await sharp(SRC).resize(180,180).flatten({background:"#ffffff"}).png().toFile("public/brand/icon-180.png");
// maskable: zoom dentro al quadrato verde (tolgo il margine bianco) e riempio gli angoli col verde
const crop = Math.round(1024*0.74);
const off = Math.round((1024-crop)/2);
await sharp(SRC).extract({left:off,top:off,width:crop,height:crop})
  .flatten({background:green}).resize(512,512).png()
  .toFile("public/brand/icon-512-maskable.png");
console.log("ok");

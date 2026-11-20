# Plano B — sendMedia com thumbnail, sem `mozjpeg`

**Status:** guardado para depois. Hoje (2026-11-20) aplicamos o Plano A (revert do commit `29a81a01`), que voltou ao encode do 2.3.7.

## Contexto

O 2.3.8 trouxe o commit `29a81a01` (`fix(baileys): improve image preview consistency on sendMedia`), que passou a:

1. re-encodar cada imagem com `jpeg({ quality: 95, mozjpeg: true })`;
2. gerar um thumbnail 72px com `mozjpeg`.

Medido no container, com imagem de 794 KB:

| Versão | Tempo por imagem |
|---|---|
| 2.3.7 (`sharp().jpeg()`) | 94–164 ms |
| 2.3.8 (`jpeg(q95, mozjpeg)`) | 1.347–1.416 ms |
| 2.3.8 + thumbnail | 1.556–2.844 ms |

Como o worker já normaliza a imagem para 800px JPEG q85 antes de enviar, o re-encode em q95 é redundante e custa ~1,4 s de CPU por envio — multiplicado por cada grupo de destino.

O Plano A removeu o thumbnail junto. O Plano B recupera o thumbnail mantendo o custo baixo.

## Patch do Plano B

Em `src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts`, no bloco `if (mediaMessage.mediatype === 'image')`:

```ts
const imageProcessor = sharp(imageBuffer, { failOn: 'none' }).rotate();
const metadata = await imageProcessor.metadata();

imageWidth = metadata.width;
imageHeight = metadata.height;

// unica diferenca em relacao ao 2.3.8: sem mozjpeg e sem q95
mediaInput = await imageProcessor.jpeg({ quality: 85 }).toBuffer();

try {
  imageThumbnail = await sharp(mediaInput)
    .resize(72, 72, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 60 })
    .toBuffer();
} catch (thumbnailError) {
  this.logger.warn(`Failed to generate jpegThumbnail: ${String(thumbnailError)}`);
}
```

E reaplicar o trecho que envia o thumbnail:

```ts
if (mediaMessage.mediatype === 'image') {
  if (imageThumbnail) {
    prepareMedia[mediaType].jpegThumbnail = imageThumbnail;
  }
  if (imageWidth) {
    // width/height como no 2.3.8
  }
}
```

O caminho mais simples para reaplicar é `git revert 1c36540d` (o commit do revert do Plano A) e então trocar as duas chamadas para as versões acima.

## Verificação depois de aplicar

```sh
# 1. build ok
# 2. medir o custo dentro do container
docker exec -i evolution node -e '
const sharp=require("sharp");
(async()=>{const buf=Buffer.alloc(1200*1200*3);for(let i=0;i<buf.length;i++)buf[i]=(i*2654435761)&0xff;
const jpg=await sharp(buf,{raw:{width:1200,height:1200,channels:3}}).jpeg().toBuffer();
let s=Date.now();await sharp(jpg).jpeg({quality:85}).toBuffer();console.log("encode q85:",Date.now()-s,"ms");})()'
```

Esperado: < 300 ms, contra ~1.400 ms do `mozjpeg` q95.

## Critério para valer a pena

Aplicar apenas se o preview das imagens nos grupos estiver visivelmente ruim. Ganho funcional é cosmético; custo de CPU é o que importa.

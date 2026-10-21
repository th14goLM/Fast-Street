# Imagens do onboarding

No protótipo estas imagens são *image slots* vazios. Enquanto não houver fotos, o app
mostra um placeholder com a descrição de cada uma.

| Arquivo sugerido | Onde aparece | Descrição no protótipo |
|---|---|---|
| `splash.jpg` | Splash | Grid de largada / autódromo à noite |
| `onboarding-1.jpg` | Slide 1 | Carro nos boxes |
| `onboarding-2.jpg` | Slide 2 | Vista aérea do autódromo |
| `onboarding-3.jpg` | Slide 3 | Pódio / pit lane |

Depois de colocar os arquivos aqui, troque os `null` em `src/theme/images.ts` por
`require('../../assets/images/<arquivo>.jpg')`. Prefira fotos escuras, em retrato,
com pelo menos 1170 × 1400 px: o gradiente do layout funde a base da imagem com o fundo `#1A2730`.

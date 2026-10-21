import type { ImageSourcePropType } from 'react-native';

/**
 * Imagens do onboarding. No protótipo elas são "image slots" vazios.
 * Para usar fotos reais, coloque os arquivos em assets/images/ e troque `null` por
 * `require('../../assets/images/<arquivo>.jpg')`. Prefira fotos escuras (o
 * gradiente do layout funde a base da imagem com o fundo #1A2730).
 */
export const images: {
  splash: ImageSourcePropType | null;
  onboarding: [ImageSourcePropType | null, ImageSourcePropType | null, ImageSourcePropType | null];
} = {
  splash: null, // "Grid de largada / autódromo à noite"
  onboarding: [
    null, // "Carro nos boxes"
    null, // "Vista aérea do autódromo"
    null, // "Pódio / pit lane"
  ],
};

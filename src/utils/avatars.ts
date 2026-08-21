import { CuteAvatar } from '../types';

export const CUTE_AVATARS: CuteAvatar[] = [
  {
    characterName: 'Eevee',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
    bgGradient: 'from-[#FCE4EC] to-[#F8BBD0]', // soft rose
    emoji: '💖',
  },
  {
    characterName: 'Togepi',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/175.png',
    bgGradient: 'from-[#FFF9C4] to-[#FFF176]', // pastel buttercup
    emoji: '✨',
  },
  {
    characterName: 'Jigglypuff',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png',
    bgGradient: 'from-[#F8BBD0] to-[#E1BEE7]', // pastel candy pink
    emoji: '🌸',
  },
  {
    characterName: 'Pikachu',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    bgGradient: 'from-[#FFFDE7] to-[#FFE082]', // warm soft yellow
    emoji: '⭐',
  },
  {
    characterName: 'Bulbasaur',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
    bgGradient: 'from-[#E8F5E9] to-[#C8E6C9]', // pastel mint sage
    emoji: '🌱',
  },
  {
    characterName: 'Sylveon',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/700.png',
    bgGradient: 'from-[#FCE4EC] to-[#E1BEE7]', // fairy lavender pink
    emoji: '🎀',
  },
  {
    characterName: 'Squirtle',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
    bgGradient: 'from-[#E1F5FE] to-[#B3E5FC]', // baby sky blue
    emoji: '🫧',
  },
  {
    characterName: 'Piplup',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/393.png',
    bgGradient: 'from-[#E0F7FA] to-[#B2EBF2]', // pastel ice blue
    emoji: '🌊',
  },
  {
    characterName: 'Mew',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
    bgGradient: 'from-[#EDE7F6] to-[#D1C4E9]', // magical soft lilac
    emoji: '🪄',
  },
  {
    characterName: 'Sprigatito',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/906.png',
    bgGradient: 'from-[#F1F8E9] to-[#DCEDC8]', // soft matcha
    emoji: '🍃',
  },
  {
    characterName: 'Teddiursa',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/216.png',
    bgGradient: 'from-[#EFEBE9] to-[#D7CCC8]', // warm milk tea
    emoji: '🧸',
  },
  {
    characterName: 'Dedenne',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/702.png',
    bgGradient: 'from-[#FFF3E0] to-[#FFE0B2]', // peach apricot
    emoji: '🍓',
  },
  {
    characterName: 'Red Pikmin',
    category: 'pikmin',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
    bgGradient: 'from-[#FFEBEE] to-[#FFCDD2]', // coral berry
    emoji: '🌺',
  },
  {
    characterName: 'Snorlax',
    category: 'pokemon',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png',
    bgGradient: 'from-[#E0F2F1] to-[#B2DFDB]', // peaceful mint teal
    emoji: '💤',
  },
];

export function getRandomAvatar(seed?: string): CuteAvatar {
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % CUTE_AVATARS.length;
    return CUTE_AVATARS[idx];
  }
  const randomIdx = Math.floor(Math.random() * CUTE_AVATARS.length);
  return CUTE_AVATARS[randomIdx];
}

export function getCuteAvatarByCharacter(nameOrCharacter?: string): CuteAvatar {
  if (!nameOrCharacter) return CUTE_AVATARS[0];
  const match = CUTE_AVATARS.find(
    (a) => a.characterName.toLowerCase() === nameOrCharacter.toLowerCase()
  );
  if (match) return match;
  return getRandomAvatar(nameOrCharacter);
}


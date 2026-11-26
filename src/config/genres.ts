import type { PaletteColor, StyleData } from '../types'

export interface GenrePreset {
  id: string
  label: string
  /** Goes into the prompt as "Setting:". Plain description, no franchise names. */
  setting: string
  palette: PaletteColor[]
  linesAndShading: string
}

/**
 * Starting points for the Style block. Picking one fills the setting, palette
 * and lines and shading. The art style is left alone, so any genre works in
 * pixel art, cel-shaded, painted or low-poly.
 *
 * Every palette stays clear of the default green chroma key (checked in genres.test.ts).
 */
export const GENRES: GenrePreset[] = [
  {
    id: 'old-west',
    label: 'Old West',
    setting: '1880s American frontier: dusty main streets, wooden saloons, red rock canyons, cacti, sun-bleached colors',
    palette: [
      { name: 'Saddle brown', hex: '#8B5A2B', usage: 'leather, hats, holsters' },
      { name: 'Desert sand', hex: '#D9B382', usage: 'ground, dust, canvas' },
      { name: 'Rust red', hex: '#A63D2A', usage: 'bandanas, rock, barn wood' },
      { name: 'Faded denim', hex: '#4A6A8A', usage: 'trousers, shirts' },
      { name: 'Brass', hex: '#C9A13B', usage: 'buckles, badges, spurs' },
    ],
    linesAndShading: 'dark brown outlines, 2-tone shading with warm highlights, dusty muted colors',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    setting:
      'near-future megacity at night: rain-slick streets, dense neon signage, chrome implants, holographic displays',
    palette: [
      { name: 'Midnight navy', hex: '#0D1B2A', usage: 'shadows, buildings, base clothing' },
      { name: 'Neon cyan', hex: '#00E5FF', usage: 'light strips, holograms, visor glow' },
      { name: 'Hot pink', hex: '#FF2E88', usage: 'signage, hair, accents' },
      { name: 'Electric violet', hex: '#7B2FF7', usage: 'jackets, rim light' },
      { name: 'Chrome grey', hex: '#9AA5B1', usage: 'implants, metal parts' },
    ],
    linesAndShading: 'crisp dark outlines, hard-edged shading, strong colored rim light from neon sources',
  },
  {
    id: 'futuristic',
    label: 'Futuristic sci-fi',
    setting: 'clean far-future world: smooth white architecture, sleek spacecraft, glowing panels, orderly and minimal',
    palette: [
      { name: 'Ceramic white', hex: '#EEF2F5', usage: 'armor plates, walls' },
      { name: 'Slate grey', hex: '#4B5563', usage: 'joints, undersuit' },
      { name: 'Signal blue', hex: '#2F80ED', usage: 'lights, trims' },
      { name: 'Amber', hex: '#F2A93B', usage: 'warning markings, indicators' },
      { name: 'Deep space', hex: '#111827', usage: 'visors, shadows' },
    ],
    linesAndShading: 'thin clean outlines, smooth 3-tone shading, soft glow on lights',
  },
  {
    id: 'medieval',
    label: 'Medieval fantasy',
    setting: 'high-medieval fantasy kingdom: stone castles, thatched villages, deep forests, knights in plate armor, heraldry',
    palette: [
      { name: 'Steel grey', hex: '#8A9199', usage: 'armor, blades' },
      { name: 'Royal crimson', hex: '#9E1B32', usage: 'tabards, banners, capes' },
      { name: 'Heraldic gold', hex: '#D4A017', usage: 'trims, crowns, embroidery' },
      { name: 'Oak brown', hex: '#6B4423', usage: 'wood, leather, shields' },
      { name: 'Forest green', hex: '#2E5A2B', usage: 'cloaks, foliage' },
    ],
    linesAndShading: 'medium dark outlines, 3-tone shading, rich saturated colors',
  },
  {
    id: 'celtic',
    label: 'Celtic',
    setting:
      'Iron Age Celtic lands: misty green hills, standing stones, roundhouses, woad face paint, knotwork on bronze and cloth',
    palette: [
      { name: 'Moss green', hex: '#4F6B3A', usage: 'cloaks, hills' },
      { name: 'Woad blue', hex: '#2F4F8F', usage: 'face paint, dyed cloth' },
      { name: 'Bronze', hex: '#B0793A', usage: 'torcs, brooches, shield bosses' },
      { name: 'Peat brown', hex: '#5A4030', usage: 'leather, wood' },
      { name: 'Mist grey', hex: '#B8C2C0', usage: 'stone, sky, fog' },
    ],
    linesAndShading: 'soft dark outlines, 3-tone shading, interlaced knotwork patterns on trims, muted earthy colors',
  },
  {
    id: 'chinese',
    label: 'Ancient China',
    setting:
      'imperial ancient China: palaces with curved tiled roofs, red pillars, silk robes, jade ornaments, misty mountains, paper lanterns',
    palette: [
      { name: 'Vermilion', hex: '#C8102E', usage: 'pillars, robes, lanterns' },
      { name: 'Imperial gold', hex: '#E0B23A', usage: 'embroidery, roof ornaments' },
      { name: 'Jade', hex: '#3AA67A', usage: 'ornaments, accents' },
      { name: 'Ink black', hex: '#1C1C1C', usage: 'hair, lacquer' },
      { name: 'Rice paper', hex: '#F3E9D2', usage: 'paper, sky, highlights' },
    ],
    linesAndShading: 'dark outlines with tapered ends, soft 2-tone shading, cloud and wave patterns on fabric',
  },
  {
    id: 'japanese',
    label: 'Feudal Japan',
    setting:
      'Edo period Japan: wooden temples, torii gates, cherry blossoms, samurai armor, kimono, paper lanterns',
    palette: [
      { name: 'Indigo', hex: '#264478', usage: 'kimono, cloth' },
      { name: 'Torii red', hex: '#D2452D', usage: 'gates, accents' },
      { name: 'Sakura pink', hex: '#F4B6C2', usage: 'blossoms, highlights' },
      { name: 'Charcoal', hex: '#2B2B2B', usage: 'hair, lacquered armor' },
      { name: 'Washi cream', hex: '#F2E8D5', usage: 'paper walls, sky' },
    ],
    linesAndShading: 'bold dark outlines, flat color areas with minimal shading, wave patterns on fabric',
  },
  {
    id: 'ninja-anime',
    label: 'Ninja anime',
    setting:
      'action anime ninja world: hidden villages among cliffs and forests, forehead protectors with metal plates, flak vests, throwing knives, energetic poses',
    palette: [
      { name: 'Bright orange', hex: '#F57C1F', usage: 'jumpsuits, accents' },
      { name: 'Navy blue', hex: '#1F2F5C', usage: 'outfits, sandals' },
      { name: 'Steel', hex: '#A7B0BA', usage: 'headband plates, blades' },
      { name: 'Sunlit tan', hex: '#E8C39E', usage: 'skin, wood' },
      { name: 'Leaf green', hex: '#4C7A3D', usage: 'vests, trees' },
    ],
    linesAndShading: 'clean anime line art with tapered strokes, 2-tone cel shading with sharp shadow edges',
  },
  {
    id: 'steampunk',
    label: 'Steampunk',
    setting:
      'Victorian industrial age powered by steam: brass machinery, exposed gears, goggles, airships, cobblestone streets, gas lamps',
    palette: [
      { name: 'Polished brass', hex: '#B5893A', usage: 'machinery, goggles' },
      { name: 'Copper', hex: '#B4643C', usage: 'pipes, rivets' },
      { name: 'Soot black', hex: '#2A2522', usage: 'coats, iron' },
      { name: 'Leather brown', hex: '#6E4B2E', usage: 'straps, boots, gloves' },
      { name: 'Cream', hex: '#EADBC0', usage: 'shirts, steam, highlights' },
    ],
    linesAndShading: 'fine dark outlines, 3-tone shading with metallic highlights on brass and copper',
  },
  {
    id: 'post-apocalyptic',
    label: 'Post-apocalyptic',
    setting: 'ruined world after a collapse: rusted vehicles, scrap-metal armor, wasteland dust, overgrown ruins, makeshift gear',
    palette: [
      { name: 'Rust', hex: '#8E4A2A', usage: 'scrap metal, vehicles' },
      { name: 'Dust khaki', hex: '#B8A37E', usage: 'cloth, ground' },
      { name: 'Gunmetal', hex: '#4A4F55', usage: 'weapons, armor plates' },
      { name: 'Faded olive', hex: '#6B6B3A', usage: 'jackets, bags' },
      { name: 'Hazard yellow', hex: '#D9A520', usage: 'warning stripes, accents' },
    ],
    linesAndShading: 'rough uneven outlines, gritty 3-tone shading, worn and scratched surfaces',
  },
  {
    id: 'pirate',
    label: 'Pirates',
    setting: 'Golden Age of piracy in the Caribbean: wooden galleons, tropical islands, treasure chests, tricorn hats, cutlasses',
    palette: [
      { name: 'Ocean teal', hex: '#1F6F78', usage: 'sea, sashes' },
      { name: 'Sail canvas', hex: '#E6D8B5', usage: 'sails, shirts' },
      { name: 'Ship wood', hex: '#7A4E2D', usage: 'hulls, barrels, boots' },
      { name: 'Treasure gold', hex: '#E1B53A', usage: 'coins, buttons, earrings' },
      { name: 'Coat red', hex: '#A3262A', usage: 'coats, bandanas' },
    ],
    linesAndShading: 'bold dark outlines, 2-tone shading, warm sunny highlights',
  },
  {
    id: 'viking',
    label: 'Viking / Norse',
    setting: 'Viking Age Scandinavia: longships, icy fjords, snowy pine forests, round shields, fur cloaks, carved wooden halls',
    palette: [
      { name: 'Fjord blue', hex: '#3D5A73', usage: 'tunics, sea' },
      { name: 'Fur grey', hex: '#8C8279', usage: 'cloaks, pelts' },
      { name: 'Iron', hex: '#5C6166', usage: 'axes, helmets, mail' },
      { name: 'Blood red', hex: '#8A1E1E', usage: 'shield paint, cloth' },
      { name: 'Birch white', hex: '#E4E0D6', usage: 'snow, highlights' },
    ],
    linesAndShading: 'heavy dark outlines, cold muted 3-tone shading, carved interlace patterns on wood and metal',
  },
  {
    id: 'ancient-egypt',
    label: 'Ancient Egypt',
    setting:
      'New Kingdom Egypt: sandstone temples, pyramids, obelisks, the Nile, white linen clothing, gold collars, lapis jewelry',
    palette: [
      { name: 'Sandstone', hex: '#D8B67A', usage: 'temples, ground' },
      { name: 'Lapis blue', hex: '#26619C', usage: 'jewelry, headdress stripes' },
      { name: 'Egyptian gold', hex: '#D4AF37', usage: 'collars, bracelets' },
      { name: 'Turquoise', hex: '#3FB6A8', usage: 'inlays, amulets' },
      { name: 'Kohl black', hex: '#1A1A1A', usage: 'hair, eyeliner' },
    ],
    linesAndShading: 'clean even outlines, flat color fills, minimal shading, strong silhouettes',
  },
  {
    id: 'greek-myth',
    label: 'Greek mythology',
    setting: 'ancient Greek myth: white marble temples, olive groves, the Aegean sea, bronze armor, crested helmets, chitons',
    palette: [
      { name: 'Marble white', hex: '#F1EEE8', usage: 'temples, chitons' },
      { name: 'Aegean blue', hex: '#1F5FA8', usage: 'sea, capes' },
      { name: 'Bronze', hex: '#A97142', usage: 'armor, shields' },
      { name: 'Olive', hex: '#7A7F3A', usage: 'trees, wreaths' },
      { name: 'Terracotta', hex: '#C0603A', usage: 'pottery, roofs, crests' },
    ],
    linesAndShading: 'clean dark outlines, 3-tone shading, meander patterns on borders',
  },
  {
    id: 'gothic-horror',
    label: 'Gothic horror',
    setting: 'gothic horror: crumbling castles, foggy graveyards, candlelight, wrought iron gates, Victorian mourning clothes, full moon',
    palette: [
      { name: 'Midnight purple', hex: '#2E1A47', usage: 'sky, shadows, cloaks' },
      { name: 'Bone white', hex: '#E6DFCF', usage: 'skin, moonlight, bones' },
      { name: 'Blood red', hex: '#7A0F1A', usage: 'linings, eyes, accents' },
      { name: 'Grave grey', hex: '#5B5F66', usage: 'stone, iron' },
      { name: 'Candle amber', hex: '#E0A040', usage: 'flames, windows' },
    ],
    linesAndShading: 'sharp dark outlines, deep high-contrast shadows, cold moonlight with warm candle accents',
  },
  {
    id: 'cozy-farm',
    label: 'Cozy farm',
    setting: 'cozy countryside farm: wooden barns, vegetable gardens, rolling hills, sunny days, friendly animals',
    palette: [
      { name: 'Meadow green', hex: '#6FAF4F', usage: 'grass, leaves' },
      { name: 'Barn red', hex: '#B8473A', usage: 'barns, roofs' },
      { name: 'Straw yellow', hex: '#E9C46A', usage: 'hay, hats, crops' },
      { name: 'Sky blue', hex: '#8EC5E8', usage: 'sky, overalls' },
      { name: 'Soil brown', hex: '#7B5235', usage: 'dirt, fences, tools' },
    ],
    linesAndShading: 'soft rounded outlines, gentle 2-tone shading, warm and slightly pastel colors',
  },
  {
    id: 'desert-folklore',
    label: 'Desert folklore',
    setting:
      'desert caravan city from Middle Eastern folklore: domed palaces, busy bazaars, silk tents, brass oil lamps, starry desert nights',
    palette: [
      { name: 'Saffron', hex: '#E3A21A', usage: 'sashes, domes, lamps' },
      { name: 'Deep teal', hex: '#13636B', usage: 'tiles, robes' },
      { name: 'Sandstone', hex: '#D9B98C', usage: 'walls, dunes' },
      { name: 'Pomegranate', hex: '#A2223A', usage: 'carpets, vests' },
      { name: 'Night indigo', hex: '#1E2350', usage: 'sky, shadows' },
    ],
    linesAndShading: 'elegant dark outlines, rich 3-tone shading, geometric tile patterns on fabric and walls',
  },
  {
    id: 'mesoamerican',
    label: 'Mesoamerican',
    setting:
      'Mesoamerican civilization: stepped stone pyramids, dense jungle, jade masks, feathered headdresses, obsidian blades, carved stone reliefs',
    palette: [
      { name: 'Jade', hex: '#2F8F6A', usage: 'masks, jewelry, feathers' },
      { name: 'Limestone', hex: '#CFC3A6', usage: 'pyramids, carvings' },
      { name: 'Obsidian', hex: '#1E1B22', usage: 'blades, hair' },
      { name: 'Cochineal red', hex: '#B3242F', usage: 'cloth, body paint' },
      { name: 'Sun gold', hex: '#D6A62C', usage: 'ornaments, headdress' },
    ],
    linesAndShading: 'bold dark outlines, flat color with 2-tone shading, stepped geometric patterns on cloth and stone',
  },
]

/** Fills the genre's setting, palette and lines and shading. Keeps the art style, and the name unless it is empty. */
export function applyGenre(style: StyleData, genre: GenrePreset): StyleData {
  return {
    ...style,
    name: style.name.trim() ? style.name : genre.label,
    setting: genre.setting,
    palette: genre.palette.map((c) => ({ ...c })),
    linesAndShading: genre.linesAndShading,
  }
}

/** Whether applying a genre would overwrite something the user typed. */
export function hasGenreFields(style: StyleData): boolean {
  return Boolean(
    style.setting?.trim() ||
      style.linesAndShading.trim() ||
      style.palette.some((c) => c.name.trim() || c.usage.trim()) ||
      style.palette.length > 1,
  )
}

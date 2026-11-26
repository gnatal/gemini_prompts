export interface FieldHelp {
  /** What the field is for and how the model uses it. */
  text: string
  /** Sample values that work well. */
  examples?: string[]
  /** An extra tip, usually a mistake to avoid. */
  tip?: string
}

/**
 * Help shown behind the (i) icon next to each field, keyed by form path.
 * Keys that aren't form paths (profiles, genre, batch) are used by their components directly.
 */
export const FIELD_HELP: Record<string, FieldHelp> = {
  // Style
  'style.profile': {
    text: 'Saved styles. Pick one to load it into the form. Save keeps your edits in the selected style, Save as new makes a copy.',
    tip: 'Use one style for the whole game, so every asset matches.',
  },
  'style.genre': {
    text: 'A quick starting point. Picking a genre fills the setting, palette and lines and shading with a matching set-up. Your art style is kept.',
    examples: ['Old West + Pixel art', 'Cyberpunk + 2D cel-shaded', 'Feudal Japan + 2D hand-painted'],
    tip: 'Apply a genre first, then adjust the colors and wording to make it yours.',
  },
  'style.name': {
    text: 'A name for this style, so you can find it in the saved list. It is not added to the prompt.',
    examples: ['Main game style', 'Desert levels', 'UI icons'],
  },
  'style.artStyle': {
    text: 'The overall rendering technique. It is the first thing the model reads, so it has the biggest effect on the look.',
    examples: ['Pixel art for retro platformers', '2D cel-shaded for clean cartoon looks', 'Low-poly 3D for simple 3D renders'],
    tip: 'Pick Custom to describe a style that is not listed.',
  },
  'style.pixelResolution': {
    text: 'The size of one sprite in pixels. Smaller sizes mean chunkier pixels and fewer details.',
    examples: ['16x16 for tiny retro sprites', '32x32', '64x64 for detailed characters'],
    tip: 'Keep the same resolution for every character in the game.',
  },
  'style.customStyle': {
    text: 'Describe your own art style in a short phrase. It replaces the art style in the prompt.',
    examples: ['flat vector art, 16-bit era proportions', 'watercolor storybook illustration', 'chunky claymation figures'],
    tip: 'Describe the look itself instead of naming a game or artist.',
  },
  'style.setting': {
    text: 'The genre and world the asset belongs to: time period, place and the typical materials or objects.',
    examples: [
      '1880s American frontier: dusty streets, wooden saloons, canyons',
      'near-future megacity at night: neon signs, rain, chrome',
      'Iron Age Celtic lands: misty hills, standing stones, knotwork',
    ],
    tip: 'Describe the world in plain words. Naming a famous game, film or anime makes the model copy it.',
  },
  'style.palette': {
    text: 'The colors the model should stick to. Give each one a name, a hex value and what it is used for.',
    examples: ['Royal blue · #1E4FD8 · helmet, boots', 'Brass · #C9A13B · buckle, spurs', 'Rust red · #A63D2A · bandana'],
    tip: 'Use 3 to 6 colors. Fewer gives the model too much freedom, more gets ignored.',
  },
  'style.linesAndShading': {
    text: 'How outlines and shading are drawn. This keeps assets consistent when they are made on different days.',
    examples: [
      'thick dark outlines, 2-tone cel shading, no gradients',
      'no outlines, soft painterly shading',
      'thin clean outlines, smooth 3-tone shading',
    ],
  },

  // Character
  'character.profile': {
    text: 'Saved characters. Pick one to load it into the form. Save keeps your edits in the selected character, Save as new makes a copy.',
    tip: 'Save the character once it looks right, then only change the Asset block.',
  },
  'character.name': {
    text: "The character's name. It is added to the prompt and helps the model treat the description as one person.",
    examples: ['Rex Ranger', 'Mira the Alchemist', 'Unit K-7'],
    tip: 'Use an original name. Famous character names pull the model toward their look.',
  },
  'character.proportions': {
    text: 'Body proportions, measured in head heights. This is what keeps the silhouette the same in every asset.',
    examples: ['4 heads tall, small torso, oversized boots', '2 heads tall, chibi, big round head', '7 heads tall, long legs, broad shoulders'],
  },
  'character.head': {
    text: 'Head, face, hair and headwear. Describe shapes, colors and positions.',
    examples: [
      'round blue helmet with a short vertical fin on top, large round eyes',
      'messy black hair in a high ponytail, thin scar over the left eye',
    ],
    tip: 'Use plain geometry ("round", "a short fin on top") instead of comparisons ("looks like a fishbowl").',
  },
  'character.torso': {
    text: 'Chest, clothing, armor and belt.',
    examples: ['sky blue bodysuit, brass belt buckle with a five-point star', 'brown leather vest over a white shirt, red sash'],
  },
  'character.armsAndHands': {
    text: 'Sleeves, gloves, bracers and anything worn on the arms.',
    examples: ['dark blue fingerless gloves, thin forearms', 'bare arms, bronze bracer on the left wrist'],
    tip: 'Held items go in the Asset section, so they can change per asset.',
  },
  'character.legsAndFeet': {
    text: 'Trousers, skirts, boots and anything worn on the legs.',
    examples: ['oversized royal blue boots with brass spurs', 'baggy grey trousers wrapped at the shins, straw sandals'],
  },
  'character.signatureDetails': {
    text: 'The 2 or 3 features that make the character unmistakable. The model is told to keep them in every asset.',
    examples: ['red scarf trailing behind', 'brass star on the belt buckle', 'fin on the helmet'],
    tip: 'Pick details that are visible from every angle. Press Enter after each one.',
  },
  'character.hasReferenceImage': {
    text: 'Tick this if you will attach an approved image of the character together with the prompt. A line is added telling the model to copy it exactly.',
    tip: 'Once you have one image you like, attach it to every later prompt. It is the best way to keep the character consistent.',
  },

  // Asset
  'asset.type': {
    text: 'What kind of asset to make. Changing it fills in a matching view, framing and aspect ratio.',
    examples: [
      'Sprite: one character pose',
      'Sprite strip: several animation frames in a row',
      'Item icon: a single object',
      'Tile: a seamless repeating texture',
    ],
  },
  'asset.frameCount': {
    text: 'How many animation frames to draw side by side, from 2 to 12. The aspect ratio follows the frame count.',
    examples: ['4 for a short idle loop', '6 for a run cycle', '8 for a smooth attack'],
    tip: 'Fewer frames come out more consistent. Split long animations into several strips.',
  },
  'asset.frameLayout': {
    text: 'How the frames are arranged. One row puts them side by side (N:1). Grid uses equal square cells, e.g. 8 frames as 4 columns by 2 rows.',
    examples: ['Grid for 8 or more frames', 'One row for short strips of 2 to 4 frames'],
    tip: 'Very wide rows often come out squashed or unevenly spaced. A grid is easier to cut into frames.',
  },
  'asset.includeCharacter': {
    text: 'Whether the character from the Character section appears in this asset. Turn it off for items, scenes and tiles.',
  },
  'asset.subject': {
    text: 'What to draw when the character is not in the asset: the item, scene or tile.',
    examples: [
      'a brass revolver with a dark wooden grip',
      'desert canyon at dusk, layered rock walls, cacti in the foreground',
      'dry cracked earth with small pebbles',
    ],
  },
  'asset.action': {
    text: 'What is happening in this asset. Keep it to one clear action.',
    examples: ['running', 'jumping, knees tucked', 'swinging the sword overhead', 'idle, breathing'],
    tip: 'One action per prompt. Use the Batch tab to make several at once.',
  },
  'asset.heldItems': {
    text: 'What the character holds, and in which hand. Left and right are from the character’s point of view.',
    examples: ['revolver in the right hand', 'shield on the left arm, sword in the right hand', 'empty hands'],
    tip: 'Always say left or right. Otherwise the item switches hands between assets.',
  },
  'asset.view': {
    text: 'The camera angle. Use the same view for every asset that appears together in the game.',
    examples: ['Side view for platformers', 'Top-down or isometric for RPGs and strategy', 'Three-quarter front for portraits'],
  },
  'asset.aspectRatio': {
    text: 'The width to height ratio of the image.',
    examples: ['1:1 for sprites and icons', '16:9 for backgrounds', '9:16 for mobile screens'],
  },
  'asset.customAspectRatio': {
    text: 'Your own ratio, written as width:height.',
    examples: ['6:1 for a 6-frame strip', '3:2', '21:9 for wide panoramas'],
  },
  'asset.framing': {
    text: 'How the subject sits in the image: how much of it is shown, and where.',
    examples: [
      'full body, centered, nothing cropped, small margin on all sides',
      'head and shoulders, centered',
      'seamless and tileable on all four edges',
    ],
  },
  'asset.backgroundColor': {
    text: 'A flat, solid background color that is easy to remove later with a chroma key or magic wand tool.',
    examples: ['#00FF00 green, the default', '#FF00FF magenta, when the asset has green in it'],
    tip: 'Pick a color that is far from every palette color, or removing it will eat into the asset.',
  },
  'asset.lighting': {
    text: 'Where the light comes from and how strong it is. Keeping it the same makes assets fit together.',
    examples: ['even and neutral, from upper left', 'warm sunset light from the right', 'cold moonlight from above, soft shadows'],
  },
  'asset.exclusions': {
    text: 'Things the model must leave out. Each one becomes part of the "Exclude" line.',
    examples: ['no text', 'no ground shadow', 'no extra characters', 'no frame or border'],
    tip: 'Keep "no text". Image models like to add captions and labels.',
  },

  // Batch
  'batch.actions': {
    text: 'One action per line. Each line becomes its own prompt, with the same Style and Character blocks.',
    examples: ['idle', 'run', 'jump', 'attack with the sword'],
    tip: 'The other Asset settings (type, view, framing...) are shared by every line.',
  },

  // Animations
  'animations.list': {
    text: 'Each animation that is on becomes its own sprite strip prompt: the frame count sets the number of frames and the N:1 aspect ratio, and the frame poses tell the model what to draw in each frame.',
    examples: ['Idle: 4 frames, loop', 'Walk or Run: 8 frames, loop', 'Dash: 12 frames', 'Jump: 6 frames'],
    tip: 'Generate the idle first and attach it as the reference image for the others, so the character stays the same in every sheet.',
  },
}

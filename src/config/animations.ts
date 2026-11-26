import type { AnimationSpec, FrameLayout } from '../types'

/**
 * Animation presets for the Animations tab. Each one becomes a sprite strip
 * prompt. `keyPoses` has one entry per frame at the default frame count, and
 * is only added to the prompt when the frame count still matches.
 *
 * Limbs that swap during a cycle are named "near" (closer to the camera) and
 * "far". Image models lose track of the character's left and right, so a
 * left/right walk cycle comes out with the same leg leading in every frame.
 *
 * Wording matters: "the second half repeats the first" gets drawn as a copy,
 * and a pose with no direction in it ("neutral standing pose") gets drawn
 * facing the camera. Say what differs, and keep the facing in every pose.
 */
export const ANIMATION_PRESETS: readonly AnimationSpec[] = [
  {
    id: 'idle',
    name: 'Idle',
    enabled: true,
    frames: 4,
    loop: true,
    motion: 'standing still and breathing calmly, relaxed stance',
    keyPoses: [
      'relaxed standing pose, weight even on both feet, arms relaxed',
      'breathing in: chest rises slightly, shoulders lift a little',
      'top of the breath: chest fully raised, head a touch higher',
      'breathing out: chest and shoulders lower back toward the first frame',
    ],
  },
  {
    id: 'walk',
    name: 'Walk',
    enabled: true,
    frames: 8,
    loop: true,
    motion:
      'walking at a steady pace, arms swinging opposite to the legs; the second half of the cycle is not a copy of the first half: the opposite leg leads',
    keyPoses: [
      'contact: near heel touches the ground in front, far leg stretched behind; far arm forward, near arm back',
      'down: weight drops onto the near leg, near knee bent, body at its lowest; arms passing the hips',
      'passing: legs together under the hips, near foot flat on the ground, far knee bent with the far foot lifted beside the near ankle, body rising; arms close to the body',
      'up: near leg pushes off behind, far leg reaching forward, body at its highest; near arm forward, far arm back',
      'contact: far heel touches the ground in front, near leg stretched behind; near arm forward, far arm back',
      'down: weight drops onto the far leg, far knee bent, body at its lowest; arms passing the hips',
      'passing: legs together under the hips, far foot flat on the ground, near knee bent with the near foot lifted beside the far ankle, body rising; arms close to the body',
      'up: far leg pushes off behind, near leg reaching forward, body at its highest; far arm forward, near arm back, leading back into frame 1',
    ],
  },
  {
    id: 'run',
    name: 'Run',
    enabled: true,
    frames: 8,
    loop: true,
    motion:
      'running fast, torso leaning forward, arms pumping hard opposite to the legs; the second half of the cycle is not a copy of the first half: the opposite leg leads',
    keyPoses: [
      'contact: near foot lands under the body, far leg trailing behind; far arm swung forward, near arm swung back',
      'down: near knee bends to absorb the landing, body at its lowest; both arms passing the hips',
      'push-off: near leg drives back and straightens, far knee swings forward and high; near arm swings forward, far arm back',
      'flight: both feet clearly off the ground with a visible gap under the boots, near leg stretched back, far knee forward; near arm forward, far arm back',
      'contact: far foot lands under the body, near leg trailing behind; near arm swung forward, far arm swung back',
      'down: far knee bends to absorb the landing, body at its lowest; both arms passing the hips',
      'push-off: far leg drives back and straightens, near knee swings forward and high; far arm swings forward, near arm back',
      'flight: both feet clearly off the ground with a visible gap under the boots, far leg stretched back, near knee forward; far arm forward, near arm back, leading back into frame 1',
    ],
  },
  {
    id: 'dash',
    name: 'Dash',
    enabled: true,
    frames: 12,
    loop: false,
    motion: 'a short, explosive burst of speed along the ground, then braking to a stop',
    keyPoses: [
      'ready: knees bend, body lowers, weight shifts back',
      'anticipation: deep crouch, torso leaning forward, arms pulled back',
      'launch: back leg pushes off hard, body springs forward',
      'full dash: body low and stretched forward, legs tucked, arms swept back',
      'full dash: same pose, body at its farthest forward lean',
      'full dash: same pose, clothes and hair streaming back',
      'full dash: same pose, front foot starting to reach forward',
      'braking: front foot plants on the ground ahead, torso tilts backward, still facing forward',
      'sliding to a stop: knees bent, weight on the back leg',
      'recovery: body rises out of the slide',
      'settling: weight returns to the center, arms come down',
      'idle standing pose, facing the same way as the other frames',
    ],
  },
  {
    id: 'jump',
    name: 'Jump',
    enabled: true,
    frames: 6,
    loop: false,
    motion: 'jumping straight up from the ground and landing again',
    keyPoses: [
      'anticipation: crouch, knees bent, arms swung back',
      'take-off: legs extend, arms swing up, feet leaving the ground',
      'rising: body stretched upward, legs trailing below',
      'apex: knees tucked, body compact at the highest point',
      'falling: legs reach down toward the ground, arms out for balance',
      'landing: feet touch down, knees bend to absorb the impact',
    ],
  },
  {
    id: 'fall',
    name: 'Fall',
    enabled: true,
    frames: 4,
    loop: true,
    motion: 'falling through the air, limbs loose, clothes and hair blown upward',
    keyPoses: [
      'arms raised, legs slightly apart and dangling',
      'arms lift higher, clothes and hair pushed upward',
      'arms lower a little, legs shift',
      'back toward the first frame',
    ],
  },
  {
    id: 'land',
    name: 'Land',
    enabled: false,
    frames: 4,
    loop: false,
    motion: 'landing hard from a fall and standing back up',
    keyPoses: [
      'feet touch the ground, legs straight',
      'impact: knees bend deeply, body squashed low, arms forward',
      'pushing back up, knees straightening',
      'idle standing pose, facing the same way as the other frames',
    ],
  },
  {
    id: 'crouch',
    name: 'Crouch',
    enabled: false,
    frames: 3,
    loop: false,
    motion: 'going from standing into a low crouch',
    keyPoses: [
      'idle standing pose, facing the same way as the other frames',
      'halfway down: knees bending, torso lowering',
      'full crouch: knees deeply bent, body low and compact',
    ],
  },
  {
    id: 'attack',
    name: 'Attack',
    enabled: false,
    frames: 6,
    loop: false,
    motion: 'a single strong forward attack with the held item, or a punch if the hands are empty',
    keyPoses: [
      'ready stance, weight balanced',
      'wind-up: arm and held item pulled back, torso twisting away',
      'anticipation peak: body coiled, weight on the back foot',
      'strike: arm fully extended forward, weight on the front foot',
      'follow-through: arm continues past the target, body leaning in',
      'recovery: back to the ready stance',
    ],
  },
  {
    id: 'hurt',
    name: 'Hurt',
    enabled: true,
    frames: 3,
    loop: false,
    motion: 'getting hit from the front and recoiling',
    keyPoses: [
      'impact: body jolts backward, eyes shut tight',
      'recoil: leaning far back, arms flung out',
      'recovering toward the standing pose',
    ],
  },
  {
    id: 'death',
    name: 'Death',
    enabled: true,
    frames: 8,
    loop: false,
    motion: 'taking a final hit and collapsing to the ground',
    keyPoses: [
      'hit: body jolts backward',
      'staggering back, arms loose',
      'knees buckle',
      'falling to the knees',
      'torso tips backward',
      'body falling to the ground',
      'hits the ground, slight bounce',
      'lying still, flat on the ground',
    ],
  },
  {
    id: 'climb',
    name: 'Climb',
    enabled: false,
    frames: 6,
    loop: true,
    motion: 'climbing up a ladder, hands and feet alternating',
    keyPoses: [
      'near hand reaches up to a higher rung, far foot steps up one rung',
      'pulling up with the near hand, body rising',
      'body at the top of the reach, near hand and far foot on the higher rungs',
      'far hand reaches up to a higher rung, near foot steps up one rung',
      'pulling up with the far hand, body rising',
      'body at the top of the reach, far hand and near foot on the higher rungs, leading back into frame 1',
    ],
  },
]

/** A fresh, editable copy of the presets. */
/** Bumped when the preset motions or poses change, so stored copies get the new text. */
export const ANIMATION_PRESETS_VERSION = 3

export const DEFAULT_FRAME_LAYOUT: FrameLayout = 'grid'

export function defaultAnimations(): AnimationSpec[] {
  return structuredClone(ANIMATION_PRESETS) as AnimationSpec[]
}

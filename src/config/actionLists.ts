export interface ActionList {
  name: string
  actions: string[]
}

/** One-click action lists for batch mode. */
export const ACTION_LISTS: ActionList[] = [
  {
    name: 'Platformer basics',
    actions: ['idle', 'run', 'jump', 'fall', 'shoot', 'hurt', 'death'],
  },
  {
    name: 'Top-down RPG',
    actions: ['idle', 'walk', 'attack', 'cast spell', 'block', 'hurt', 'death'],
  },
  {
    name: 'Fighting game',
    actions: ['idle stance', 'walk forward', 'crouch', 'punch', 'kick', 'block', 'hurt', 'knocked down'],
  },
  {
    name: 'Portrait expressions',
    actions: ['neutral expression', 'smiling', 'angry', 'sad', 'surprised', 'determined'],
  },
]

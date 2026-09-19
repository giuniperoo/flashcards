/**
 * The words a suggested sync key is made of: an adjective, a noun and a verb
 * ending in "-ing", so a key reads like "pink pony charging" — easy to say, to
 * remember, and to type on a phone when there is no camera to hand.
 *
 * Plain, common, easy to spell, and nothing a reader would mind seeing. No word
 * appears in two lists. There are about 11.6 million combinations, around 23.5
 * bits: far past guessing online, where misses are rate limited, and within
 * reach of someone holding a copy of the server's store with time to spend,
 * which is what the note beside the key field says. See `suggestKey` in
 * `lib/syncCrypto.ts`.
 */

const ADJECTIVES = `
  pink blue green amber golden silver crimson violet purple orange yellow
  scarlet teal olive coral ivory indigo maroon navy peach lilac rusty copper
  bronze minty sandy snowy sunny rainy windy cloudy stormy frosty misty
  foggy dusty muddy sleepy lazy busy happy jolly merry cheery grumpy brave
  bold calm clever curious eager fancy fuzzy fluffy furry gentle giddy glad
  gleeful glossy grand hasty hungry humble jumpy keen kind lively lucky
  mighty modest nimble noble peppy perky plucky polite proud quick quiet
  quirky rapid rosy royal rowdy shiny shy silly sleek slick sly smooth
  snappy speedy spicy spiffy spotted striped sturdy swift tidy tiny huge
  little tall round square crooked wobbly wiggly zany zesty witty wise wild
  warm cool chilly cozy crisp crunchy silky velvet woolly bumpy bouncy
  breezy bright brisk bubbly chatty cheeky chunky dapper daring dizzy dreamy
  early fearless fierce fiery flashy fresh friendly frisky gallant gloomy
  graceful handy hardy hearty honest icy jazzy joyful loyal magic mellow
  mossy nifty patient plump puffy rugged rustic salty sassy shaggy sneaky
  soft sparkly spry stealthy stout sugary tangy tender thrifty toasty tough
  trusty upbeat vivid wacky wavy wily wooden zippy ancient cosmic arctic
  tropical polar lunar solar electric atomic mystic noisy secret shadowy
  spooky stellar sonic turbo vintage glassy steel iron stone crystal emerald
  ruby sapphire jade pearly satin linen denim tweed plaid dotted checkered
  curly spiky bristly feathery leafy grassy sunlit moonlit starry hollow
  heavy steady sprightly spirited charming chipper dainty elegant famous
  festive jaunty lanky lofty nutty quaint radiant regal savvy snug tame
  thorny tawny zealous
`
  .trim()
  .split(/\s+/);

const NOUNS = `
  pony otter badger beaver bison camel cheetah cobra condor cougar coyote
  crane cricket dingo dolphin donkey eagle falcon ferret finch flamingo fox
  gecko gerbil gibbon giraffe goose gopher gorilla hamster hare hawk
  hedgehog heron hippo hornet hyena iguana impala jackal jaguar kitten koala
  lemur leopard lion lizard llama lobster lynx magpie mammoth marmot meerkat
  mole moose mouse mule narwhal newt octopus ocelot oriole osprey ostrich
  owl panda panther parrot peacock pelican penguin pigeon piglet puffin puma
  python quail rabbit raccoon raven reindeer robin salmon seal shark sheep
  shrimp skunk sloth snail sparrow spider squid squirrel stork swan tapir
  tiger toad toucan trout turkey turtle viper walrus wasp weasel whale wolf
  wombat yak zebra beetle bumblebee butterfly moth ladybug lamb calf foal
  cub puppy duckling chick dragon unicorn griffin goblin wizard pirate robot
  astronaut knight ninja viking cowboy sailor pilot baker farmer dancer
  drummer painter poet ranger scout jester comet meteor planet rocket galaxy
  nebula asteroid moon cactus acorn tulip daisy lotus maple willow cedar oak
  pine fern mushroom pumpkin carrot turnip radish pickle pepper lemon muffin
  pancake waffle bagel biscuit cookie cupcake donut noodle dumpling taco
  burrito pretzel popcorn pudding walnut peanut almond coconut mango banana
  apple teapot kettle lantern compass anchor trumpet banjo violin cello tuba
  kazoo bucket basket blanket pillow mitten sock boot sneaker bicycle
  scooter tractor wagon sled kayak canoe yacht submarine balloon kite pebble
  boulder glacier volcano canyon meadow island harbor lighthouse castle
  tower igloo cabin windmill button zipper ribbon feather pencil crayon
  notebook trombone whistle magnet gadget gizmo widget
`
  .trim()
  .split(/\s+/);

const VERBS = `
  charging dancing jumping skipping hopping running racing dashing darting
  zooming gliding soaring flying floating drifting swimming diving splashing
  paddling rowing sailing surfing skating skiing sledding sliding spinning
  twirling whirling rolling tumbling bouncing wobbling wiggling juggling
  singing humming whistling drumming strumming laughing giggling grinning
  smiling winking waving clapping cheering yodeling napping dozing snoozing
  dreaming yawning stretching lounging munching nibbling chewing crunching
  sipping slurping baking cooking brewing painting drawing sketching reading
  writing knitting sewing building tinkering digging planting gardening
  fishing hiking climbing crawling creeping sneaking tiptoeing marching
  strolling wandering roaming exploring prowling pouncing leaping vaulting
  sprinting jogging galloping trotting prancing strutting waddling shuffling
  stomping tapping knocking ringing chiming beaming glowing shining
  sparkling twinkling blinking flickering buzzing chirping purring howling
  roaring growling barking quacking honking hooting squeaking sneezing
  hiccuping pondering wondering thinking plotting scheming snooping peeking
  hiding seeking searching hunting chasing fetching catching tossing
  flipping kicking pitching bowling boxing fencing wrestling sprouting
  blooming growing melting freezing sizzling bubbling fizzing popping
  crackling rumbling thundering rattling jingling jangling swinging swaying
  rocking bobbing weaving zigzagging looping orbiting hovering launching
  landing docking steering resting relaxing
`
  .trim()
  .split(/\s+/);

export const KEY_WORDS = { adjectives: ADJECTIVES, nouns: NOUNS, verbs: VERBS };

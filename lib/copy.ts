import { currentVoice, type Voice } from "./voice";

/**
 * Every string the interface shows that reads differently in the two voices,
 * plain and Al Swearengen's, side by side. See `lib/voice.ts` for how a page
 * picks one.
 *
 * A string that reads the same in both, a label such as "How many cards", stays
 * where it is used and is not repeated here. The few passages with a link or
 * bold words inside them cannot be one string; they keep both versions side by
 * side where they are rendered, in a `<Voiced>`.
 *
 * Plain is the copy as it was before the other voice existed, and the tests
 * that pin a message's wording read it in plain. The other voice borrows his
 * manner and never his lines, and never his slurs. `lib/copy.test.ts` checks
 * that every entry has both.
 */

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const COPY = {
  /* The frame, and the links every page shares. */
  "layout.tagline": { plain: "Recall, then flip", swearengen: "No peekin’, fucker" },
  "nav.allDecks": { plain: "All decks", swearengen: "Back to the decks" },
  "nav.addDeck": { plain: "Add a deck", swearengen: "Bring a deck" },
  "common.close": { plain: "Close", swearengen: "Shut it" },

  "notFound.title": { plain: "Page not found", swearengen: "Nothing here" },
  "notFound.heading": {
    plain: "Nothing at this address",
    swearengen: "There ain’t a fuckin’ thing at this address",
  },
  "notFound.body": {
    plain:
      "The link may be mistyped, or from an older version of the app. Every deck is on the deck list.",
    swearengen:
      "Either some cocksucker mistyped the link, or it’s from an older version of this establishment. Every deck we keep is on the deck list, where it’s always been.",
  },

  /* The index. */
  "index.addOwn": { plain: "Add your own deck", swearengen: "Bring your own fuckin’ deck" },
  "index.everythingShuffled": { plain: "Everything, shuffled", swearengen: "The whole lot, shuffled" },
  "index.everythingDue": { plain: "Everything, due today", swearengen: "The whole lot, owed today" },
  "index.blurbNothingDue": {
    plain: (decks: string) => `Nothing due today across ${decks}`,
    swearengen: (decks: string) => `Not a fuckin' card owed today across ${decks}`,
  },
  "index.blurbOneDeck": {
    plain: (cards: string, deck: string) => `${cards}, all from ${deck}`,
    swearengen: (cards: string, deck: string) => `${cards} owed, every one of 'em from ${deck}`,
  },
  "index.blurbManyDecks": {
    plain: (cards: string, decks: number) => `${cards} across ${decks} decks, interleaved`,
    swearengen: (cards: string, decks: number) => `${cards} owed across ${decks} decks, dealt in together`,
  },
  "index.blurbAll": {
    plain: (decks: number) => `All ${decks} decks, interleaved`,
    swearengen: (decks: number) => `All ${decks} decks, dealt in together`,
  },
  "index.headlineEmpty": {
    plain: "No decks yet. When you add one, write each answer before you turn the card over.",
    swearengen:
      "No decks yet, and I'll tell you the fuckin' terms before you add one: you write the answer down before you turn the card.",
  },
  "index.headline": {
    plain: (decks: string, cards: string) =>
      `${decks}, ${cards}. Write each answer before you turn the card over.`,
    swearengen: (decks: string, cards: string) =>
      `${decks}, ${cards}, and the fuckin' terms: you write the answer down before you turn the card.`,
  },
  "index.subtitle": {
    plain:
      "It’s easy to recognize an answer you couldn’t have written yourself. Writing it first shows you which cards you know.",
    swearengen:
      "Every cocksucker who ever nodded along at an answer believed he knew it, right up until somebody asked.",
  },
  "index.yourDecks": { plain: "Your decks", swearengen: "Decks you brought" },

  /* A deck card's actions, wherever a deck is offered. */
  "deck.study": { plain: "Study", swearengen: "Drill it" },
  "deck.print": { plain: "Print", swearengen: "Print it" },
  "deck.export": { plain: "Export", swearengen: "Take it" },
  "deck.hide": { plain: "Hide", swearengen: "Bury it" },
  "deck.delete": { plain: "Delete", swearengen: "Kill it" },
  "deck.due": {
    plain: (n: number) => `${n} due`,
    swearengen: (n: number) => `${n} owed`,
  },
  "deck.confirmDelete": {
    plain: (name: string) => `Delete "${name}" and its progress? This cannot be undone.`,
    swearengen: (name: string) =>
      `Kill "${name}" and every scrap of its progress? There's no bringing the fucker back.`,
  },

  /* The foot of the index. */
  "visibility.bringBack": {
    plain: (n: number) => `Bring back ${n} deck${n === 1 ? "" : "s"}`,
    swearengen: (n: number) => (n === 1 ? "Dig up the one you buried" : `Dig up the ${n} you buried`),
  },
  "visibility.hideBuiltIns": { plain: "Hide built-in decks", swearengen: "Bury the house decks" },
  "visibility.showBuiltIns": { plain: "Show built-in decks", swearengen: "Show the house decks" },
  "mode.group": { plain: "Study mode", swearengen: "How you’ll study" },
  "mode.free": { plain: "Free study", swearengen: "Free rein" },
  "mode.scheduled": { plain: "Spaced repetition", swearengen: "On the schedule" },
  "interval.label": { plain: "Spaced by", swearengen: "Makes ’em wait" },

  /* The import screen. */
  "new.intro": {
    plain:
      "Write one with AI, paste one, or upload a file. Added decks study and print like the built-in ones. They’re saved in this browser, and on your other devices if you sync.",
    swearengen:
      "Have a machine write you one, paste one in, or hand over a file. A deck you bring studies and prints the same as the house decks, and lives in this browser, and on your other devices too if you’ve the sense to sync.",
  },
  "new.formatHeading": { plain: "The format", swearengen: "How the fucker’s laid out" },
  "new.otherShapes": { plain: "Two other shapes work too", swearengen: "Two other shapes I’ll take" },
  "new.headingsShape": {
    plain: "Markdown headings, where the question is the heading and the answer is the text under it:",
    swearengen: "Markdown headings, the question for the heading and the answer the text under it:",
  },
  "new.lineShape": {
    plain: "Or one card per line, with the question and answer split by a tab or a pipe, the way a spreadsheet exports them:",
    swearengen:
      "Or one card to a line, question and answer split by a tab or a pipe, the way a spreadsheet coughs them up:",
  },
  "new.rules": { plain: "Rules worth knowing", swearengen: "The house rules" },
  "new.ruleTint": {
    plain: "takes a six-digit hex color for the corner triangle. Leave it out and one is assigned from the unused pastels.",
    swearengen:
      "takes a six-digit hex color for the corner triangle. Leave it out and you’re given one of the pastels nobody’s using.",
  },
  "new.ruleCount": {
    plain: "can be anything, but a multiple of eight fills every printed sheet. Short decks leave blank cells on the last one.",
    swearengen:
      "can be any number you fuckin’ please, but a multiple of eight fills every printed sheet. Come up short and the last sheet has holes in it.",
  },
  "new.ruleLength": {
    plain: ". Longer ones overflow a printed card.",
    swearengen: ". Run longer and the fucker falls off the edge of a printed card.",
  },

  "import.saveFailed": {
    plain:
      "Could not save. Browser storage is full or unavailable. Try a smaller deck, or a normal (non-private) window.",
    swearengen:
      "Couldn’t save the fucker. The browser’s storage is full, or it won’t give us any. Try a smaller deck, or a normal window instead of a private one.",
  },
  "import.chooseFile": { plain: "Choose a file", swearengen: "Hand over a file" },
  "import.loadExample": { plain: "Load the example", swearengen: "Show me the example" },
  "import.pasteHere": { plain: "Or paste the deck here", swearengen: "Or paste the fucker in here" },
  "import.found": {
    plain: (n: number) => `${n} ${s(n, "card", "cards")} found`,
    swearengen: (n: number) => `${n} ${s(n, "card", "cards")}, by my count`,
  },
  "import.more": {
    plain: (n: number) => `and ${n} more`,
    swearengen: (n: number) => `and ${n} more besides`,
  },
  "import.addCards": {
    plain: (n: number) => `Add ${n} ${s(n, "card", "cards")}`,
    swearengen: (n: number) => (n === 1 ? "Keep the one card" : `Keep these ${n} cards`),
  },
  "import.addDeck": { plain: "Add deck", swearengen: "Keep the deck" },

  /* The deck writer. */
  "gen.heading": { plain: "Write one with AI", swearengen: "Have a machine write the fucker" },
  "gen.needsKey": {
    plain: (company: string) =>
      `Needs an API key from ${company}. Best to make one just for this. The key stays in this browser and goes only to ${company}. Decks are billed to your account.`,
    swearengen: (company: string) =>
      `You’ll need an API key from ${company}, and you’d be wise to make one for this and nothing else. The key stays in this browser and goes to ${company} and no one else. They’ll bill you for the decks, as is their custom.`,
  },
  "gen.saveKey": { plain: "Save key", swearengen: "Keep the key" },
  "gen.cancel": { plain: "Cancel", swearengen: "Never mind" },
  "gen.subject": { plain: "What the deck is about", swearengen: "What the fucker’s about" },
  "gen.stop": { plain: "Stop", swearengen: "Stop the fucker" },
  "gen.tryAgain": { plain: "Try again", swearengen: "Try it again" },
  "gen.noTextModels": {
    plain: "This key can’t use any model that writes text. Check the key’s permissions, or use another provider.",
    swearengen:
      "This key can’t use a single model that writes text, which makes it about as useful as tits on a bull. Check the key’s permissions, or go to another provider.",
  },
  "gen.loadingModels": { plain: "Loading the models this key can use…", swearengen: "Asking what models this key can use…" },
  "gen.whatToChange": { plain: "What to change", swearengen: "What to fix" },
  "gen.revisePlaceholder": {
    plain: "Fewer definitions, more scenario questions",
    swearengen: "Fewer definitions, more of what they’ll actually ask",
  },
  "gen.revise": { plain: "Revise", swearengen: "Have it fixed" },
  "gen.writing": { plain: "Writing…", swearengen: "Writing, so keep your shirt on…" },
  "gen.change": { plain: "Change", swearengen: "Swap it" },
  "gen.forget": { plain: "Forget", swearengen: "Forget it" },
  "gen.showHidden": {
    plain: (n: number) => `Show ${n} hidden ${s(n, "model", "models")}`,
    swearengen: (n: number) => (n === 1 ? "Show the model I hid" : `Show the ${n} models I hid`),
  },
  "gen.who": { plain: "Who writes the deck", swearengen: "Who writes the fucker" },
  "gen.adviceOpenai": {
    plain: "A project key with a monthly budget and an expiry date is the safest kind to keep in a browser.",
    swearengen:
      "A project key with a monthly budget and an expiry date is the only kind anybody with sense leaves lying around in a browser.",
  },
  "gen.adviceGemini": {
    plain: "AI Studio keys don’t expire, so delete it when you’re done.",
    swearengen: "AI Studio keys don’t expire on their own, so kill it yourself when you’re done.",
  },
  "gen.loadModelsFailed": {
    plain: "Could not load the models. Try again.",
    swearengen: "Couldn’t get the list of models out of ’em. Try again.",
  },
  "gen.modelGoneReplaced": {
    plain: (model: string, replacement: string) =>
      `${model} can't write a deck from here, so it's off the list. ${replacement} is selected instead, so try again.`,
    swearengen: (model: string, replacement: string) =>
      `${model} can't write a deck from here, so it's off the list, and ${replacement} is standing in. Try again.`,
  },
  "gen.modelGoneLast": {
    plain: (model: string) =>
      `${model} can't write a deck from here, and it was the last model on the list. Try another provider.`,
    swearengen: (model: string) =>
      `${model} can't write a deck from here, and it was the last model on the fuckin' list. Try another provider.`,
  },
  "gen.failed": { plain: "Generation failed. Try again.", swearengen: "The writing went to shit partway. Try again." },

  /* The reviewer. */
  "reviewer.dealing": { plain: "Dealing today’s cards…", swearengen: "Dealing today’s cards, so hold your fuckin’ horses…" },
  "reviewer.tally": {
    plain: (held: number, review: number) => ` · ${held} held · ${review} to revisit`,
    swearengen: (held: number, review: number) => ` · ${held} had cold · ${review} didn’t know`,
  },
  "reviewer.shuffle": { plain: "Shuffle", swearengen: "Shuffle ’em" },
  "reviewer.srScheduled": {
    plain: (n: number, total: number, deck: string) => `Card ${n} of ${total} due today, ${deck}. `,
    swearengen: (n: number, total: number, deck: string) => `Card ${n} of ${total} owed today, from ${deck}. `,
  },
  "reviewer.srFree": {
    plain: (n: number, total: number, deck: string) => `Card ${n} of ${total}, ${deck}. `,
    swearengen: (n: number, total: number, deck: string) => `Card ${n} of ${total}, from ${deck}. `,
  },
  "reviewer.srAnswer": { plain: "Showing the answer.", swearengen: "There’s the answer, for what it’s worth to you." },
  "reviewer.srQuestion": { plain: "Showing the question.", swearengen: "There’s the question." },
  "reviewer.question": { plain: "Question", swearengen: "The question" },
  "reviewer.answerLabel": {
    plain: "Write your answer before turning the card over",
    swearengen: "Write your fuckin’ answer before you turn the card",
  },
  "reviewer.placeholder": {
    plain: "Write it from memory. A half answer still counts.",
    swearengen: "From memory, and don’t you peek. Half an answer’s worth more than none.",
  },
  "reviewer.writeFirst": {
    plain: "Write something first. A guess is fine.",
    swearengen: "Write something first, you lazy cocksucker. A guess’ll do.",
  },
  "reviewer.answer": { plain: "Answer", swearengen: "The answer" },
  "reviewer.youWrote": { plain: "You wrote", swearengen: "What you wrote" },
  "grade.held": { plain: "I had it", swearengen: "Had it cold" },
  "grade.review": { plain: "Needs review", swearengen: "Didn’t know shit" },
  "reviewer.previous": { plain: "Previous card", swearengen: "The card before" },
  "reviewer.next": { plain: "Next card", swearengen: "The next cocksucker" },
  "reviewer.turnOver": { plain: "Turn card over", swearengen: "Turn the fucker over" },
  "reviewer.turnBack": { plain: "Turn back", swearengen: "Turn it back" },
  "reviewer.keys": {
    plain: "⌘/Ctrl + Enter turn over · ← → move · 1 held · 2 revisit",
    swearengen: "⌘/Ctrl + Enter turns the fucker · ← → move along · 1 had it cold · 2 didn’t know shit",
  },
  "reviewer.keysShuffle": { plain: " · S shuffle", swearengen: " · S shuffles ’em" },

  "done.right": {
    plain: (n: number) => `${n} right`,
    swearengen: (n: number) => `${n} you had cold`,
  },
  "done.missed": {
    plain: (n: number) => `${n} need${n === 1 ? "s" : ""} review`,
    swearengen: (n: number) => `${n} you didn’t know shit about`,
  },
  "done.titleNow": { plain: "Done for now", swearengen: "That’s all for now" },
  "done.titleToday": { plain: "Done for today", swearengen: "That’s the day’s work" },
  "done.deckBack": {
    plain: (deck: string, when: string) => ` ${deck} comes back ${when}.`,
    swearengen: (deck: string, when: string) => ` ${deck} comes back ${when}, and you with it.`,
  },
  "done.nextBack": {
    plain: (when: string) => ` The next cards come back ${when}.`,
    swearengen: (when: string) => ` The next of ’em come back ${when}, and you with ’em.`,
  },
  "done.studyDeck": { plain: "Study the whole deck", swearengen: "Drill the whole fuckin’ deck" },
  "done.studyEvery": { plain: "Study every card", swearengen: "Drill every card" },

  "nothing.titleNow": { plain: "Nothing due right now", swearengen: "Nothing owed right now" },
  "nothing.titleToday": { plain: "Nothing due today", swearengen: "Nothing owed today" },
  "nothing.notScheduledDeck": {
    plain: (deck: string) => `Nothing in ${deck} is scheduled yet.`,
    swearengen: (deck: string) => `Not a card in ${deck} is on the schedule yet.`,
  },
  "nothing.notScheduled": {
    plain: "Nothing is scheduled yet. Cards join the schedule when you answer them in their own deck.",
    swearengen:
      "Nothing’s on the schedule yet. A card gets on it when you answer it in its own deck, and not a minute before.",
  },
  "nothing.body": {
    plain: (where: string, inDeck: boolean) =>
      `${where} You can still study ${inDeck ? "the whole deck" : "every card"}. That won’t change when any card comes back.`,
    swearengen: (where: string, inDeck: boolean) =>
      `${where} Drill ${inDeck ? "the whole deck" : "every card"} anyway if you’ve the stomach for it. It won’t move a single card’s day.`,
  },
  "nothing.studyAnyway": { plain: "Study anyway", swearengen: "Drill it anyway" },

  /* The color key beside the strip. */
  "key.title": { plain: "What the colors mean", swearengen: "What the fuckin’ colors mean" },
  "key.notAnswered": { plain: "Not answered yet", swearengen: "Ain’t been answered yet" },
  "key.box1": { plain: "You marked it “Needs review”", swearengen: "You said you didn’t know shit" },
  "key.box2": { plain: "One right answer in a row", swearengen: "Right once running" },
  "key.box3": { plain: "Two right answers in a row", swearengen: "Right twice running" },
  "key.box4": {
    plain: "Three right answers in a row",
    swearengen: "Right three times running, and you’ve earned the green",
  },
  "key.held": { plain: "You marked it “I had it”", swearengen: "You said you had it cold" },
  "key.review": { plain: "You marked it “Needs review”", swearengen: "You said you didn’t know shit" },
  "key.dashScheduled": {
    plain: "Each dash is one of today’s cards, colored by how far it has climbed.",
    swearengen: "Each dash is one of today’s cards, colored by how far the fucker’s climbed.",
  },
  "key.dashFree": {
    plain: "Each dash is a card, colored by your last answer.",
    swearengen: "Each dash is a card, colored by what you said last time.",
  },
  "key.current": { plain: "The card you’re on", swearengen: "The one you’re on" },
  "key.oneWrong": {
    plain: "One wrong answer sends a card back to red, so green means three in a row, not three in total.",
    swearengen:
      "One wrong answer and a card goes back to red, whatever it climbed, so green means three running and not three in all.",
  },
  "key.returnsDay": {
    plain: "Red comes back the next day, orange in two days, yellow in three, green in four.",
    swearengen: "Red comes back the next day, orange in two days, yellow in three, green in four, like clockwork.",
  },
  "key.returnsHours": {
    plain: (red: string, orange: number, yellow: number, green: number) =>
      `Red comes back in ${red}, orange in ${orange}, yellow in ${yellow}, green in ${green}.`,
    swearengen: (red: string, orange: number, yellow: number, green: number) =>
      `Red comes back in ${red}, orange in ${orange}, yellow in ${yellow}, green in ${green}, like clockwork.`,
  },
  "key.afterLink": {
    plain: "at the bottom of the deck list. Cards already scheduled aren’t moved.",
    swearengen: "at the bottom of the deck list. Cards already on the schedule stay where they’re put.",
  },

  /* A session's breakdown in the queue bar. */
  "queue.overdue": { plain: "overdue", swearengen: "late" },
  "queue.today": { plain: "due today", swearengen: "owed today" },
  "queue.fresh": { plain: "new", swearengen: "fresh meat" },
  "queue.notDue": { plain: "not due", swearengen: "not owed" },
  "queue.srPrefix": { plain: "Today:", swearengen: "Today’s accounts:" },

  /* The shuffled set, a missing deck, and the study and print pages. */
  "study.everything": { plain: "Everything", swearengen: "The whole lot" },
  "print.allTitle": { plain: "Print all decks", swearengen: "Print the whole lot" },
  "print.allHeading": { plain: "All decks", swearengen: "The whole lot" },
  "print.inDialog": { plain: "In the print dialog", swearengen: "Set these in the print dialog" },
  "print.mirrored": {
    plain: "Answers are already mirrored, so each one lands on the back of its own question. Cut along the dashed lines.",
    swearengen:
      "The answers are mirrored already, so each one lands on the back of its own question, and you needn’t trouble yourself about it. Cut along the dashed lines, and mind your fuckin’ fingers.",
  },
  "print.blanks": {
    plain: (n: number) =>
      `The last sheet has ${n} blank ${s(n, "cell", "cells")}, since this deck is not a multiple of eight.`,
    swearengen: (n: number) =>
      `The last sheet has ${n} blank ${s(n, "cell", "cells")}, the deck not being a multiple of eight.`,
  },
  "print.button": { plain: "Print these sheets", swearengen: "Print the fuckers" },
  "shuffled.nothing": { plain: "Nothing to study here", swearengen: "Not a fuckin’ thing to study here" },
  "shuffled.unknown": {
    plain: "This link asks for decks that are not in this app.",
    swearengen: "This link asks for decks this house has never heard of.",
  },
  "shuffled.allHidden": {
    plain: "Every deck this shuffle draws from is hidden. Bring them back from the deck index.",
    swearengen: "Every deck this shuffle draws from is buried. Dig ’em up from the deck list.",
  },
  "custom.noSuch": { plain: "No such deck", swearengen: "No such fuckin’ deck" },
  "custom.loading": { plain: "Loading deck…", swearengen: "Fetching the deck…" },
  "custom.missingHeading": {
    plain: (slug: string) => `No deck called “${slug}” here`,
    swearengen: (slug: string) => `There’s no deck called “${slug}” in this house`,
  },
  "custom.missingBody": {
    plain:
      "Imported decks are saved in the browser that added them, and on the devices that sync with it. This link won’t open anywhere else, including a private window.",
    swearengen:
      "A deck you bring lives in the browser that brought it, and on the devices that sync with that one. This link won’t open anywhere else, private window included, and no amount of wishing changes it.",
  },
  "custom.importedBlurb": {
    plain: (n: number) => `${n} imported cards`,
    swearengen: (n: number) => `${n} cards, brought in`,
  },

  /* Sync, in the browser. */
  "sync.label": { plain: "Sync across devices", swearengen: "Sync your fuckin’ devices" },
  "sync.stopped": { plain: "Sync stopped", swearengen: "Sync’s stopped" },
  "sync.syncing": { plain: "Syncing…", swearengen: "Syncing, hold on…" },
  "sync.notSynced": { plain: "Not synced", swearengen: "Ain’t synced" },
  "sync.synced": { plain: "Synced across devices", swearengen: "Synced, every device" },
  "sync.noteLabel": { plain: "How your key is used", swearengen: "What becomes of your key" },
  "sync.whichDevice": { plain: "Which device is this", swearengen: "Which device this is" },
  "sync.firstDevice": { plain: "My first device", swearengen: "This is the first one" },
  "sync.haveKey": { plain: "I have a key", swearengen: "I’ve got a key" },
  "sync.introNew": {
    plain:
      "Choose a key for your progress and imported decks, or keep the one suggested. You’ll use it, or its QR code, to add your other devices.",
    swearengen:
      "Pick a key for your progress and the decks you’ve brought, or keep the one I’ve suggested. You’ll use it, or its QR code, to bring your other devices in.",
  },
  "sync.introJoin": {
    plain: "Enter the key from your first device. Scanning its QR code with this device’s camera fills it in.",
    swearengen: "Put in the key from your first device. Point this one’s camera at its QR code and the fucker fills itself in.",
  },
  "sync.keyPlaceholder": { plain: "Your key", swearengen: "Your key, if you please" },
  "sync.checking": { plain: "Checking the key…", swearengen: "Seeing about the key…" },
  "sync.start": { plain: "Start syncing", swearengen: "Start the syncing" },
  "sync.join": { plain: "Join", swearengen: "Throw in with ’em" },
  "sync.keyHint": {
    plain: (min: number) => `At least ${min} characters. Capital letters count.`,
    swearengen: (min: number) => `${min} characters at the least, and capital letters count, so mind ’em.`,
  },
  "sync.suggest": { plain: "Suggest another", swearengen: "Give me another" },
  "sync.noteIntro": {
    plain:
      "Syncing with a key trades some security for ease of use. There’s no account, email or password to set up, and no password reset either. Your key is the only lock.",
    swearengen:
      "Syncing with a key trades some safety for ease, and I’ll not pretend otherwise. There’s no account, email or password to set up, and so no password reset either when you fuck it up. The key’s the only lock on the door.",
  },
  "sync.noteDevice": {
    plain: "the key is saved in the browser so syncing keeps working. Anyone who can use this browser can see it.",
    swearengen:
      "the key’s kept in the browser so the syncing keeps on. Any son of a bitch who can use this browser can see it.",
  },
  "sync.noteSent": {
    plain: "The server receives a fingerprint of the key, used to find your data, and your progress encrypted with the key. It can’t read your answers.",
    swearengen:
      "The server gets a fingerprint of the key, to find your data by, and your progress locked up with the key. It can’t read a word of your answers.",
  },
  "sync.noteGuess": {
    plain: ", and whoever guesses it can read and change your progress. A longer key, or several unrelated words, is much harder to guess.",
    swearengen:
      ", and the cocksucker who guesses it can read your progress and change it besides. A longer key, or a few words with nothing to do with each other, is a sight harder to guess.",
  },
  "sync.notePhoto": { plain: "has your key.", swearengen: "has your key, same as you." },
  "sync.noteLost": {
    plain: "and it can’t be recovered.",
    swearengen: "and it’s gone for good. Nobody’s getting it back, me included.",
  },
  "sync.copyFailed": {
    plain: "Couldn’t copy the link. Show the key and type it on the other device instead.",
    swearengen: "Couldn’t copy the fuckin’ link. Show the key and type it on the other device instead.",
  },
  "sync.statusAt": {
    plain: (when: string) => `This device is syncing. Last synced ${when}.`,
    swearengen: (when: string) => `This device is syncing. Last synced ${when}, and all square.`,
  },
  "sync.keyLabel": { plain: "Key", swearengen: "The key" },
  "sync.hideKey": { plain: "Hide", swearengen: "Hide it" },
  "sync.showKey": { plain: "Show", swearengen: "Show it" },
  "sync.hideQr": { plain: "Hide QR code", swearengen: "Put the QR code away" },
  "sync.showQr": { plain: "Show QR code", swearengen: "Show the QR code" },
  "sync.copied": { plain: "Link copied", swearengen: "Copied, go on" },
  "sync.copy": { plain: "Copy link", swearengen: "Copy the link" },
  "sync.now": { plain: "Sync now", swearengen: "Sync it now" },
  "sync.stopHere": { plain: "Stop syncing on this device", swearengen: "Stop syncing this one" },
  "sync.deleteCopy": { plain: "Delete the synced copy", swearengen: "Kill the synced copy" },
  "sync.deleteWarning": {
    plain: "This deletes the copy on the server. Every device stops syncing, and each keeps the progress it has.",
    swearengen: "This kills the copy on the server. Every device stops syncing, and each one keeps whatever progress it’s got.",
  },
  "sync.deleting": { plain: "Deleting…", swearengen: "Killing it…" },
  "sync.delete": { plain: "Delete it", swearengen: "Kill it" },
  "sync.keep": { plain: "Keep it", swearengen: "Leave it be" },
  "sync.qrLabel": { plain: "QR code for joining with this key", swearengen: "QR code for throwing in with this key" },
  "sync.qrHelp": {
    plain: "Scan it with your other device’s camera to open this app with the key filled in. Anyone with a photo of this code has your key.",
    swearengen:
      "Point your other device’s camera at it and this app opens with the key filled in. Anyone with a photo of this code has your key, so don’t go showing it around the saloon.",
  },
  "sync.unreachable": {
    plain: "Couldn’t reach the server. Your progress is saved on this device and will sync when you’re back online.",
    swearengen:
      "Couldn’t reach the fuckin’ server. Your progress is safe on this device, and it’ll sync when you’re back among the living.",
  },
  "sync.serverAnswered": {
    plain: (status: number) => `The server answered ${status}. Try again in a minute.`,
    swearengen: (status: number) => `The server answered ${status}, which ain’t an answer. Try again in a minute.`,
  },
  "sync.deletedElsewhere": {
    plain: "The synced copy was deleted from another device, so this one stopped syncing. Its progress is still here.",
    swearengen:
      "Some other device killed the synced copy, so this one stopped syncing. Its progress is still here, where you left it.",
  },
  "sync.wrongKey": {
    plain: "The synced copy couldn’t be unlocked with this key. Stop syncing and join again with the key from your other device.",
    swearengen:
      "This key won’t open the synced copy. Stop syncing this one and throw in again with the key from your other device.",
  },
  "sync.contended": {
    plain: "Other devices kept syncing at the same moment. This one will try again shortly.",
    swearengen: "The other devices kept syncing at the same fuckin’ moment. This one’ll try again directly.",
  },
  "sync.partway": {
    plain: "Sync stopped partway. Your progress is saved on this device, and it will try again.",
    swearengen: "Sync stopped partway. Your progress is safe on this device, and it’ll try again.",
  },
  "sync.keyTooShort": {
    plain: (min: number) => `A key needs at least ${min} characters.`,
    swearengen: (min: number) => `A key needs ${min} characters at the least.`,
  },
  "sync.keyTaken": {
    plain: "That key is already in use. If it’s yours, choose “I have a key” instead.",
    swearengen: "Some other cocksucker’s already using that key. If it’s yours, choose “I’ve got a key” instead.",
  },
  "sync.nothingUnderKey": {
    plain: "Nothing is stored under that key. Check it for typos (capital letters count), or start syncing with it as a new key.",
    swearengen:
      "There ain’t a thing stored under that key. Check it for typos (capital letters count), or start syncing with it as a new one.",
  },
  "sync.checkFailed": {
    plain: "Something went wrong while checking the key. Try again.",
    swearengen: "Something went to shit while I was checking the key. Try again.",
  },
  "sync.deleteFailed": { plain: "Couldn’t delete it. Try again.", swearengen: "Couldn’t kill it. Try again." },

  /* Sync and export, on the server. */
  "api.busy": {
    plain: "Too many requests from this network. Wait a few minutes and try again.",
    swearengen: "Too many fuckin' requests from this network. Sit on your hands a few minutes, then try again.",
  },
  "api.notSetUp": {
    plain: "Sync isn’t set up on this server yet.",
    swearengen: "Sync ain’t set up on this server yet, so there’s nothing for it to do.",
  },
  "api.notAnId": { plain: "That isn’t a sync id.", swearengen: "Whatever that is, it ain’t a sync id." },
  "api.tooManyKeys": {
    plain: "Too many keys tried from this network. Wait an hour and try again.",
    swearengen:
      "Too many keys tried from this network, which is how somebody picking a lock behaves. Wait an hour and try again.",
  },
  "api.nothingStored": { plain: "Nothing is stored under that key.", swearengen: "Nothing’s stored under that key." },
  "api.notJson": { plain: "The request wasn’t JSON.", swearengen: "The request wasn’t JSON, and I don’t read anything else." },
  "api.needsVersion": {
    plain: "The request needs a version and the data.",
    swearengen: "The request needs a version and the data, the both of them.",
  },
  "api.tooBig": {
    plain: "There’s more progress here than sync can hold.",
    swearengen: "There’s more progress here than sync can carry. Admirable, and a fuckin’ problem.",
  },
  "export.noDeck": {
    plain: (slug: string) => `No deck called "${slug}".`,
    swearengen: (slug: string) => `There's no deck called "${slug}" in this house, and I'd know.`,
  },

  /* What the parser says about a deck. */
  "parse.untitled": { plain: "Untitled deck", swearengen: "A deck with no name" },
  "parse.longAnswer": {
    plain: (length: number, fits: number, q: string) =>
      `This answer is ${length} characters, and a printed card fits about ${fits}, so it will run off the card: "${q}"`,
    swearengen: (length: number, fits: number, q: string) =>
      `This answer runs ${length} characters, and a printed card holds about ${fits}, so the fucker falls off the edge: "${q}"`,
  },
  "parse.noAnswer": {
    plain: (q: string) => `Question has no answer: "${q}"`,
    swearengen: (q: string) => `A question with no answer to it: "${q}"`,
  },
  "parse.badId": {
    plain: (value: string) => `Not a uuid, so a new id was generated: "${value}"`,
    swearengen: (value: string) => `That ain't a uuid, so it's been given a new one: "${value}"`,
  },
  "parse.badTint": {
    plain: (value: string) => `Not a six-digit hex color, so a tint was picked for you: "${value}"`,
    swearengen: (value: string) => `That ain't a six-digit hex color, so a tint was picked for you: "${value}"`,
  },
  "parse.orphanAnswer": {
    plain: "Answer with no question above it",
    swearengen: "An answer with no question over it, which is a fuckin' orphan",
  },
  "parse.ignored": {
    plain: (line: string) => `Ignored, no Q: above it: "${line}"`,
    swearengen: (line: string) => `Ignored, there's no Q: above it: "${line}"`,
  },
  "parse.noPair": {
    plain: (line: string) => `Could not find a question and answer on this line: "${line}"`,
    swearengen: (line: string) => `Couldn't find a question or an answer on this line, look as I might: "${line}"`,
  },
  "parse.noCards": {
    plain: "No cards found. Check the format guide below",
    swearengen: "Not a single card in the whole fuckin' thing. Check the format guide below",
  },

  /* The providers: where keys come from, and what their errors mean. */
  "keys.linkAnthropic": { plain: "Get a key from the Anthropic console", swearengen: "Go get a key from the Anthropic console" },
  "keys.linkOpenai": { plain: "Get a key from the OpenAI platform", swearengen: "Go get a key from the OpenAI platform" },
  "keys.linkGemini": { plain: "Get a key from Google AI Studio", swearengen: "Go get a key from Google AI Studio" },
  "keys.wrongProvider": {
    plain: (owner: string, name: string, company: string) =>
      `That looks like ${owner} key. Choose ${name} above to use it, or paste your ${company} key here.`,
    swearengen: (owner: string, name: string, company: string) =>
      `Christ, that's ${owner} key. Choose ${name} above to use it, or paste your ${company} key here, where it belongs.`,
  },
  "keys.notAnthropic": {
    plain: "That doesn't look like an Anthropic key. They start with sk-ant- . Copy the whole thing from the console.",
    swearengen:
      "That ain't an Anthropic key, whatever it is. They start with sk-ant- . Copy the whole fuckin' thing from the console.",
  },
  "keys.notOpenai": {
    plain: "That doesn't look like an OpenAI key. They start with sk- . Copy the whole thing from the API keys page.",
    swearengen:
      "That ain't an OpenAI key, whatever it is. They start with sk- . Copy the whole fuckin' thing from the API keys page.",
  },
  "keys.notGemini": {
    plain: "That doesn't look like a Gemini API key. They start with AQ. or AIza . Copy the whole thing from Google AI Studio.",
    swearengen:
      "That ain't a Gemini API key, whatever it is. They start with AQ. or AIza . Copy the whole fuckin' thing from Google AI Studio.",
  },

  "llm.declined": {
    plain: "The model declined to write this deck. Try a different subject, or another model.",
    swearengen: "The model wouldn't write this deck, delicate fuckin' flower. Try a different subject, or another model.",
  },
  "llm.cutOff": {
    plain: "The deck was cut off before it finished. Try asking for fewer cards, or another model.",
    swearengen: "The deck got cut off before it was finished. Ask for fewer cards, or try another model.",
  },
  "llm.rejectedRevoked": {
    plain: "That key was rejected. Check it hasn't been revoked, or paste a new one.",
    swearengen:
      "That key was rejected, turned away at the door like a drunk. Check it hasn't been revoked, or paste a new one.",
  },
  "llm.rejectedDeleted": {
    plain: "That key was rejected. Check it hasn't been deleted, or paste a new one.",
    swearengen:
      "That key was rejected, turned away at the door like a drunk. Check it hasn't been deleted, or paste a new one.",
  },
  "llm.rateLimited": {
    plain: "Your account hit its rate limit. Wait a minute and try again.",
    swearengen: "Your account hit its rate limit, greedy son of a bitch. Wait a minute and try again.",
  },
  "llm.modelUnavailable": {
    plain: "That model isn't available to this key. Pick another model.",
    swearengen: "That model won't deal with this key. Pick another model.",
  },
  "llm.cannotWrite": {
    plain: "That model can't write a deck from here. Pick another model.",
    swearengen: "That model can't write a deck from here, the useless fucker. Pick another model.",
  },
  "llm.rejectedRequest": {
    plain: (message: string) => `The request was rejected: ${message}`,
    swearengen: (message: string) => `They turned the request away: ${message}`,
  },
  "llm.anthropicCredit": {
    plain: "Your Anthropic account is out of credit. Add some under Plans and billing in the console, then try again.",
    swearengen:
      "Your Anthropic account is out of credit, and they don't write on the slate. Add some under Plans and billing in the console, then try again.",
  },
  "llm.anthropicNoAccess": {
    plain: "That key doesn't have access to this model. Pick another model, or check the key's permissions in the Anthropic console.",
    swearengen:
      "That key ain't allowed near this model. Pick another model, or check the key's permissions in the Anthropic console.",
  },
  "llm.anthropicWorkspace": {
    plain:
      'That key isn\'t tied to a workspace, because its scope was left as "Same as linked account". Make another key in the console with Scope set to a workspace such as "Default", and paste that one.',
    swearengen:
      'That key ain\'t tied to a workspace, because some genius left its scope as "Same as linked account". Make another key in the console with Scope set to a workspace such as "Default", and paste that one.',
  },
  "llm.anthropicUnreachable": {
    plain: "Could not reach Anthropic. Check your connection and try again.",
    swearengen: "Could not reach Anthropic, and I tried. Check your connection and try again.",
  },
  "llm.anthropicError": {
    plain: (message: string) => `Anthropic returned an error: ${message}`,
    swearengen: (message: string) => `Anthropic sent back an error: ${message}`,
  },
  "llm.openaiNoModels": {
    plain:
      "That key doesn't have permission to use models. On the OpenAI platform, edit the key and set Model capabilities to Request, or give it All permissions, then try again. A change can take a minute to apply.",
    swearengen:
      "That key ain't permitted to use models. On the OpenAI platform, edit the key and set Model capabilities to Request, or give it All permissions, then try again. The change can take a minute to take hold.",
  },
  "llm.openaiNoList": {
    plain:
      "That key doesn't have permission to list models. On the OpenAI platform, edit the key and set List models to Read, then try again.",
    swearengen:
      "That key ain't permitted to list models. On the OpenAI platform, edit the key and set List models to Read, then try again.",
  },
  "llm.openaiMissingPermission": {
    plain:
      "That key is missing a permission this page needs. On the OpenAI platform, edit the key and give it List models: Read and Model capabilities: Request, or All permissions.",
    swearengen:
      "That key is missing a permission this page needs, and I can't conjure it. On the OpenAI platform, edit the key and give it List models: Read and Model capabilities: Request, or All permissions.",
  },
  "llm.openaiCredit": {
    plain: "Your OpenAI account is out of credit, or over its budget. Check Billing on the OpenAI platform, then try again.",
    swearengen:
      "Your OpenAI account is out of credit, or over its budget, which amounts to the same fuckin' thing. Check Billing on the OpenAI platform, then try again.",
  },
  "llm.openaiRegion": {
    plain: "OpenAI doesn't offer its API where you are.",
    swearengen: "OpenAI won't sell its API where you are, and there's no arguing it.",
  },
  "llm.openaiNoAccess": {
    plain: "That key doesn't have access to this model. Pick another model, or check the project's permissions on the OpenAI platform.",
    swearengen:
      "That key ain't allowed near this model. Pick another model, or check the project's permissions on the OpenAI platform.",
  },
  "llm.openaiTrouble": {
    plain: "OpenAI had a problem on its side. Try again in a moment.",
    swearengen: "OpenAI’s got troubles of its own. Try again in a moment.",
  },
  "llm.openaiError": {
    plain: (detail: string) => `OpenAI returned an error${detail}.`,
    swearengen: (detail: string) => `OpenAI sent back an error${detail}.`,
  },
  "llm.openaiUnreachable": {
    plain: "Could not reach OpenAI. Check your connection and try again.",
    swearengen: "Could not reach OpenAI, and I tried. Check your connection and try again.",
  },
  "llm.geminiRegion": {
    plain:
      "The Gemini API isn't available where you are on the free tier. Turn on billing for the key's project in Google AI Studio, or use another provider.",
    swearengen:
      "The Gemini API won't serve you where you are on the free tier, being free. Turn on billing for the key's project in Google AI Studio, or use another provider.",
  },
  "llm.geminiQuota": {
    plain: "Your Gemini quota is used up for now. Wait a minute, or check the project's limits and billing in Google AI Studio.",
    swearengen:
      "Your Gemini quota is used up for now, every drop. Wait a minute, or check the project's limits and billing in Google AI Studio.",
  },
  "llm.geminiForbidden": {
    plain: "That key can't use the Gemini API. Check the key's restrictions, or make a new one in Google AI Studio.",
    swearengen:
      "That key can't use the Gemini API. Check what they've fenced it in with, or make a new one in Google AI Studio.",
  },
  "llm.geminiTrouble": {
    plain: "Gemini is overloaded or having trouble. Try again in a moment.",
    swearengen: "Gemini’s overloaded, or otherwise indisposed. Try again in a moment.",
  },
  "llm.geminiError": {
    plain: (detail: string) => `Gemini returned an error${detail}.`,
    swearengen: (detail: string) => `Gemini sent back an error${detail}.`,
  },
  "llm.geminiUnreachable": {
    plain: "Could not reach Gemini. Check your connection and try again.",
    swearengen: "Could not reach Gemini, and I tried. Check your connection and try again.",
  },
} as const satisfies Record<
  string,
  { plain: string; swearengen: string } | { plain: (...args: never[]) => string; swearengen: (...args: never[]) => string }
>;

export type CopyKey = keyof typeof COPY;

/** What a key's words need filled in: nothing for a plain string. */
export type CopyArgs<K extends CopyKey> = (typeof COPY)[K]["plain"] extends (...args: infer A) => string
  ? A
  : [];

/** The keys whose words need nothing filled in. */
export type PlainKey = { [K in CopyKey]: CopyArgs<K> extends [] ? K : never }[CopyKey];

/** A key's words in the voice given. */
export function pick<K extends CopyKey>(key: K, voice: Voice, ...args: CopyArgs<K>): string {
  const words = COPY[key][voice] as string | ((...args: unknown[]) => string);
  return typeof words === "function" ? words(...args) : words;
}

/**
 * A key's words in the voice this page is in, read when it is called. For a
 * message made after the page has loaded: an error, a warning, a confirm.
 */
export function say<K extends CopyKey>(key: K, ...args: CopyArgs<K>): string {
  return pick(key, currentVoice(), ...args);
}

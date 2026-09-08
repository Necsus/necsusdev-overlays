const previewNow = Date.parse("2030-01-01T12:00:00Z");

const giveawayPreviewStates = {
  hidden: {
    state: "HIDDEN",
    giveaway_id: null,
    lot: null,
    closes_at: null,
    participant_count: 0,
    winners: [],
  },

  openTimed: {
    state: "OPEN",
    giveaway_id: "preview-giveaway",
    lot: "Clavier mécanique",
    closes_at: new Date(previewNow + 90_000).toISOString(),
    participant_count: 42,
    winners: [],
  },

  waiting: {
    state: "WAITING",
    giveaway_id: "preview-giveaway",
    lot: "Clavier mécanique",
    closes_at: null,
    participant_count: 0,
    winners: [],
  },

  open: {
    state: "OPEN",
    giveaway_id: "preview-giveaway",
    lot: "Clavier mécanique",
    closes_at: null,
    participant_count: 42,
    winners: [],
  },

  winner: {
    state: "WINNER",
    giveaway_id: "preview-giveaway",
    lot: "Clavier mécanique",
    closes_at: null,
    participant_count: 42,
    winners: [
      {
        twitch_user_id: "preview-user-1",
        display_name: "PixelLuna",
      },
    ],
  },

  multipleWinners: {
    state: "WINNER",
    giveaway_id: "preview-giveaway",
    lot: "Clavier mécanique",
    closes_at: null,
    participant_count: 42,
    winners: [
      {
        twitch_user_id: "preview-user-1",
        display_name: "PixelLuna",
      },
      {
        twitch_user_id: "preview-user-2",
        display_name: "NovaChat",
      },
    ],
  }
};

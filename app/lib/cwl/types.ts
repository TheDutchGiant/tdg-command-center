export type CwlWarState =
  | "preparation"
  | "inWar"
  | "warEnded";

export type CwlClanStats = {
  tag: string;
  name: string;

  warSize: 15 | 30;

  /*
   * Huidige officiële score:
   * echte sterren + verdiende bonussterren.
   */
  stars: number;
  bonusStars: number;
  totalStars: number;

  /*
   * Totale destruction van afgelopen
   * en actuele wars.
   */
  destruction: number;

  /*
   * Aantal afgesloten wars.
   */
  completedWars: number;

  /*
   * Wars die momenteel bezig zijn.
   */
  currentWars: number;

  /*
   * Wars die nog moeten beginnen.
   */
  remainingWars: number;

  /*
   * Historische prestaties binnen
   * deze huidige CWL.
   */
  warHistory: CwlWarPerformance[];
};

export type CwlWarPerformance = {
  round: number;

  opponentTag: string;
  opponentName: string;

  state: CwlWarState;

  stars: number;
  bonusStars: number;
  totalStars: number;

  destruction: number;

  /*
   * Aantal aanvallen dat de clan
   * tijdens deze war beschikbaar had.
   */
  attacksAvailable: number;

  /*
   * Aantal aanvallen dat al gebruikt is.
   */
  attacksUsed: number;

  /*
   * Aantal aanvallen dat nog mogelijk is.
   */
  attacksRemaining: number;
};

export type CwlSimulationResult = {
  promotionChance: number;
  maximumPromotionChance: number;

  simulations: number;

  promotions: number;

  currentPosition: number;

  promotionSlots: number;

  currentScore: number;
  maximumPossibleScore: number;

  promotionStatus:
    | "GUARANTEED"
    | "POSSIBLE"
    | "IMPOSSIBLE";

  clansToPass: number;
  maxClansCanPass: number;

  bestPossiblePosition: number;
  worstPossiblePosition: number;
};
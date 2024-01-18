import { AwardsBody, CategoryName, Phase } from 'src/types/models';

export type iAccoladeData = {
  phase: Phase;
  awardsBody: AwardsBody;
  year: number;
  data: {
    [key: string]: string[];
  };
};

export const AMPAS_2024_SHORTLISTED: iAccoladeData = {
  phase: Phase.SHORTLIST,
  awardsBody: AwardsBody.ACADEMY_AWARDS,
  year: 2024,
  data: {
    [CategoryName.DOCUMENTARY]: [
      'American Symphony',
      'Apolonia, Apolonia',
      'Beyond Utopia',
      "Bobi Wine: The People's President",
      'Desperate Souls, Dark City and the Legend of Midnight Cowboy',
      'The Eternal Memory',
      'Four Daughters',
      'Going to Mars: The Nikki Giovanni Project',
      'In the Rearview',
      'Stamped from the Beginning',
      'Still: A Michael J. Fox Movie',
      'A Still Small Voice',
      '32 Sounds',
      'To Kill a Tiger',
      '20 Days in Mariupol'
    ],
    [CategoryName.INTERNATIONAL]: [
      'Amerikatsi',
      'The Monk and the Gun',
      'The Promised Land',
      'Fallen Leaves',
      'The Taste of Things',
      'The Teachers’ Lounge',
      'Godland',
      'The Captain',
      'Perfect Days',
      'Tótem',
      'The Mother of All Lies',
      'Society of the Snow',
      'Four Daughters',
      '20 Days in Mariupol',
      'The Zone of Interest'
    ],
    [CategoryName.MAKEUP]: [
      'Beau Is Afraid',
      'Ferrari',
      'Golda',
      'Killers of the Flower Moon',
      'The Last Voyage of the Demeter',
      'Maestro',
      'Napoleon',
      'Oppenheimer',
      'Poor Things',
      'Society of the Snow'
    ],
    [CategoryName.SCORE]: [
      'American Fiction',
      'American Symphony',
      'Barbie',
      'The Boy and the Heron',
      'The Color Purple',
      'Elemental',
      'The Holdovers',
      'Indiana Jones and the Dial of Destiny',
      'Killers of the Flower Moon',
      'Oppenheimer',
      'Poor Things',
      'Saltburn',
      'Society of the Snow',
      'Spider-Man: Across the Spider-Verse',
      'The Zone of Interest'
    ],
    [CategoryName.SOUND]: [
      'Barbie',
      'The Creator',
      'Ferrari',
      'The Killer',
      'Killers of the Flower Moon',
      'Maestro',
      'Mission: Impossible - Dead Reckoning Part One',
      'Napoleon',
      'Oppenheimer',
      'The Zone of Interest'
    ],
    [CategoryName.VISUAL_EFFECTS]: [
      'The Creator',
      'Godzilla Minus One',
      'Guardians of the Galaxy Vol. 3',
      'Indiana Jones and the Dial of Destiny',
      'Mission: Impossible - Dead Reckoning Part One',
      'Napoleon',
      'Poor Things',
      'Rebel Moon - Part One: A Child of Fire',
      'Society of the Snow',
      'Spider-Man: Across the Spider-Verse'
    ],
    // NOTE: Before running song, make sure there are no duplicates.
    // If there are, run fixSongs first, then put those song IDs in here
    [CategoryName.SONG]: [
      '666277-Quiet Eyes',
      '569094-Am I Dreaming',
      '898713-Road To Freedom',
      '626332-The Fire Inside',
      '558915-Keep It Movin',
      '1059811-High Life',
      '1171816-It Never Went Away',
      '346698-Dance The Night',
      '1059811-Meet in the Middle',
      '558915-Superpower I',
      '747188-Dear Alien (Who Art In Heaven)',
      `346698-I'm Just Ken`,
      '346698-What Was I Made For?',
      `695721-Can't Catch Me Now`,
      '466420-Wahzhazhe'
    ]
  }
};

export const AMPAS_2024_NOMS: iAccoladeData = {
  phase: Phase.NOMINATION,
  awardsBody: AwardsBody.ACADEMY_AWARDS,
  year: 2024,
  data: {
    [CategoryName.ACTRESS]: ['Lily Gladstone*Killers of the Flower Moon']
  }
};

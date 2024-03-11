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
    [CategoryName.PICTURE]: [
      'American Fiction',
      'Anatomy of a Fall',
      'Barbie',
      'The Holdovers',
      'Killers of the Flower Moon',
      'Maestro',
      'Oppenheimer',
      'Past Lives',
      'Poor Things',
      'The Zone of Interest'
    ],
    [CategoryName.ACTOR]: [
      'Bradley Cooper*Maestro',
      'Colman Domingo*Rustin',
      'Paul Giamatti*The Holdovers',
      'Cillian Murphy*Oppenheimer',
      'Jeffrey Wright*American Fiction'
    ],
    [CategoryName.ACTRESS]: [
      'Annette Bening*Nyad',
      'Lily Gladstone*Killers of the Flower Moon',
      'Sandra Hüller*Anatomy of a Fall',
      'Carey Mulligan*Maestro',
      'Emma Stone*Poor Things'
    ],
    [CategoryName.SUPPORTING_ACTOR]: [
      'Sterling K. Brown*American Fiction',
      'Robert De Niro*Killers of the Flower Moon',
      'Robert Downey Jr.*Oppenheimer',
      'Ryan Gosling*Barbie',
      'Mark Ruffalo*Poor Things'
    ],
    [CategoryName.SUPPORTING_ACTRESS]: [
      'Emily Blunt*Oppenheimer',
      'Danielle Brooks*The Color Purple',
      'America Ferrera*Barbie',
      'Jodie Foster*Nyad',
      `Da'Vine Joy Randolph*The Holdovers`
    ],
    [CategoryName.DIRECTOR]: [
      'The Zone of Interest',
      'Poor Things',
      'Oppenheimer',
      'Killers of the Flower Moon',
      'Anatomy of a Fall'
    ],
    [CategoryName.INTERNATIONAL]: [
      'The Captain',
      'Perfect Days',
      'Society of the Snow',
      'The Teachers’ Lounge',
      'The Zone of Interest'
    ],
    [CategoryName.ANIMATED]: [
      'The Boy and the Heron',
      'Elemental',
      'Nimona',
      'Robot Dreams',
      'Spider-Man: Across the Spider-Verse'
    ],
    [CategoryName.ADAPTED_SCREENPLAY]: [
      'American Fiction',
      'Barbie',
      'Oppenheimer',
      'Poor Things',
      'The Zone of Interest'
    ],
    [CategoryName.ORIGINAL_SCREENPLAY]: [
      'Anatomy of a Fall',
      'The Holdovers',
      'Maestro',
      'May December',
      'Past Lives'
    ],
    [CategoryName.SHORT_ANIMATED]: [
      'Letter to a Pig',
      'Ninety-Five Senses',
      'Our Uniform',
      'Pachyderm',
      'WAR IS OVER! Inspired by the Music of John and Yoko'
    ],
    [CategoryName.SHORT_LIVE_ACTION]: [
      'The After',
      'Invincible',
      'Knight of Fortune',
      'Red, White and Blue',
      'The Wonderful Story of Henry Sugar'
    ],
    [CategoryName.SHORT_DOCUMENTARY]: [
      'The ABCs of Book Banning',
      'The Barber of Little Rock',
      'Island In Between',
      'The Last Repair Shop',
      'Grandma & Grandma'
    ],
    [CategoryName.SCORE]: [
      'American Fiction',
      'Indiana Jones and the Dial of Destiny',
      'Killers of the Flower Moon',
      'Oppenheimer',
      'Poor Things'
    ],
    [CategoryName.SONG]: [
      '1171816-It Never Went Away',
      `346698-I'm Just Ken`,
      '346698-What Was I Made For?',
      '626332-The Fire Inside',
      '466420-Wahzhazhe'
    ],
    [CategoryName.COSTUMES]: [
      'Barbie',
      'Killers of the Flower Moon',
      'Napoleon',
      'Oppenheimer',
      'Poor Things'
    ],
    [CategoryName.MAKEUP]: [
      'Golda',
      'Maestro',
      'Oppenheimer',
      'Poor Things',
      'Society of the Snow'
    ],
    [CategoryName.DOCUMENTARY]: [
      `Bobi Wine: The People's President`,
      'The Eternal Memory',
      'Four Daughters',
      'To Kill A Tiger',
      '20 Days in Mariupol'
    ],
    [CategoryName.VISUAL_EFFECTS]: [
      'The Creator',
      'Godzilla Minus One',
      'Guardians of the Galaxy Vol. 3',
      'Mission: Impossible - Dead Reckoning Part One',
      'Napoleon'
    ],
    [CategoryName.SOUND]: [
      'The Creator',
      'Maestro',
      'Mission: Impossible - Dead Reckoning Part One',
      'Oppenheimer',
      'The Zone of Interest'
    ],
    [CategoryName.PRODUCTION_DESIGN]: [
      'Barbie',
      'Killers of the Flower Moon',
      'Napoleon',
      'Oppenheimer',
      'Poor Things'
    ],
    [CategoryName.EDITING]: [
      'Anatomy of a Fall',
      'The Holdovers',
      'Killers of the Flower Moon',
      'Oppenheimer',
      'Poor Things'
    ],
    [CategoryName.CINEMATOGRAPHY]: [
      'El Conde',
      'Killers of the Flower Moon',
      'Maestro',
      'Oppenheimer',
      'Poor Things'
    ]
  }
};

export const AMPAS_2024_WINS: iAccoladeData = {
  phase: Phase.WINNER,
  awardsBody: AwardsBody.ACADEMY_AWARDS,
  year: 2024,
  data: {
    [CategoryName.PICTURE]: ['Oppenheimer'],
    [CategoryName.ACTOR]: ['Cillian Murphy*Oppenheimer'],
    [CategoryName.ACTRESS]: ['Emma Stone*Poor Things'],
    [CategoryName.SUPPORTING_ACTOR]: ['Robert Downey Jr.*Oppenheimer'],
    [CategoryName.SUPPORTING_ACTRESS]: [`Da'Vine Joy Randolph*The Holdovers`],
    [CategoryName.DIRECTOR]: ['Oppenheimer'],
    [CategoryName.INTERNATIONAL]: ['The Zone of Interest'],
    [CategoryName.ANIMATED]: ['The Boy and the Heron'],
    [CategoryName.ADAPTED_SCREENPLAY]: ['American Fiction'],
    [CategoryName.ORIGINAL_SCREENPLAY]: ['Anatomy of a Fall'],
    [CategoryName.SHORT_ANIMATED]: [
      'WAR IS OVER! Inspired by the Music of John and Yoko'
    ],
    [CategoryName.SHORT_LIVE_ACTION]: ['The Wonderful Story of Henry Sugar'],
    [CategoryName.SHORT_DOCUMENTARY]: ['The Last Repair Shop'],
    [CategoryName.SCORE]: ['Oppenheimer'],
    [CategoryName.SONG]: ['346698-What Was I Made For?'],
    [CategoryName.COSTUMES]: ['Poor Things'],
    [CategoryName.MAKEUP]: ['Poor Things'],
    [CategoryName.DOCUMENTARY]: ['20 Days in Mariupol'],
    [CategoryName.VISUAL_EFFECTS]: ['Godzilla Minus One'],
    [CategoryName.SOUND]: ['The Zone of Interest'],
    [CategoryName.PRODUCTION_DESIGN]: ['Poor Things'],
    [CategoryName.EDITING]: ['Oppenheimer'],
    [CategoryName.CINEMATOGRAPHY]: ['Oppenheimer']
  }
};

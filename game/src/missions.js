// The four sorties of Langit Pos v2. Each mission is a different job for the
// same aeroplane: a mail run, a timed medevac against a headwind, a ring
// course that pays for smooth flying, and — new in v2 — a night mail run
// through a storm, where gusts shove the aeroplane and the rain hides the
// next ring until it is close. Rings and runways are fixed per mission.
export const MISSIONS = [
  {
    id: 1,
    name: 'Pos Pagi',
    subtitle: 'Antar surat ke Pulau Karang',
    brief: 'Lepas landas dari landasan Karang, terbang melewati tiga cincin pos, lalu mendarat di landasan seberang. Jaga throttle: bahan bakar cukup untuk satu kali jalan yang rapi, bukan dua. Cincin tepat di tengah menaikkan kombo — kombo tinggi melipatgandakan poin.',
    seed: 11,
    length: 9800,
    palette: 'morning',
    fuel: 100,
    timeLimit: 0,
    windBase: -2,
    windGust: 2,
    difficulty: 1,
    tag: '',
    runways: [
      { x0: 100, x1: 700, name: 'Karang' },
      { x0: 9100, x1: 9700, name: 'Sebrang' },
    ],
    rings: [
      { x: 2600, alt: 170, r: 42 },
      { x: 5200, alt: 230, r: 42 },
      { x: 7600, alt: 180, r: 42 },
    ],
    target: 'land',
  },
  {
    id: 2,
    name: 'Ambulans Senja',
    subtitle: 'Jemput pasien sebelum gelap',
    brief: 'Angin kencang dari depan dan tangki tidak penuh: sampai ke landasan Sebrang dalam 240 detik. Terbang rendah dan cepat lebih irit daripada menanjak tinggi — tapi laut tidak memaafkan. Terbang di atas 60 m/s melewati cincin memberi bonus kecepatan.',
    seed: 29,
    length: 9800,
    palette: 'dusk',
    fuel: 85,
    timeLimit: 240,
    windBase: -9,
    windGust: 6,
    difficulty: 2,
    tag: '',
    runways: [
      { x0: 100, x1: 700, name: 'Karang' },
      { x0: 9100, x1: 9700, name: 'Sebrang' },
    ],
    rings: [
      { x: 3800, alt: 150, r: 42 },
      { x: 6800, alt: 200, r: 42 },
    ],
    target: 'land',
  },
  {
    id: 3,
    name: 'Latihan Cincin',
    subtitle: 'Enam cincin, satu pendaratan',
    brief: 'Kursus akrobat di atas kepulauan: enam cincin berurutan, skor untuk lintasan yang mulus — belok kasar membuang kecepatan dan poin. Akhiri dengan pendaratan lembut di landasan Sebrang. Enam cincin tengah berurutan adalah jalan tercepat menuju kombo x4.',
    seed: 47,
    length: 10800,
    palette: 'noon',
    fuel: 100,
    timeLimit: 0,
    windBase: -3,
    windGust: 3,
    difficulty: 2,
    tag: '',
    runways: [
      { x0: 100, x1: 700, name: 'Karang' },
      { x0: 10100, x1: 10700, name: 'Sebrang' },
    ],
    rings: [
      { x: 1800, alt: 140, r: 40 },
      { x: 3400, alt: 240, r: 40 },
      { x: 5000, alt: 160, r: 40 },
      { x: 6600, alt: 260, r: 40 },
      { x: 8200, alt: 170, r: 40 },
      { x: 8800, alt: 190, r: 40 },
    ],
    target: 'land',
  },
  {
    id: 4,
    name: 'Badai Malam',
    subtitle: 'Surat terakhir menembus badai',
    brief: 'Malam, hujan, dan hembusan yang mendorong pesawat ke sana-sini: antar surat terakhir sebelum fajar dalam 300 detik. Cincin sulit dilihat dari jauh — ikuti panah kuning dan kompas. Pendaratan di tengah badai memberi nilai tertinggi.',
    seed: 63,
    length: 9800,
    palette: 'night',
    fuel: 90,
    timeLimit: 300,
    windBase: -6,
    windGust: 9,
    difficulty: 3,
    tag: 'BARU',
    runways: [
      { x0: 100, x1: 700, name: 'Karang' },
      { x0: 9100, x1: 9700, name: 'Sebrang' },
    ],
    rings: [
      { x: 2400, alt: 160, r: 42 },
      { x: 4600, alt: 240, r: 42 },
      { x: 6200, alt: 150, r: 42 },
      { x: 8000, alt: 200, r: 42 },
    ],
    target: 'land',
  },
];

/** Headwind at world x and time t: a steady base plus slow travelling gusts. */
export function windAt(mission, x, t) {
  const gust = Math.sin(x * 0.0011 + t * 0.35) * 0.6 + Math.sin(x * 0.0029 - t * 0.21) * 0.4;
  return mission.windBase + gust * mission.windGust;
}

// The three sorties of Langit Pos. Each mission is a different job for the same
// aeroplane: a mail run, a timed medevac against a headwind, and a ring course
// that pays for smooth flying. Rings and runways are fixed per mission.
export const MISSIONS = [
  {
    id: 1,
    name: 'Pos Pagi',
    subtitle: 'Antar surat ke Pulau Karang',
    brief: 'Lepas landas dari landasan Karang, terbang melewati tiga cincin pos, lalu mendarat di landasan seberang. Jaga throttle: bahan bakar cukup untuk satu kali jalan yang rapi, bukan dua.',
    seed: 11,
    length: 9800,
    palette: 'morning',
    fuel: 100,
    timeLimit: 0,
    windBase: -2,
    windGust: 2,
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
    brief: 'Angin kencang dari depan dan tangki tidak penuh: sampai ke landasan Sebrang dalam 240 detik. Terbang rendah dan cepat lebih irit daripada menanjak tinggi — tapi laut tidak memaafkan.',
    seed: 29,
    length: 9800,
    palette: 'dusk',
    fuel: 85,
    timeLimit: 240,
    windBase: -9,
    windGust: 6,
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
    brief: 'Kursus akrobat di atas kepulauan: enam cincin berurutan, skor untuk lintasan yang mulus — belok kasar membuang kecepatan dan poin. Akhiri dengan pendaratan lembut di landasan Sebrang.',
    seed: 47,
    length: 10800,
    palette: 'noon',
    fuel: 100,
    timeLimit: 0,
    windBase: -3,
    windGust: 3,
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
];

/** Headwind at world x and time t: a steady base plus slow travelling gusts. */
export function windAt(mission, x, t) {
  const gust = Math.sin(x * 0.0011 + t * 0.35) * 0.6 + Math.sin(x * 0.0029 - t * 0.21) * 0.4;
  return mission.windBase + gust * mission.windGust;
}

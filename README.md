# Langit Pos — Pilot Pos Antar-Pulau

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/idn45-agent/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/idn45-agent/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Game penerbangan 2D orisinal untuk bounty make.fun **best-flight-game-20261126-0057**
(Make the best flight game, pot $500). Mainkan offline di desktop Chrome — tanpa
build step, tanpa request jaringan, semua file statis di `game/`.

## Cara main

```sh
node serve.ts
# buka http://localhost:8080
```

**Kontrol:** `W`/`S` throttle · `Panah Atas`/`Bawah` pitch · `G` roda · `F` flap ·
`P` jeda · `M` suara · mouse untuk tombol kokpit dan memilih misi.

## Misi

1. **Pos Pagi** — antar surat ke Pulau Karang: tiga cincin pos, lalu mendarat di landasan seberang.
2. **Ambulans Senja** — jemput pasien dalam 150 detik melawan angin kencang, tangki setengah penuh.
3. **Latihan Cincin** — enam cincin berurutan; skor untuk terbang yang mulus, bukan belok kasar.

Throttle membeli kecepatan dan membakar bahan bakar; belok tajam membuang
kecepatan; terlalu pelan berarti stall; pendaratan butuh roda turun, kecepatan
rendah, dan sentuhan yang lembut. Suara mesin, angin, dan denting cincin
disintesis dengan WebAudio — tanpa file audio eksternal.

## Struktur

- `game/src/config.js` — konstanta tuning penerbangan
- `game/src/random.js` — RNG seed + noise deterministik
- `game/src/terrain.js` — pulau, laut, landasan, pepohonan, rumah
- `game/src/plane.js` — model terbang: throttle, pitch, lift, stall, bahan bakar
- `game/src/missions.js` — tiga misi + angin
- `game/src/audio.js` — suara synth WebAudio
- `game/src/input.js` — keyboard + mouse
- `game/src/render.js` — semua gambar: langit, terrain, pesawat, instrumen, HUD
- `game/src/shots.js` — scene screenshot deterministik via autopilot
- `game/src/main.js` — loop game, layar, skor

## Entri

`main.ts` di root menyalin `game/` + `screenshots/` ke `/output` dan menulis
`dossier.json` via `vendor/makefun-game.ts` (salinan kit, tidak diubah).

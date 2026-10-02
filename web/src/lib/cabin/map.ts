// Geometry of the cabin picture, public/cabin-737.jpg (1776 × 896, nose to the left): the body of a
// 737-800 with an empty floor, generated with Canva. The 189 seats are drawn by the screen from the
// numbers below, so the simulation knows exactly where every seat is (sketch s14, ADR-061).
// One class, 3-3: rows 21–52, row 21 has only C B A; K J H on the upper side of the picture.

export const MAP_W = 1776, MAP_H = 896;
export const BAND = { y: 236, h: 424 };                      // the part of the picture the screen shows
export const AISLE_Y = 437.5;
export const SEAT_W = 23, SEAT_H = 21;
const GAP = 2, X0 = 298, PITCH = 31.2, EXIT_GAP = 8;
export const EXIT_ROWS = [35, 36];                            // the overwing exits: more legroom
export const FIRST_ROW = 21, LAST_ROW = 52, MID_ROW = 36;     // the two carts meet between rows 36 and 37

export type Letter = 'K' | 'J' | 'H' | 'C' | 'B' | 'A';
export type Seat = { id: string; row: number; letter: Letter; x: number; y: number };

const r1 = (v: number) => Math.round(v * 10) / 10;
const top = AISLE_Y - 7.5 - (3 * SEAT_H + 2 * GAP), bottom = AISLE_Y + 7.5;
const SEAT_Y: Record<Letter, number> = {
  K: top, J: top + SEAT_H + GAP, H: top + 2 * (SEAT_H + GAP),
  C: bottom, B: bottom + SEAT_H + GAP, A: bottom + 2 * (SEAT_H + GAP),
};
const seatLeft = (row: number) => r1(X0 + (row - FIRST_ROW) * PITCH + EXIT_ROWS.filter((e) => row >= e).length * EXIT_GAP);

export const ROWS: number[] = Array.from({ length: LAST_ROW - FIRST_ROW + 1 }, (_, k) => FIRST_ROW + k);
export const SEATS: Seat[] = ROWS.flatMap((row) =>
  ((row === FIRST_ROW ? ['C', 'B', 'A'] : ['K', 'J', 'H', 'C', 'B', 'A']) as Letter[])
    .map((letter) => ({ id: `${row}${letter}`, row, letter, x: seatLeft(row), y: r1(SEAT_Y[letter]) })));

// Where a passenger of this row stands in the aisle.
export const rowX = (row: number) => seatLeft(row) + SEAT_W / 2;

// One lavatory in front (left side of the aircraft), two at the back. `door` is where the queue starts in the aisle.
export const LAV = {
  front: { door: 276, dir: 1, at: [[247, 482]] },
  rear: { door: 1326, dir: -1, at: [[1351, 392], [1351, 484]] },
} as const;
export type LavGroup = keyof typeof LAV;
export const GALLEY: Record<LavGroup, [number, number]> = { front: [262, AISLE_Y], rear: [1338, AISLE_Y] };
// Crew seats for takeoff and landing: A and B in front, C and D at the back.
export const JUMP: Record<CrewId, [number, number]> = {
  A: [266, AISLE_Y - 14], B: [266, AISLE_Y + 14], C: [1330, AISLE_Y - 14], D: [1330, AISLE_Y + 14],
};
export type CrewId = 'A' | 'B' | 'C' | 'D';
export const DOOR: [number, number] = [262, 524];             // front left door: the jet bridge

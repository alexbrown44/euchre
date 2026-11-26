// App-wide settings. The name lives here so it's a one-line change when the project gets its own.
export const APP_NAME = 'Euchre';
export const APP_TAGLINE = 'Pub-league house rules: the Benny, Up and Down, and defending alone';

export const TARGET_MIN = 10;
export const TARGET_MAX = 21;

/** The human always sits at seat 0, at the bottom of the screen. Seats go clockwise. */
export const SEAT_NAMES = ['You', 'West', 'Partner', 'East'] as const;

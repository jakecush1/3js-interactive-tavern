// SHOW DATA
// Upcoming performances listed in the Shows section of FooterOverlay.tsx.
// Shows are rendered in the order given here; past dates are filtered out
// automatically using `date` (ISO, local time).

export type Show = {
  id: string;
  /** ISO date-time, local to the venue. Used for sorting + past-date filtering. */
  date: string;
  /** Human-readable date shown on the placard. */
  dateLabel: string;
  timeLabel: string;
  venue: string;
  location: string;
  description: string;
  /** Official event site. */
  infoUrl?: string;
  /** Where the venue posts updates (socials, schedule changes). */
  updatesUrl?: string;
};

export const shows: Show[] = [
  {
    id: "victoria-ren-faire-2026",
    date: "2026-08-15T13:00:00",
    dateLabel: "Saturday, August 15, 2026",
    timeLabel: "1:00 PM",
    venue: "Victoria Renaissance Faire",
    location: "Victoria, BC",
    description:
      "Side Proj take the faire stage for an afternoon of jigs, ballads, and questionable historical accuracy.",
    infoUrl: "https://www.vicrfs.ca/",
    updatesUrl: "https://www.instagram.com/vicrenfaire/",
  },
];

/** Shows still to come, earliest first. */
export const upcomingShows = (now: Date = new Date()) =>
  shows
    .filter((s) => new Date(s.date).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

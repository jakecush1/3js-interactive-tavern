// SHOW DATA
// Upcoming performances listed in the Shows section of FooterOverlay.tsx.
// Shows are rendered earliest-first; past dates drop off automatically via
// `date`, so an old show doesn't linger on the site.

export type Show = {
  id: string;
  /** ISO date-time of OUR set, local to the venue. Sorting + past-date filtering. */
  date: string;
  /** Human-readable date shown on the placard. */
  dateLabel: string;
  /** When Side Proj plays. */
  timeLabel: string;
  /** The event we're playing at. */
  venue: string;
  /** Park / building name. */
  place: string;
  address: string;
  /** Hours of the wider event, if it runs longer than our set. */
  eventHours?: string;
  /** Admission note, e.g. "Free admission". */
  admission?: string;
  description: string;
  /** Official event site. */
  infoUrl?: string;
  /** Where the venue posts updates (socials, schedule changes). */
  updatesUrl?: string;
  /** Google Maps pin for the venue. */
  mapUrl?: string;
};

export const shows: Show[] = [
  {
    id: "victoria-ren-faire-2026",
    date: "2026-08-15T13:00:00",
    dateLabel: "Saturday, August 15, 2026",
    timeLabel: "1:00 PM",
    venue: "Victoria Renaissance Faire",
    place: "Banfield Park",
    address: "521 Craigflower Rd, Victoria, BC V9A 2V8",
    eventHours: "Faire runs 10:00 AM – 8:00 PM",
    admission: "Free admission",
    description:
      "Side Proj take the faire stage for an afternoon of jigs, ballads, and questionable historical accuracy. Expect market vendors, wandering performers, sword fighting, and a costume contest.",
    infoUrl: "https://www.vicrfs.ca/",
    updatesUrl: "https://www.instagram.com/vicrenfaire/",
    mapUrl:
      "https://www.google.com/maps/place/521+Craigflower+Rd,+Victoria,+BC+V9A+2V8/@48.4383516,-123.3873536,606m/data=!3m2!1e3!4b1!4m6!3m5!1s0x548f73657489a7a5:0x397c434bb3d0e462!8m2!3d48.4377337!4d-123.3876665!16s%2Fg%2F11b8txk1gz",
  },
];

/** Shows still to come, earliest first. */
export const upcomingShows = (now: Date = new Date()) =>
  shows
    .filter((s) => new Date(s.date).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

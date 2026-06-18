import type { RenderContext } from "@/lib/site/render-context";

/** Placeholder data so dynamic blocks preview with content in the editor. */
export const EDITOR_PREVIEW_CONTEXT: RenderContext = {
  classes: [
    { id: "p1", name: "Ballet — Beginners", discipline: "Ballet", level: "Beginner", stream: "Beginners", room: "Studio 1", dayOfWeek: 1, startTime: "16:00:00", endTime: "17:00:00", priceCents: 12000 },
    { id: "p2", name: "Contemporary", discipline: "Contemporary", level: "All levels", stream: "Juniors", room: "Studio 2", dayOfWeek: 2, startTime: "17:00:00", endTime: "18:00:00", priceCents: 14000 },
    { id: "p3", name: "Hip Hop Juniors", discipline: "Hip Hop", level: "Juniors", stream: "Juniors", room: "Studio 1", dayOfWeek: 3, startTime: "16:30:00", endTime: "17:30:00", priceCents: 11000 },
  ],
  scheduleClasses: [
    { id: "p1", name: "Ballet — Beginners", discipline: "Ballet", level: "Beginner", stream: "Beginners", room: "Studio 1", dayOfWeek: 1, startTime: "16:00:00", endTime: "17:00:00", priceCents: 12000 },
    { id: "p2", name: "Contemporary", discipline: "Contemporary", level: "All levels", stream: "Juniors", room: "Studio 2", dayOfWeek: 1, startTime: "17:00:00", endTime: "18:00:00", priceCents: 14000 },
  ],
  events: [
    { id: "e1", name: "Welcome!", description: "Tech is back in the mix!", eventDate: new Date().toISOString(), category: "news", imageUrl: null, venueName: null },
    { id: "e2", name: "Term 3 dates announced", description: "Classes resume Monday 14 July.", eventDate: new Date().toISOString(), category: "term_dates", imageUrl: null, venueName: null },
  ],
  products: [
    { id: "pr1", name: "Studio T-shirt", description: "Cotton tee with logo", priceCents: 3500, imageUrl: null, category: "Merchandise", stockQty: 10 },
    { id: "pr2", name: "Ballet leotard", description: "Required uniform", priceCents: 4500, imageUrl: null, category: "Uniform", stockQty: 5 },
  ],
  staff: [
    { id: "s1", name: "Jane Instructor", role: "Ballet Director", bio: "RAD certified with 20 years experience.", photoUrl: null },
    { id: "s2", name: "Alex Teacher", role: "Contemporary", bio: "Former company dancer.", photoUrl: null },
  ],
};

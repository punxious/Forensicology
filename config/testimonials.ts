/**
 * Testimonials. The entries marked `placeholder` are layout samples only:
 * they show in development and are never rendered in production, because
 * presenting made-up reviews as real would mislead customers (Australian
 * Consumer Law). Replace them with real, permitted quotes and set
 * `placeholder: false`.
 */
export type Testimonial = { quote: string; name: string; role: string; placeholder: boolean };

export const TESTIMONIALS: Testimonial[] = [
  { quote: "Sample quote about the fingerprint puzzle goes here.", name: "Sample name", role: "Team lead (placeholder)", placeholder: true },
  { quote: "Sample quote about using a case in a classroom goes here.", name: "Sample name", role: "Teacher (placeholder)", placeholder: true },
  { quote: "Sample quote about the twist goes here.", name: "Sample name", role: "Player (placeholder)", placeholder: true },
];

export function visibleTestimonials(): Testimonial[] {
  return TESTIMONIALS.filter((t) => !t.placeholder || process.env.NODE_ENV !== "production");
}

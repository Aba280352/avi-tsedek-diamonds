# Daniel Avi Tsedek – AVI TSEDEK Diamonds

Hebrew / RTL catalog website for a fine-jewelry brand (no cart: ordering and consultation go through WhatsApp).

Static site: plain HTML, CSS and a single vanilla JS file. The only external script is [Lenis](https://github.com/darkroomengineering/lenis) (smooth scroll, loaded from jsDelivr).

## Run locally

```bash
npx serve .
```

Then open `http://localhost:3000`. Any static server works.

## What is on the home page

- Header with a mega menu, mobile drawer and a gift icon that opens a three-step questionnaire ending in a WhatsApp message
- Full-height looping hero video
- Product shelf with category tabs and an endless slow drift
- Scroll-swap campaign section (desktop and mobile images)
- "Best Sellers" and "New in stock" cards on a 3D ring
- Expanding model panels (hover on desktop, tap on mobile)
- Feature photo + linear marquee, in two mirrored variants
- Scroll-sequence section: the ring turns in 3D while four hotspots reveal short texts
- Footer with a contact form that opens WhatsApp
- Background music with a small on/off button

## Files

| Path | What |
| --- | --- |
| `index.html` | the home page |
| `header.css` | all styles (design tokens at the top of `.dat`) |
| `header.js` | all behaviour |
| `assets/` | images, hero video, 97-frame ring sequence, music |
| `fonts/` | Polin (Light, Regular, Medium, Semibold) |

## Notes

- Design language: black, white and a warm off-white surface; Polin font; sharp corners (rounded corners are used only in the footer); one outline icon style.
- Spacing: 9vw between sections on desktop and 80px on mobile; 15–20px between elements inside a component.
- Some images (models, ring, footer ring) and the music track were generated with AI tools.
- The Polin font files and the brand imagery belong to their owners; do not reuse them without permission.

# Valentine Quiz Spec

## Goal
Create a single-page Valentine landing experience with a full-bleed hero and a sweet, interactive quiz. The page should feel bold and editorial (Swiss poster influence) while staying romantic, gentle, and modern.

## Visual Direction
- Palette:
  - Base: #FAD0D6 (baby pink)
  - Accent: #850441 (blood red / plum)
  - Text: #0B0B0B (black)
- Layout: Single full-bleed hero, then full-screen question pages, then a summary page.
- Texture: Subtle film grain overlay.
- Background: Animated gradients and abstract shapes; no photos.

## Typography
- Headings: Helvetica only. Fallback: "Helvetica Neue", Helvetica, Arial, sans-serif.
- Body: Poppins.
- Accent font: One serif for special words (currently Playfair Display).

## Motion
- Ambient gradient drift across the page.
- Kinetic typography (letter-by-letter rise) in the hero headline.
- Rotating nickname in the hero.
- Full-screen page transitions between questions with a short loading state.
- Dramatic blur + slide transitions.
- Micro-animations per question (headline reveal, input focus glow).
- Interactive background that reacts to mouse/touch movement.
- Respect prefers-reduced-motion.

## Content Plan
- Hero message: Welcomes partner by cycling through multiple nicknames.
- CTA: Start the quiz.
- Quiz: 15 open-ended questions based on provided prompts.
- Success page: AI-generated gentle, sweet, appreciative summary plus a spirit-animal emoji.

## Quiz Design
Questions (text responses):
1. You know when you instantly feel relaxed around someone... what kind of vibe gives you that feeling?
2. What's something people often get wrong about you at first?
3. What's a random memory that still makes you smile for no reason?
4. What's your tiny 'reset' ritual when you've had a bad day?
5. If we disappeared for a day - no phones, no responsibilities - what would our day look like?
6. What kind of compliments actually hit you emotionally, not just sound nice?
7. When do you feel most confident and 'glowing', not just physically but as a person?
8. What makes you feel safe enough to really trust someone?
9. What's something you wish people were more curious to ask you about?
10. What's one experience you'd love for us to create together someday?
11. Is there a fear you don't usually say out loud but it's quietly there?
12. When do you feel closest to me?
13. What's one thing you'd always want your partner to truly understand about you?
14. Be honest - is there something I do that you appreciate but haven't told me yet?
15. Fast forward 10 years - what does a lazy Sunday together look like for us?

## Summary Logic
- AI summary via OpenAI Chat Completions API.
- Returns JSON with summary, spirit_emoji, spirit_line.
- Fallback local summary if API fails.
- Tone: gentle, sweet, appreciative, happy.

## UX & Responsiveness
- Desktop and mobile friendly.
- Each question is a full-screen page with Next/Back.
- Short transition/loading animation between questions.
- Retake option at the end.

## Files
- /Users/aditya.uphade/Build/valentine-poster-react/src/App.js: main UI and quiz logic.
- /Users/aditya.uphade/Build/valentine-poster-react/src/App.css: styling, typography, animations.
- /Users/aditya.uphade/Build/valentine-poster-react/src/index.css: global styles and font imports.
- /Users/aditya.uphade/Build/valentine-poster-react/server/index.js: OpenAI proxy for AI summary.
- /Users/aditya.uphade/Build/valentine-poster-react/public/index.html: metadata + title.

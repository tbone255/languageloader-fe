# Manual Testing Checklist

Run `npm run dev` and test these flows manually to verify the MVP.

## ✅ Setup

- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:5173/languageloader-fe/
- [ ] Clear localStorage (F12 → Application → Local Storage → Clear All)

---

## 🏠 Learn Home Page

### Initial State
- [ ] Root `/` redirects to `/learn`
- [ ] See navigation bar with Learn, Review, Settings links
- [ ] See 3 lessons listed:
  - Lesson 1: "Deixis and Singular Nouns" - **Unlocked** (Start Lesson button)
  - Lesson 2: "Pluralization and These/Those" - **Locked** (Locked badge)
  - Lesson 3: "Possession and 'To Be'" - **Locked** (Locked badge)
- [ ] **No** "cards due for review" alert shown (no cards yet)

---

## 📖 Lesson 1 Flow

### Intro Screen
- [ ] Click "Start Lesson" on Lesson 1
- [ ] See lesson intro with:
  - Badge: "Lesson 1"
  - Title: "Deixis and Singular Nouns"
  - Description
  - Learning objectives (3 bullet points)
  - Stats: "6" exercises, "12" new cards
- [ ] Click "Start Lesson" button

### Exercise 1: Sentence → Image Match
- [ ] See "Exercise 1 of 6" progress bar
- [ ] See Pashto sentence (RTL text) with English translation
- [ ] See 3 emoji placeholder images (📖, 🖊️, 🪑)
- [ ] Click an image
- [ ] See feedback (green/red alert)
- [ ] Auto-advance after ~1.5 seconds

### Exercise 2: Word Bank Build
- [ ] See "Exercise 2 of 6"
- [ ] See English translation
- [ ] See construction zone (empty "Your sentence" area)
- [ ] See word bank with Pashto words (RTL)
- [ ] Click words in order - they move to construction zone
- [ ] Click a placed word - it returns to word bank
- [ ] Click "Check Answer"
- [ ] See feedback with correct answer if wrong
- [ ] Auto-advance after ~2 seconds

### Exercise 3: Gap Fill
- [ ] See "Exercise 3 of 6"
- [ ] See Pashto sentence with blank (___) in the middle
- [ ] See 3 word choices below
- [ ] Click a choice
- [ ] Blank fills with selected word (green/red highlight)
- [ ] See feedback alert
- [ ] Auto-advance after ~1.5 seconds

### Exercises 4-6
- [ ] Continue through remaining exercises (3 more)
- [ ] Progress bar updates: "4 of 6", "5 of 6", "6 of 6"

### Completion Screen
- [ ] See 🎉 emoji
- [ ] See "Lesson Complete!" message
- [ ] See stats:
  - Exercises Completed: 6
  - Cards Added to Review: 12
- [ ] See two buttons: "Back to Lessons" and "Review Cards"

---

## 🔓 Lesson Unlocking

- [ ] Click "Back to Lessons"
- [ ] See Lesson 1 now has "Completed" badge
- [ ] See Lesson 1 button changed to "Review Lesson"
- [ ] See Lesson 2 now **unlocked** with "Start Lesson" button
- [ ] See Lesson 3 still **locked**
- [ ] See alert: "You have 12 cards due for review" with Review button

---

## 🔄 SRS Review Flow

### Review Page
- [ ] Click Review button in alert (or navigate via navbar)
- [ ] See "Card 1 of 12" progress bar
- [ ] See either:
  - **Flip card**: Pashto word front, "Show Answer" button
  - **Cloze card**: Pashto sentence with blank, "Show Answer" button

### Flip Card Review
- [ ] See Pashto word (large, RTL)
- [ ] Click "Show Answer"
- [ ] See:
  - English meaning
  - Transliteration (romanization)
  - IPA pronunciation /.../
- [ ] See rating buttons: Again, Hard, Good, Easy
- [ ] Click "Good"
- [ ] Advance to next card

### Cloze Card Review
- [ ] See Pashto sentence with "___" blank
- [ ] Click "Show Answer"
- [ ] Blank fills with correct word in [brackets]
- [ ] See English translation below
- [ ] See rating buttons
- [ ] Click a rating
- [ ] Advance to next card

### Review Completion
- [ ] Continue rating cards
- [ ] Stats update: "Remaining" decreases, "Reviewed" increases
- [ ] After 12th card:
  - See ✅ emoji
  - "All Done!" message
  - "You have no cards due for review right now"

---

## ⚙️ Settings & Reset

### Settings Page
- [ ] Navigate to Settings via navbar
- [ ] See "Data Management" section
- [ ] See "Reset All Progress" button

### Reset Flow
- [ ] Click "Reset" button
- [ ] See modal: "Reset All Progress?"
- [ ] See warning list:
  - All lesson completion progress
  - All SRS cards and their review history
  - All exercise completions
- [ ] See red warning: "This action cannot be undone"
- [ ] Click "Cancel" - modal closes
- [ ] Click "Reset" again
- [ ] Click "Reset Everything"
- [ ] Page redirects to /learn and reloads
- [ ] Lesson 1 back to "Start Lesson" (not completed)
- [ ] Lessons 2 & 3 locked again
- [ ] No SRS review alert shown

---

## 🎨 UI/UX Checks

### Responsive Design
- [ ] Resize browser window
- [ ] Navbar collapses to hamburger menu on mobile
- [ ] Cards stack vertically on small screens
- [ ] All content remains readable

### RTL Support
- [ ] All Pashto text renders right-to-left
- [ ] Text direction is correct in all contexts:
  - Lesson intro
  - Exercises
  - SRS cards
  - Word bank

### DaisyUI Components
- [ ] Cards have shadows and rounded corners
- [ ] Buttons have hover effects
- [ ] Progress bars animate smoothly
- [ ] Badges are colorful (primary, success, error)
- [ ] Alerts have icons and colors
- [ ] Modal has backdrop and centering

### Loading States
- [ ] Lesson page shows spinner while loading
- [ ] Review page shows spinner while loading
- [ ] No console errors (F12 → Console)

---

## 🐛 Bug Checks

### Critical Bugs to Watch For
- [ ] SRS cards should **only** appear after completing a lesson
- [ ] Lesson 2 should **not** unlock until Lesson 1 is completed
- [ ] Progress persists after page refresh (F5)
- [ ] Reset clears all progress correctly
- [ ] No JavaScript errors in console
- [ ] Navigation works from all pages
- [ ] Auto-advance timing feels natural (not too fast/slow)

---

## ✨ Success Criteria

All checkboxes above should be ✅ for MVP approval.

If you find bugs, note:
1. Which page/component
2. Steps to reproduce
3. Expected vs actual behavior
4. Any console errors

# Review Carousel APG Contract

## Original problem

The review carousel had no durable focus-pause latch. Leaving the review region could permit automatic rotation to resume, while the track was always announced with `aria-live="polite"`, including during automatic changes.

## Final state machine

- Automatic rotation remains enabled only when no explicit pause, focus latch, document-visibility pause, reduced-motion preference, or pointer/manual gate blocks it.
- Focus entering the review region sets a persistent focus-pause latch and cancels the interval and pending manual-resume timer.
- Focus leaving the region does not clear that latch and never resumes rotation.
- Only the explicit continue control clears explicit pause and the focus latch.
- Manual previous/next retains the approved delayed-resume behavior when neither explicit pause nor focus latch is active.
- Visibility, media-query, pointer, focus, interval, and timeout listeners/resources are cleaned up on unmount.

## Timing and live-region proof

- `REVIEW_AUTO_INTERVAL_MS=5000` remains defined in `src/lib/redesign/home/home-reviews.ts`.
- `REVIEW_MANUAL_RESUME_MS=6000` remains defined in the same file.
- Browser timeline: automatic advance observed after 5100 ms.
- Browser timeline: focusout followed by 6100 ms did not resume.
- Rotating state uses `aria-live="off"`.
- Paused/manual/focus-latched state uses `aria-live="polite"`.
- Explicit continue restored rotation and `aria-live="off"`.
- Reduced motion kept the automatic timer disabled while manual controls remained available.

`REVIEW_APG_RED_STATUS=EXPECTED_FAIL`

`REVIEW_APG_GREEN_STATUS=PASS`

`FOCUS_ENTER_PAUSES=YES`

`FOCUSOUT_AUTO_RESUMES=NO`

`EXPLICIT_RESUME_REQUIRED=YES`

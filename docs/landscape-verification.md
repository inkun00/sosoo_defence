# Phone and tablet landscape verification

Browser viewport simulation on 2026-10-09. This verifies layout and real pointer/DOM input; physical-device GPU, sound hardware and network performance are outside this check.

## Layout changes

- The game follows the available viewport and safe-area insets. Short landscape screens reflow controls while uniformly scaling the battlefield and artwork.
- The Phaser FIT parent bounds are refreshed before calculating the canvas size. Rotation between two screens with the same logical game height no longer retains the previous canvas size.
- Tower-shop pagination, crafting controls and purchase panels follow the available height. Smaller screens use larger touch targets and fewer entries per page.
- Duel questions stay in the lower crafting area; the battlefield remains visible. Input survives rotation, including changes between compact and standard panels.
- Title menus, settings, account dialogs, hero collection, map and computer selection use the available height with internal scrolling where necessary.
- Worksheet previews reflow to one column on narrow phones and expand to 1100px on tablets. PDF export independently preserves the original A4, two-column layout.

## Viewports

| Viewport | Duel canvas | Minimum main duel target |
| --- | --- | --- |
| 568 × 320 | 568 × 319.94 | 44.38px |
| 667 × 375 | 666.66 × 375 | 44.27px |
| 844 × 390 | 832 × 390 | 44.20px |
| 915 × 412 | 878.92 × 412 | 46.69px |
| 1024 × 768 | 1024 × 640 | 44.00px |
| 1180 × 820 | 1180 × 737.5 | 50.70px |
| 1366 × 1024 | 1366 × 853.75 | 58.70px |

All seven title menus fit inside the viewport. All worksheet previews retain twenty questions without horizontal overflow. Duel purchase panels stay inside all seven viewports, preserve the typed answer on rotation, and have at least 44px buttons.

Adventure purchase controls also pass those seven viewports and the toolbar-reduced 844 × 330 viewport: all controls remain inside the canvas, typed input survives every resize, and purchase targets remain at least 44px. The 568 × 320 six-column keypad, taller header and wall-forging buttons were verified through native pointer input.

At 844 × 390 the adventure canvas expands from 624px to 832px wide, using 98.6% of viewport width instead of 73.9%. Different artwork dimensions remain uniformly scaled.

## Functional checks

- Adventure: enter the subtraction answer, rotate with the question open, submit and verify the correct coin balance and placed tower.
- Adventure: select three addition bricks, forge a wall, place it on the road and verify stock consumption.
- Duel: solve a preparation question using the keypad and verify one stored tower; a wrong answer keeps the budget unchanged.
- Duel: wait for the real sixty-second preparation phase to finish, place the stored tower using native canvas input and verify it is consumed without a new question.
- Duel: select addition blocks and verify the hero egg advances one level.
- Hero collection: select a different hero in the compact, internally scrolling dialog.
- Worksheet: save from a 568 × 320 preview and verify the A4 export is 1588 × 2246 pixels rather than the narrow on-screen column.

Evidence and measurement JSON are in the ignored `test-results/landscape/` directory. The QA fixtures use the actual adventure controller, duel scene, computer peer and PDF exporter; fixture state is confined to the local test origin.

Final validation: `npm test` passes all 397 tests; TypeScript and the production Vite build pass. Miniature hundred-square shading questions are excluded from new worksheet generation. Persisted questions render a text-only equivalent with the same answer, cipher and reward behavior; 1,408 generated worksheets and legacy values 1–99 are covered by validation tests.

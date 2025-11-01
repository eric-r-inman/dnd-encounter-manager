# Testing Plan - Modal Events Modularization

## Overview
This document outlines the testing plan for the modularized modal-events system, covering three new modules:
- `form-handlers.js`
- `creature-modal-events.js`
- `recent-items.js`

## Test Environment Setup

### Prerequisites
1. ✅ Dev server running (`npm run dev`)
2. ✅ Browser console open (for error monitoring)
3. ✅ LocalStorage inspector available
4. ✅ Network tab open (for API calls)

---

## Module 1: Recent Items (`recent-items.js`)

### Test 1.1: Recent Effects Storage
**Objective:** Verify effects are stored and retrieved from localStorage

**Steps:**
1. Open Effect modal on any combatant
2. Enter a custom effect name (e.g., "Bless")
3. Submit the form
4. Open Effect modal again
5. Start typing "Ble" in the effect input field

**Expected Results:**
- ✅ "Bless" appears in the autocomplete suggestions
- ✅ LocalStorage key `recentEffects` contains the effect
- ✅ Recent effects list is limited to 12 items max

**How to Verify:**
```javascript
// In browser console:
JSON.parse(localStorage.getItem('recentEffects'))
// Should return array including "Bless"
```

---

### Test 1.2: Recent Notes Storage (General)
**Objective:** Verify general notes are stored and retrieved

**Steps:**
1. Open Note modal on any combatant (general note type)
2. Enter note text (e.g., "Poisoned by trap")
3. Submit the form
4. Open Note modal again on same/different combatant

**Expected Results:**
- ✅ "Poisoned by trap" appears in autocomplete
- ✅ LocalStorage key `recentGeneralNotes` contains the note
- ✅ Recent notes list is limited to 12 items max

**How to Verify:**
```javascript
JSON.parse(localStorage.getItem('recentGeneralNotes'))
```

---

### Test 1.3: Recent Notes Storage (Name Notes)
**Objective:** Verify name notes are stored separately

**Steps:**
1. Click on combatant name to edit name note
2. Enter name note (e.g., "Minion 1")
3. Submit
4. Click on another combatant name to edit

**Expected Results:**
- ✅ "Minion 1" appears in autocomplete
- ✅ LocalStorage key `recentNameNotes` contains the note
- ✅ Name notes are separate from general notes

**How to Verify:**
```javascript
JSON.parse(localStorage.getItem('recentNameNotes'))
```

---

## Module 2: Form Handlers (`form-handlers.js`)

### Test 2.1: Condition Form Handler
**Objective:** Verify condition application works correctly

**Steps:**
1. Add a combatant to encounter
2. Click "Add Condition" button
3. Select condition: "Poisoned"
4. Set duration: "3 turns"
5. Add note: "From snake bite"
6. Submit form

**Expected Results:**
- ✅ Modal closes
- ✅ Condition badge appears on combatant card
- ✅ Condition shows "Poisoned (3)"
- ✅ Hovering shows note "From snake bite"
- ✅ Toast notification: "Applied Poisoned to [Name]"
- ✅ If combatant is active, combat header updates

**How to Verify:**
```javascript
// In console:
const combatant = DataServices.combatantManager.getAllCombatants()[0];
console.log(combatant.conditions);
// Should show condition object
```

---

### Test 2.2: Effect Form Handler
**Objective:** Verify effect application works correctly

**Steps:**
1. Click "Add Effect" on a combatant
2. Enter custom effect: "Haste"
3. Set duration: "5 turns"
4. Add note: "Cast by wizard"
5. Submit form

**Expected Results:**
- ✅ Modal closes
- ✅ Effect badge appears on combatant card
- ✅ Effect shows "Haste (5)"
- ✅ Hovering shows note
- ✅ Toast notification: "Applied Haste to [Name]"
- ✅ Effect added to recent effects list

**Additional Test:**
- Apply same effect again with different duration
- ✅ Should update existing effect, not create duplicate

---

### Test 2.3: Note Form Handler (General Notes)
**Objective:** Verify general note saving works

**Steps:**
1. Click "Add Note" button on a combatant
2. Enter note: "This is a test note"
3. Submit form

**Expected Results:**
- ✅ Modal closes
- ✅ Note icon appears on combatant card (if not already present)
- ✅ Clicking note icon shows "This is a test note"
- ✅ Toast notification: "Note updated for [Name]"
- ✅ Note added to recent notes

---

### Test 2.4: Note Form Handler (Name Notes)
**Objective:** Verify name note saving works

**Steps:**
1. Click on combatant name (not the note button)
2. Enter name note: "Alpha"
3. Submit

**Expected Results:**
- ✅ Modal closes
- ✅ Name tag appears next to combatant name showing "Alpha"
- ✅ Toast notification: "Name note updated for [Name]"
- ✅ Name note persists after page reload

---

### Test 2.5: Add Combatant Form Handler
**Objective:** Verify combatant creation from form

**Steps:**
1. Click "Add Combatant" button
2. Select creature: "Goblin"
3. Enter initiative: "15"
4. Enter custom HP: "10"
5. Enter name note: "Scout"
6. Check "Surprised"
7. Submit form

**Expected Results:**
- ✅ Modal closes
- ✅ Goblin appears in initiative order at position 15
- ✅ Current HP shows "10" (custom value)
- ✅ Name tag shows "Scout"
- ✅ Surprised status indicator visible
- ✅ Toast notification: "Added Goblin to encounter"

**Validation Tests:**
- Try submitting without creature selected: ✅ Should show error
- Try submitting without initiative: ✅ Should show error

---

### Test 2.6: Creature Form Handler (Create New)
**Objective:** Verify creature creation works

**Steps:**
1. Open Compendium (Quick View button)
2. Click "Add Creature" button
3. Fill in basic fields:
   - Name: "Test Monster"
   - Type: "enemy"
   - AC: "15"
   - HP: "50"
   - CR: "2"
4. Fill in ability scores (optional):
   - STR: "16", DEX: "14", CON: "12", INT: "8", WIS: "10", CHA: "10"
5. Add a trait:
   - Name: "Pack Tactics"
   - Description: "Advantage when ally is nearby"
6. Submit form

**Expected Results:**
- ✅ Creature form closes
- ✅ Compendium modal reopens
- ✅ "Test Monster" appears in creature list
- ✅ Creature is auto-selected and shows in details pane
- ✅ Toast notification: "Created: Test Monster"
- ✅ Creature saved to localStorage `dnd-custom-creatures`
- ✅ Creature marked as custom (`isCustom: true`)

**How to Verify:**
```javascript
const customs = JSON.parse(localStorage.getItem('dnd-custom-creatures'));
console.log(customs.find(c => c.name === 'Test Monster'));
```

---

### Test 2.7: Creature Form Handler (Edit Existing)
**Objective:** Verify creature editing works

**Steps:**
1. In Compendium, select "Test Monster" (from previous test)
2. Click "Edit" button
3. Change AC from "15" to "17"
4. Add another trait
5. Submit form

**Expected Results:**
- ✅ Form closes
- ✅ Compendium reopens with creature selected
- ✅ AC now shows "17" in stat block
- ✅ New trait appears
- ✅ Toast notification: "Updated: Test Monster"
- ✅ Changes persist in localStorage

---

## Module 3: Creature Modal Events (`creature-modal-events.js`)

### Test 3.1: Creature Database Modal Setup
**Objective:** Verify compendium modal populates correctly

**Steps:**
1. Click "Quick View" button in Compendium section
2. Wait for modal to load

**Expected Results:**
- ✅ Modal shows with creature list on left
- ✅ Creature count displays correctly (total and visible)
- ✅ Custom creatures appear at top of list
- ✅ Creatures show: name, type badge, AC, HP, CR
- ✅ Clicking a creature highlights it and shows details on right

**Performance Test:**
- ✅ Should load quickly even with 50+ creatures

---

### Test 3.2: Creature Details Display (Modal)
**Objective:** Verify stat block renders correctly in modal

**Steps:**
1. Open Compendium modal
2. Select a creature with full stat block (e.g., "Adult Red Dragon")

**Expected Results:**
- ✅ Action buttons appear at top (Add to Encounter, Edit, Duplicate, Delete)
- ✅ Creature name and type badge display
- ✅ Full type description shows (size, race, alignment)
- ✅ AC displays with armor type
- ✅ HP displays with formula
- ✅ Speed shows all movement types
- ✅ Ability scores table renders correctly
- ✅ Saving throws display (if any)
- ✅ Skills display (if any)
- ✅ Damage resistances/immunities show (if any)
- ✅ Senses display correctly
- ✅ Languages list shows
- ✅ CR displays with XP
- ✅ Traits section renders
- ✅ Actions section renders
- ✅ Legendary Actions render (if any)
- ✅ Source attribution shows at bottom

---

### Test 3.3: Creature Details Display (Right Pane)
**Objective:** Verify stat block renders in compendium section

**Steps:**
1. Click on a creature name in the combatant list (not in modal)
2. Check the Compendium section in right sidebar

**Expected Results:**
- ✅ Stat block displays same as modal (minus action buttons)
- ✅ Scrollable if content is tall
- ✅ All stat block sections render correctly
- ✅ Quick View button works to open full modal

**Data Attribute Test:**
```javascript
// In console:
const statBlock = document.getElementById('stat-block-display');
console.log(statBlock.getAttribute('data-current-creature-id'));
// Should show creature ID
```

---

### Test 3.4: Quick View Integration
**Objective:** Verify Quick View button selects creature in modal

**Steps:**
1. Click on a creature name in combatant list
2. Wait for stat block to appear in right pane
3. Click "Quick View" button in Compendium section

**Expected Results:**
- ✅ Compendium modal opens
- ✅ Creature is auto-selected in list (highlighted)
- ✅ Creature details show on right side of modal
- ✅ Creature is scrolled into view in list

---

### Test 3.5: Creature Form Setup (Add Mode)
**Objective:** Verify form initializes correctly for new creature

**Steps:**
1. Open Compendium modal
2. Click "Add Creature" button

**Expected Results:**
- ✅ Modal title shows "Add New Creature"
- ✅ Submit button shows "Add Creature"
- ✅ All form fields are empty
- ✅ Type defaults to "enemy"
- ✅ Size defaults to "Medium"
- ✅ No dynamic rows (skills, traits, actions, legendary actions)
- ✅ Hidden ID field is empty

---

### Test 3.6: Creature Form Setup (Edit Mode)
**Objective:** Verify form populates correctly for editing

**Steps:**
1. Open Compendium modal
2. Select "Test Monster" (from previous tests)
3. Click "Edit" button

**Expected Results:**
- ✅ Modal title shows "Edit Creature"
- ✅ Submit button shows "Update Creature"
- ✅ All basic fields populated with creature data
- ✅ Ability scores populated (if creature has them)
- ✅ Skills rows populated (if creature has them)
- ✅ Traits rows populated (if creature has them)
- ✅ Actions rows populated (if creature has them)
- ✅ Legendary actions populated (if creature has them)
- ✅ Hidden ID field contains creature.id

**Specific Field Tests:**
- AC Type field populated
- HP Formula populated
- Senses populated
- Languages populated
- Damage types populated

---

### Test 3.7: Dynamic Form Row Management (Skills)
**Objective:** Verify skill rows can be added/removed

**Steps:**
1. Open creature form (add or edit mode)
2. Click "Add Skill" button
3. Fill in: Name: "Stealth", Bonus: "+6"
4. Click "Add Skill" again
5. Add: Name: "Perception", Bonus: "+4"
6. Click "Remove" on first skill

**Expected Results:**
- ✅ First click adds empty skill row
- ✅ Second click adds another row
- ✅ Remove button deletes the correct row
- ✅ Remaining rows stay intact
- ✅ Form submission includes all skills

---

### Test 3.8: Dynamic Form Row Management (Traits)
**Objective:** Verify trait rows can be added/removed

**Steps:**
1. In creature form, click "Add Trait"
2. Fill in name and description
3. Add multiple traits
4. Remove one trait

**Expected Results:**
- ✅ Trait rows added correctly
- ✅ Each row has name input and description textarea
- ✅ Remove button works
- ✅ Form preserves all traits on submit

---

### Test 3.9: Dynamic Form Row Management (Actions)
**Objective:** Verify action rows work

**Steps:**
1. Add action with name and description
2. Add multiple actions
3. Remove one

**Expected Results:**
- ✅ Same behavior as traits
- ✅ All fields save correctly

---

### Test 3.10: Dynamic Form Row Management (Legendary Actions)
**Objective:** Verify legendary action rows work

**Steps:**
1. Add legendary action with name, cost, and description
2. Test cost field accepts numbers
3. Remove action

**Expected Results:**
- ✅ Cost field works
- ✅ Default cost is "1"
- ✅ All fields save correctly

---

### Test 3.11: Helper Functions
**Objective:** Verify utility functions work correctly

**Tests:**
```javascript
// In console, test formatModifier:
// (You'll need to access the module somehow)

// Test cases:
formatModifier(5)    // Should return "+5"
formatModifier(0)    // Should return "+0"
formatModifier(-3)   // Should return "-3"

// Test getOrdinalSuffix:
getOrdinalSuffix(1)   // Should return "1st"
getOrdinalSuffix(2)   // Should return "2nd"
getOrdinalSuffix(3)   // Should return "3rd"
getOrdinalSuffix(4)   // Should return "4th"
getOrdinalSuffix(21)  // Should return "21st"
getOrdinalSuffix(22)  // Should return "22nd"
```

---

## Integration Tests

### Integration 1: Full Combatant Lifecycle
**Objective:** Test complete workflow from creation to deletion

**Steps:**
1. Add custom creature via form
2. Add that creature to encounter
3. Apply condition to combatant
4. Apply effect to combatant
5. Add note to combatant
6. Edit combatant name note
7. Remove combatant

**Expected Results:**
- ✅ All operations complete without errors
- ✅ All UI updates occur
- ✅ All data persists correctly
- ✅ No console errors

---

### Integration 2: Form Routing
**Objective:** Verify all form types route correctly

**Test Matrix:**
| Form Type | Modal | Handler Called | Result |
|-----------|-------|----------------|---------|
| `condition-application` | Condition | `handleConditionForm` | ✅ Condition applied |
| `effect-application` | Effect | `handleEffectForm` | ✅ Effect applied |
| `combatant-note` | Note | `handleNoteForm` | ✅ Note saved |
| `add-combatant` | Add Combatant | `handleAddCombatantForm` | ✅ Combatant created |
| `creature` | Creature Form | `handleCreatureForm` | ✅ Creature saved |

**How to Test:**
1. Open each modal type
2. Fill and submit form
3. Verify correct handler executes
4. Check console for routing log: `📝 Form submission: [type]`

---

### Integration 3: LocalStorage Persistence
**Objective:** Verify all data persists across page reloads

**Steps:**
1. Create a custom creature
2. Add combatants with conditions, effects, notes
3. Add effects and notes to populate recent items
4. Reload page (F5)

**Expected Results:**
- ✅ Custom creatures still in compendium
- ✅ Combatants still in initiative list
- ✅ Conditions still on combatants
- ✅ Effects still on combatants
- ✅ Notes still on combatants
- ✅ Recent effects list retained
- ✅ Recent notes list retained

**Storage Keys to Check:**
```javascript
localStorage.getItem('dnd-custom-creatures')
localStorage.getItem('dnd-combatant-instances')
localStorage.getItem('recentEffects')
localStorage.getItem('recentGeneralNotes')
localStorage.getItem('recentNameNotes')
```

---

### Integration 4: Modal System Integration
**Objective:** Verify modals open/close correctly

**Test All Modal Types:**
1. ✅ Condition modal opens via button
2. ✅ Effect modal opens via button
3. ✅ Note modal opens via button (general)
4. ✅ Note modal opens via name click (name note)
5. ✅ Add Combatant modal opens
6. ✅ Creature Database modal opens
7. ✅ Creature Form modal opens (from Database modal)

**Test Modal Behaviors:**
- ✅ Clicking backdrop closes modal
- ✅ ESC key closes modal
- ✅ Form submission closes modal
- ✅ Cancel button closes modal
- ✅ Only one modal open at a time (or proper stacking)

---

## Error Handling Tests

### Error 1: Missing Required Fields
**Test Each Form:**
1. Condition form without condition selected
2. Effect form without effect name
3. Add Combatant without creature selected
4. Add Combatant without initiative
5. Creature form without name/type/AC/HP

**Expected Results:**
- ✅ Toast error message appears
- ✅ Form does not submit
- ✅ Modal stays open
- ✅ User can correct and resubmit

---

### Error 2: Duplicate Creature Names
**Steps:**
1. Create creature named "Duplicate Test"
2. Try to create another creature with same name

**Expected Results:**
- ✅ Toast error: "A creature named 'Duplicate Test' already exists"
- ✅ Form stays open
- ✅ Creature not created

---

### Error 3: Missing Combatant Target
**Steps:**
1. Manually trigger form submission without target
   (This would require developer tools manipulation)

**Expected Results:**
- ✅ Toast error: "No target selected"
- ✅ Form doesn't submit

---

## Performance Tests

### Performance 1: Large Creature Database
**Objective:** Test with 50+ creatures

**Steps:**
1. Ensure database has 50+ creatures
2. Open Compendium modal
3. Measure load time

**Expected Results:**
- ✅ Modal opens in < 500ms
- ✅ Creature list scrolls smoothly
- ✅ Selecting creatures is responsive

---

### Performance 2: Multiple Combatants
**Objective:** Test with 10+ combatants

**Steps:**
1. Add 10+ combatants to encounter
2. Apply conditions/effects to multiple
3. Test modal operations

**Expected Results:**
- ✅ Forms still open quickly
- ✅ Updates render smoothly
- ✅ No lag when interacting

---

## Browser Compatibility

### Test in Multiple Browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Check Each:**
- ✅ All modals work
- ✅ Forms submit correctly
- ✅ LocalStorage works
- ✅ No console errors
- ✅ UI renders correctly

---

## Regression Tests

### Regression 1: Existing Features Still Work
**Verify these weren't broken:**
- [ ] Combat tracker (next turn, previous turn)
- [ ] Initiative ordering
- [ ] HP adjustment
- [ ] Combatant removal
- [ ] Batch operations
- [ ] Status toggles (concentration, surprised, etc.)
- [ ] Clear encounter
- [ ] Save/Load encounter

---

## Console Error Monitoring

**Throughout ALL tests, monitor console for:**
- ❌ No JavaScript errors
- ❌ No module import errors
- ❌ No undefined function errors
- ❌ No type errors
- ⚠️ Warnings are acceptable if documented

---

## Test Checklist Summary

### Critical Path (Must Pass)
- [ ] Recent items storage/retrieval works
- [ ] All form handlers process correctly
- [ ] Creature database modal loads
- [ ] Creature form creates/edits creatures
- [ ] Stat blocks render in modal and right pane
- [ ] No console errors during normal operation
- [ ] Data persists across page reloads

### Secondary Features
- [ ] Dynamic form rows (skills, traits, actions)
- [ ] Quick View integration
- [ ] Error validation works
- [ ] Toast notifications appear
- [ ] LocalStorage cleanup (12 item limits)

### Nice to Have
- [ ] Performance acceptable with large datasets
- [ ] Cross-browser compatibility
- [ ] All UI elements styled correctly
- [ ] Smooth animations/transitions

---

## Bug Reporting Template

```markdown
## Bug Report

**Test:** [Test Name/Number]
**Module:** [Module affected]
**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Console Errors:**
```
[Paste any errors here]
```

**Screenshots:**
[If applicable]

**Environment:**
- Browser: [Chrome/Firefox/etc]
- Version: [Version number]
```

---

## Post-Testing Actions

After completing all tests:

1. **Document Results:**
   - Create test results summary
   - Log any bugs found
   - Note any performance issues

2. **Fix Critical Issues:**
   - Address any breaking bugs immediately
   - Re-test after fixes

3. **Optional Improvements:**
   - Performance optimizations if needed
   - UX improvements if discovered
   - Additional error handling

4. **Update Documentation:**
   - Update any relevant docs
   - Add notes about known issues
   - Document any workarounds

---

## Quick Test Script

For rapid smoke testing, run through this abbreviated checklist:

```markdown
Quick Smoke Test (5 minutes)
1. [ ] Open Compendium - loads correctly
2. [ ] Add creature - saves successfully
3. [ ] Edit creature - updates correctly
4. [ ] Add combatant - appears in list
5. [ ] Add condition - shows on card
6. [ ] Add effect - shows on card
7. [ ] Add note - saves correctly
8. [ ] Edit name note - displays correctly
9. [ ] Reload page - data persists
10. [ ] Check console - no errors
```

---

## Success Criteria

Testing is considered successful when:
- ✅ All critical path tests pass
- ✅ No console errors during normal operation
- ✅ Data persists correctly
- ✅ All forms submit and process correctly
- ✅ Modals open/close properly
- ✅ Recent items autocomplete works
- ✅ No breaking changes to existing features

---

## Notes

- Tests should be run in order for integration tests
- Some tests build on previous tests (use "Test Monster" created earlier)
- Clear localStorage between full test runs for consistency
- Document any deviations from expected results
- Performance baselines are subjective - use common sense

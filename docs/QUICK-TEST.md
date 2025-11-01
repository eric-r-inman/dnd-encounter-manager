# Quick Testing Guide - Modularization

## 🚀 Quick Start (5 Minutes)

This is a rapid smoke test to verify the modularization didn't break anything.

### Setup
1. Open http://localhost:3001 in browser
2. Open browser console (F12)
3. Clear localStorage (optional, for clean test):
   ```javascript
   localStorage.clear()
   location.reload()
   ```

---

## ✅ Quick Test Checklist

### 1. Recent Items Module (1 min)
```
□ Apply an effect with custom name "Test Effect"
□ Open effect modal again
□ Start typing "Test" - should see autocomplete suggestion
□ Console check: localStorage.getItem('recentEffects')
```

---

### 2. Form Handlers Module (2 min)
```
□ Add condition to a combatant → Should show badge
□ Add effect to a combatant → Should show badge
□ Add general note → Note icon appears
□ Click combatant name → Add name note → Tag appears
□ Add combatant from form → Appears in initiative list
```

**Console Verification:**
```javascript
// Should see form routing logs:
// 📝 Form submission: condition-application
// 📝 Form submission: effect-application
// 📝 Form submission: combatant-note
```

---

### 3. Creature Modal Events Module (2 min)
```
□ Click "Quick View" button → Compendium modal opens
□ Click a creature in list → Details show on right
□ Click "Add Creature" button → Form opens
□ Fill in: Name="Quick Test", Type=enemy, AC=10, HP=20
□ Submit → Creature appears in list
□ Select creature → Click "Edit" → Form populates
□ Change AC to 15 → Submit → AC updates
```

**Console Verification:**
```javascript
// Check creature saved:
const customs = JSON.parse(localStorage.getItem('dnd-custom-creatures'));
console.log(customs.find(c => c.name === 'Quick Test'));
// Should show creature object with AC: 15
```

---

### 4. Integration Check (30 sec)
```
□ Click creature name in combatant card
□ Stat block appears in right pane
□ Click "Quick View" → Modal opens with creature selected
```

---

### 5. Persistence Check (30 sec)
```
□ Note current state (creatures, combatants, conditions, effects)
□ Reload page (F5)
□ Verify everything is still there
```

---

## ❌ Failure Indicators

**Stop and investigate if you see:**
- Any console errors (red text)
- Forms that don't submit
- Modals that don't open/close
- Data that doesn't persist
- Missing UI elements (badges, tags, buttons)
- Autocomplete not working

---

## 🔍 Console Commands for Quick Checks

### Check Recent Items
```javascript
// Recent effects
JSON.parse(localStorage.getItem('recentEffects'))

// Recent notes (general)
JSON.parse(localStorage.getItem('recentGeneralNotes'))

// Recent notes (name)
JSON.parse(localStorage.getItem('recentNameNotes'))
```

### Check Custom Creatures
```javascript
const customs = JSON.parse(localStorage.getItem('dnd-custom-creatures'));
console.table(customs.map(c => ({name: c.name, ac: c.ac, hp: c.maxHP})));
```

### Check Combatants
```javascript
const combatants = DataServices.combatantManager.getAllCombatants();
console.table(combatants.map(c => ({
    name: c.name,
    initiative: c.initiative,
    hp: c.currentHP,
    conditions: c.conditions.length,
    effects: c.effects.length
})));
```

### Check for Errors
```javascript
// This should be empty or only have warnings
console.log('Errors:', window.onerror);
```

---

## 📊 Test Results Template

```
Date: [DATE]
Tester: [NAME]
Browser: [BROWSER VERSION]

Module 1 - Recent Items:     ✅ PASS / ❌ FAIL
Module 2 - Form Handlers:    ✅ PASS / ❌ FAIL
Module 3 - Creature Modals:  ✅ PASS / ❌ FAIL
Integration:                 ✅ PASS / ❌ FAIL
Persistence:                 ✅ PASS / ❌ FAIL

Console Errors: [YES/NO]
Notes: [Any observations]
```

---

## 🐛 If Tests Fail

1. **Check Console First**
   - Look for red error messages
   - Note the error type and location

2. **Check Module Imports**
   - Verify all imports in modal-events.js
   - Check for typos in import paths

3. **Check Method Delegation**
   - Verify `FormHandlers.handleFormSubmission()` is called
   - Verify `CreatureModalEvents.*` methods are called
   - Verify `RecentItems.*` methods are called

4. **Check Browser Console Network Tab**
   - Ensure all JS modules load (200 status)
   - No 404 errors for module files

5. **Report Issue**
   - Use bug report template from full testing plan
   - Include console errors
   - Include steps to reproduce

---

## ✨ Success Criteria

All tests pass if:
- ✅ No console errors
- ✅ All forms submit correctly
- ✅ All modals open/close properly
- ✅ Recent items autocomplete works
- ✅ Data persists across reload
- ✅ All UI elements appear correctly

---

## 📚 For Full Testing

See `docs/testing-plan-modularization.md` for:
- Detailed test cases
- Edge case testing
- Performance testing
- Cross-browser testing
- Regression testing

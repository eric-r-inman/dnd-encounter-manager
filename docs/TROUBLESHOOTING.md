# Troubleshooting Guide

## Quick Solutions

### Most Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Combatants not appearing | Clear browser data and refresh |
| HP calculations wrong | Check HP history for calculation trail |
| Tooltips not showing | Hover over condition badges, not text |
| Performance slow | Clear localStorage: `localStorage.clear()` |
| Page won't load | Check browser console for JavaScript errors |

## Application Issues

### Combatant Management

#### Combatants Not Appearing

**Symptoms:**
- Empty encounter list
- "Add Combatant" works but nothing shows

**Causes & Solutions:**
1. **Browser Storage Full:**
   ```javascript
   // Check storage usage
   console.log('Storage used:', JSON.stringify(localStorage).length);

   // Clear old data
   localStorage.clear();
   location.reload();
   ```

2. **JavaScript Errors:**
   - Open browser DevTools (F12)
   - Check Console tab for red error messages
   - Common fix: Hard refresh (Ctrl+F5 or Cmd+Shift+R)

3. **State Corruption:**
   ```javascript
   // Reset application state
   localStorage.removeItem('dnd-encounter-manager-state');
   localStorage.removeItem('dnd-combatant-instances');
   location.reload();
   ```

#### Can't Add New Combatants

**Symptoms:**
- "Add Combatant" button doesn't work
- Modal doesn't open
- Form submission fails

**Solutions:**
1. **Check Required Fields:**
   - Name must not be empty
   - HP must be positive number
   - Initiative must be number

2. **Modal Issues:**
   ```javascript
   // Force close all modals
   document.querySelectorAll('.modal').forEach(modal => {
       modal.style.display = 'none';
   });
   ```

3. **Event Handler Problems:**
   - Refresh page
   - Check browser console for errors
   - Try keyboard shortcuts instead

#### Combatant Data Corruption

**Symptoms:**
- Strange HP values
- Missing combatant properties
- Unexpected behavior

**Diagnostic:**
```javascript
// Check combatant data integrity
const combatants = JSON.parse(localStorage.getItem('dnd-encounter-manager-state') || '{}').combatants || [];
combatants.forEach((c, i) => {
    console.log(`Combatant ${i}:`, c);

    // Check for required properties
    const required = ['id', 'name', 'currentHP', 'maxHP', 'initiative'];
    const missing = required.filter(prop => c[prop] === undefined);
    if (missing.length) {
        console.warn(`Missing properties:`, missing);
    }
});
```

**Solutions:**
1. **Reset Corrupted Combatant:**
   ```javascript
   // Remove specific combatant
   StateManager.removeCombatant('problematic-id');
   ```

2. **Reset All Data:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### Health Point Issues

#### Incorrect HP Calculations

**Symptoms:**
- Damage not applied correctly
- Healing goes above max HP
- Temporary HP behaves strangely

**Understanding HP Rules:**
1. **Damage Order:** Temporary HP → Current HP
2. **Healing Cap:** Cannot exceed Max HP
3. **Temporary HP:** Doesn't stack, highest value wins

**Debug HP Calculations:**
```javascript
// Check HP history for a combatant
const combatant = StateManager.getCombatant('combatant-id');
console.log('HP History:', combatant.hpHistory);

// Manual HP calculation
const effectiveHP = combatant.currentHP + combatant.tempHP;
console.log(`Effective HP: ${effectiveHP} (${combatant.currentHP} + ${combatant.tempHP})`);
```

**Common Issues:**
1. **Negative Current HP:**
   ```javascript
   // Fix negative HP
   StateManager.updateCombatant(combatantId, 'currentHP', 0);
   ```

2. **HP Above Maximum:**
   ```javascript
   // Cap HP at maximum
   const combatant = StateManager.getCombatant(combatantId);
   if (combatant.currentHP > combatant.maxHP) {
       StateManager.updateCombatant(combatantId, 'currentHP', combatant.maxHP);
   }
   ```

#### Batch HP Operations Failing

**Symptoms:**
- Only some combatants affected
- Error messages in console
- Operation appears to work but doesn't

**Solutions:**
1. **Check Selection:**
   ```javascript
   // Verify selected combatants
   const selected = EventCoordinator.getSelectedCombatants();
   console.log('Selected combatants:', selected);
   ```

2. **Clear Selection and Retry:**
   ```javascript
   EventCoordinator.clearSelection();
   // Re-select combatants and try again
   ```

### Combat Flow Problems

#### Turn Order Issues

**Symptoms:**
- Wrong combatant highlighted
- Turn skipping combatants
- Initiative order incorrect

**Solutions:**
1. **Resort Initiative:**
   ```javascript
   // Force initiative resort
   const combatants = StateManager.getStateSlice('combatants');
   const sorted = combatants.sort((a, b) => b.initiative - a.initiative);
   StateManager.setState('combatants', sorted);
   ```

2. **Reset Combat:**
   ```javascript
   // Reset combat state
   StateManager.setState('combat', {
       isActive: false,
       currentTurn: 0,
       currentRound: 1
   });
   ```

#### Combat Won't Start

**Symptoms:**
- "Start Combat" button doesn't work
- No combatants highlighted
- Turn controls disabled

**Solutions:**
1. **Check Combatant Count:**
   ```javascript
   const combatants = StateManager.getStateSlice('combatants');
   console.log(`Combatant count: ${combatants.length}`);
   // Need at least 1 combatant to start combat
   ```

2. **Reset Combat State:**
   ```javascript
   StateManager.setState('combat', {
       isActive: false,
       currentTurn: 0,
       currentRound: 1
   });
   ```

### Conditions and Effects

#### Conditions Not Applying

**Symptoms:**
- Condition modal closes but no badge appears
- Existing conditions can't be removed
- Duration not counting down

**Solutions:**
1. **Check Condition Name:**
   ```javascript
   // Verify condition exists in database
   const validConditions = Object.keys(CONDITION_DETAILS);
   console.log('Valid conditions:', validConditions);
   ```

2. **Clear Condition State:**
   ```javascript
   // Remove all conditions from combatant
   StateManager.updateCombatant(combatantId, 'conditions', []);
   ```

#### Tooltips Not Showing

**Symptoms:**
- Hovering over conditions shows no tooltip
- Batch operation hints missing
- D&D rule tooltips don't appear

**Solutions:**
1. **Check Hover Target:**
   - Hover over the condition badge/icon, not the text
   - Ensure cursor is directly over the element

2. **Reset Tooltip System:**
   ```javascript
   // Reinitialize tooltips
   TooltipEvents.initializeTooltips();
   ```

3. **Browser Issues:**
   - Disable browser extensions
   - Try in incognito/private mode
   - Clear browser cache

## Performance Issues

### Slow Loading

**Symptoms:**
- Page takes long time to load
- Combatant cards render slowly
- Interface feels laggy

**Diagnostic:**
```javascript
// Check localStorage size
const storageSize = JSON.stringify(localStorage).length;
console.log(`Storage size: ${(storageSize / 1024).toFixed(2)} KB`);

// Check combatant count
const combatants = StateManager.getStateSlice('combatants');
console.log(`Combatant count: ${combatants.length}`);
```

**Solutions:**
1. **Clear Old Data:**
   ```javascript
   // Clear all stored data
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Reduce Combatant Count:**
   - Remove unused combatants
   - Split large encounters into smaller groups
   - Recommended maximum: 50 combatants

3. **Browser Optimization:**
   - Close other tabs
   - Restart browser
   - Update to latest browser version

### Memory Issues

**Symptoms:**
- Browser becomes unresponsive
- "Out of memory" errors
- Application crashes

**Solutions:**
1. **Clear Browser Cache:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data
   - Safari: Develop → Empty Caches

2. **Reduce Memory Usage:**
   ```javascript
   // Force garbage collection (Chrome DevTools)
   // 1. Open DevTools (F12)
   // 2. Memory tab
   // 3. Click garbage can icon
   ```

3. **Browser Settings:**
   - Increase available memory
   - Disable unnecessary extensions
   - Close other applications

## Data and Storage Issues

### Lost Data

**Symptoms:**
- Encounter disappeared
- Combatants lost after refresh
- Settings reset

**Recovery:**
1. **Check Browser Storage:**
   ```javascript
   // List all stored data
   Object.keys(localStorage).forEach(key => {
       if (key.includes('dnd')) {
           console.log(key, localStorage.getItem(key));
       }
   });
   ```

2. **Browser History:**
   - Check if data exists in browser back/forward cache
   - Try refreshing page
   - Check other browser tabs

3. **Export/Import:**
   - If you have a recent export, use import feature
   - Check downloads folder for automatic backups

### Storage Full

**Symptoms:**
- Can't save new data
- "Storage quota exceeded" errors
- Application becomes read-only

**Solutions:**
1. **Clear Old Data:**
   ```javascript
   // Clear localStorage
   localStorage.clear();

   // Or remove specific old entries
   Object.keys(localStorage).forEach(key => {
       if (key.includes('old-') || key.includes('backup-')) {
           localStorage.removeItem(key);
       }
   });
   ```

2. **Export Important Data:**
   ```javascript
   // Export current state before clearing
   const backup = {
       combatants: StateManager.getStateSlice('combatants'),
       combat: StateManager.getStateSlice('combat'),
       timestamp: new Date().toISOString()
   };

   // Download backup
   const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'dnd-backup.json';
   a.click();
   ```

### Import/Export Issues

**Symptoms:**
- Import fails with error message
- Exported data appears corrupted
- File format not recognized

**Solutions:**
1. **Verify File Format:**
   ```javascript
   // Check if file is valid JSON
   try {
       const data = JSON.parse(fileContent);
       console.log('Valid JSON:', data);
   } catch (error) {
       console.error('Invalid JSON:', error);
   }
   ```

2. **Manual Data Recovery:**
   ```javascript
   // Manually reconstruct data if needed
   const minimalCombatant = {
       id: 'combatant-' + Date.now(),
       name: 'Recovered Combatant',
       type: 'enemy',
       initiative: 10,
       ac: 10,
       maxHP: 10,
       currentHP: 10,
       tempHP: 0,
       conditions: [],
       effects: []
   };

   StateManager.addCombatant(minimalCombatant);
   ```

## Browser Compatibility

### Older Browsers

**Symptoms:**
- White screen or "Script error"
- Features not working
- Console shows syntax errors

**Solutions:**
1. **Check Browser Version:**
   - Minimum: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
   - Update to latest version

2. **Enable JavaScript:**
   - Ensure JavaScript is enabled in browser settings
   - Disable script blockers temporarily

3. **Use Modern Browser:**
   - Download Chrome, Firefox, or Edge
   - Avoid Internet Explorer

### Mobile Browsers

**Symptoms:**
- Layout issues on mobile
- Touch interactions not working
- Performance problems

**Solutions:**
1. **Use Desktop Browser:**
   - Application optimized for desktop use
   - Mobile support is limited

2. **Tablet Compatibility:**
   - Works better on larger screens (iPad, etc.)
   - Use landscape orientation

## Development Issues

### Local Development

**Symptoms:**
- `npm run dev` fails
- Module not found errors
- Build process crashes

**Solutions:**
1. **Clean Install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

2. **Node.js Version:**
   ```bash
   node --version  # Should be 16+
   npm --version   # Should be 8+
   ```

3. **Port Conflicts:**
   ```bash
   # Use different port
   npm run dev -- --port 3001
   ```

### Build Issues

**Symptoms:**
- `npm run build` fails
- Missing dependencies
- Out of memory errors

**Solutions:**
1. **Increase Memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **Clear Cache:**
   ```bash
   rm -rf dist
   npm run build
   ```

## Getting Help

### Debug Information

When reporting issues, include:

```javascript
// Run in browser console
const debugInfo = {
    userAgent: navigator.userAgent,
    localStorage: localStorage.length,
    combatantCount: StateManager.getStateSlice('combatants').length,
    combatActive: StateManager.getStateSlice('combat').isActive,
    errors: 'Check console for error messages',
    timestamp: new Date().toISOString()
};

console.log('Debug Info:', debugInfo);
```

### Console Commands

Useful debugging commands:

```javascript
// Check application state
console.log('App State:', StateManager.state);

// List all combatants
StateManager.getStateSlice('combatants').forEach(c => {
    console.log(`${c.name}: HP ${c.currentHP}/${c.maxHP}, Init ${c.initiative}`);
});

// Check for JavaScript errors
console.log('Errors:', window.errors || 'None recorded');

// Force re-render all combatants
CombatantManager.renderAll();

// Reset everything (DANGER: loses all data)
localStorage.clear();
location.reload();
```

### Safe Mode

If application is completely broken:

1. **Open new private/incognito window**
2. **Visit application URL**
3. **Test basic functionality**
4. **If working, clear main browser data**

### Recovery Mode

Emergency data recovery:

```javascript
// Last resort: extract any salvageable data
const allStorage = {};
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('dnd')) {
        allStorage[key] = localStorage.getItem(key);
    }
}
console.log('Stored Data:', allStorage);

// Copy output and save to file for manual recovery
```

## Prevention Tips

### Regular Maintenance

1. **Weekly:**
   - Export encounter data
   - Clear browser cache
   - Check for application updates

2. **Before Big Sessions:**
   - Test all functionality
   - Export backup
   - Close other browser tabs

3. **Monthly:**
   - Clear old localStorage data
   - Update browser
   - Check system storage space

### Best Practices

1. **Data Management:**
   - Regular exports of important encounters
   - Don't store personal/sensitive information
   - Keep encounter sizes reasonable (< 50 combatants)

2. **Browser Usage:**
   - Use bookmarks instead of typing URLs
   - Keep browser updated
   - Don't use application in multiple tabs simultaneously

3. **Performance:**
   - Close application when not in use
   - Restart browser periodically
   - Monitor system memory usage

Still having issues? Check the [Development Guide](DEVELOPMENT.md) for more technical solutions or create an issue report with the debug information above.
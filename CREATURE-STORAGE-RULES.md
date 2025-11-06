# CRITICAL: Creature Storage Rules

## ⚠️ NEW SYSTEM: Save/Load Like Encounters ⚠️

**Creature database now works like the encounter save/load system!**

## 🎯 How It Works

1. **Base Database** - Shipped with app at `/src/data/creatures/creature-database.json` (read-only)
2. **Working Database** - Stored in localStorage key: `'dnd-creature-database'`
3. **First Load** - Base database is copied to working database
4. **User Changes** - All add/edit/delete operations modify working database (auto-saved to localStorage)
5. **Export** - User can download working database as JSON file
6. **Import** - User can load a database JSON file (replaces working database)
7. **Reset** - User can reset to base database (discard all changes)

## ✅ CORRECT APPROACH

**Use CreatureService for ALL creature operations:**

```javascript
import { CreatureService } from '../services/creature-service.js';

// Initialize (call once on app start)
await CreatureService.initialize();

// Load creatures (from working database)
const creatures = await CreatureService.loadCreatures();

// Add creature (auto-saves to localStorage)
await CreatureService.addCreature(creatureData);

// Update creature (auto-saves to localStorage)
await CreatureService.updateCreature(creatureId, updates);

// Delete creature (auto-saves to localStorage)
await CreatureService.deleteCreature(creatureId);

// Export database to file (download JSON)
await CreatureService.exportDatabase();

// Import database from file (replace working database)
await CreatureService.importDatabase(file);

// Reset to base database (discard all changes)
await CreatureService.resetToBase();
```

## 🚫 NEVER DO THIS

- ❌ `localStorage.getItem('dnd-custom-creatures')` - Old system, don't use
- ❌ `sessionStorage.setItem(STORAGE_KEYS.EDITING_CREATURE_ID, ...)` - Not needed
- ❌ Direct manipulation of localStorage for creatures - Use CreatureService only

## ✅ localStorage Usage Rules

**ONLY CreatureService may use localStorage for creatures:**
- ✅ `localStorage.setItem('dnd-creature-database', ...)` - IN CreatureService ONLY
- ✅ `localStorage.getItem('dnd-creature-database')` - IN CreatureService ONLY
- ❌ No other file should touch 'dnd-creature-database'
- ❌ No other localStorage keys for creatures

## 📁 Files Refactored

- ✅ `src/scripts/services/creature-service.js` - Complete rewrite with save/load
- ✅ `src/scripts/events/import-export-handlers.js` - Uses new CreatureService
- ✅ `src/scripts/events/index.js` - Updated delete handler to use CreatureService
- ✅ `src/components/combatant-card/CombatantManager.js` - Updated to use CreatureService
- ✅ UI - Added Export/Import/Reset buttons to creature database modal

## 🔍 Search for Old System

To find old localStorage creature code that needs removal:
```bash
grep -r "'dnd-custom-creatures'\|'dnd-hidden-creatures'" src/
```

## 💾 User Workflow

### Adding Creatures
1. User pastes creature in compendium
2. Creature added to working database
3. Auto-saved to localStorage
4. ✅ Done! (No manual export needed for session persistence)

### Exporting Database
1. User clicks "Export Database" button
2. JSON file downloads: `creature-database-YYYY-MM-DD.json`
3. User keeps file for backup or sharing

### Importing Database
1. User clicks "Import Database" button
2. User selects JSON file
3. Working database replaced with imported data
4. All creatures from file now available

### Resetting Database
1. User clicks "Reset to Base" button
2. Confirms they want to discard changes
3. Working database reset to original shipped version

## 📝 Benefits

- ✅ Changes persist between sessions (localStorage)
- ✅ No manual export required after every change
- ✅ Users can export for backup/sharing when desired
- ✅ Users can import databases from others
- ✅ Users can reset if they mess up
- ✅ Works offline
- ✅ Same UX as encounter save/load

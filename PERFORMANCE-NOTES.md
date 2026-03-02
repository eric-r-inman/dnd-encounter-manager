# Performance Optimization Notes

## Current State (March 2, 2026)

### Bundle Analysis

**Main Bundle:**
- Size: 333.02 KB (76.54 KB gzipped)
- Contains: All event handlers, services, and components

**Current Optimizations:**

1. **CombatantManager Rendering** ([CombatantManager.js:276-377](src/components/combatant-card/CombatantManager.js#L276-L377))
   - ✅ Batch DOM updates with `requestAnimationFrame`
   - ✅ Document fragments for single DOM insertion
   - ✅ 30% threshold: Renders all if >30% need updates
   - ✅ Smart update scheduling prevents excessive re-renders

2. **Modal Lazy Loading** ([ModalLoader.js](src/components/modals/ModalLoader.js))
   - ✅ Infrastructure in place (opt-in via feature flag)
   - ✅ On-demand modal loading
   - ✅ Smart caching prevents re-fetching
   - ⏳ Not yet enabled (needs modal extraction)

3. **Dynamic Imports** (Partial)
   - ✅ Dice roller lazy loaded
   - ✅ Auto-roll events lazy loaded
   - ⚠️ Mixed static/dynamic imports prevent chunking
   - ⚠️ 4 modules can't be split due to dual imports

### Code Splitting Issues

The following modules have **mixed import patterns** (both static and dynamic), preventing Vite from creating separate chunks:

1. **creature-modal-events.js**
   - Dynamically imported by: form-handlers.js
   - Statically imported by: creature-handlers.js, import-export-handlers.js, index.js, modal-events.js
   - **Impact**: Large modal event handling code in main bundle

2. **modal-events.js**
   - Dynamically imported by: auto-roll-events.js, form-handlers.js, keyboard-events.js
   - Statically imported by: creature-handlers.js, import-export-handlers.js, index.js, modal-helpers.js
   - **Impact**: All modal event handling in main bundle

3. **DiceRoller.js**
   - Dynamically imported by: index.js (3 times)
   - Statically imported by: dice-roller-events.js, index.js
   - **Impact**: Entire dice roller in main bundle

4. **auto-roll-events.js**
   - Dynamically imported by: combat-events.js, form-handlers.js, index.js
   - Statically imported by: index.js
   - **Impact**: Auto-roll functionality in main bundle

### Recommendations

#### Quick Wins (Low Effort, Medium Impact)

1. **Enable Modal Lazy Loading**
   - Extract 14 modals to separate HTML files (~1,500 lines)
   - Enable `lazyLoading: true` in ModalSystem.init()
   - **Estimated Impact**: 60% reduction in initial HTML size

2. **Fix Mixed Import Patterns**
   - Convert all static imports to dynamic where already used dynamically
   - Allows Vite to create separate chunks
   - **Estimated Impact**: 10-15% reduction in main bundle

3. **Preload Critical Modals**
   - Preload commonly-used modals during idle time
   - Use `ModalSystem.preloadModals(['hp-modification', 'condition', 'effect'])`
   - **Impact**: Better perceived performance

#### Medium Effort (High Impact)

4. **Virtual Scrolling for Combatant List**
   - Only render visible combatants (5-10 at a time)
   - Dramatically improves performance for 50+ combatants
   - **Estimated Impact**: 80% faster rendering for large encounters
   - **Complexity**: Medium (150-200 lines of code)

5. **Lazy Load Large Forms**
   - Creature form modal is very large (~500 lines)
   - Apply same pattern as modal lazy loading
   - **Impact**: Further reduce initial bundle size

#### Long Term (Architectural)

6. **Service Worker for Creature Database**
   - Cache creature data in service worker
   - Instant loading for subsequent sessions
   - **Impact**: Dramatically faster app initialization

7. **Web Workers for Calculations**
   - Move complex combat calculations to web worker
   - Keeps UI thread responsive
   - **Impact**: Smoother UI, especially for batch operations

## Performance Metrics Goals

### Target Metrics
- **Initial Load**: < 2 seconds on 3G
- **Time to Interactive**: < 3 seconds
- **Main Bundle**: < 250 KB (current: 333 KB)
- **Render 50 Combatants**: < 100ms (need baseline measurement)

### How to Measure

```bash
# Build production bundle
npm run build

# Check bundle sizes
ls -lh dist/assets/

# Use Chrome DevTools
# 1. Open app in Chrome
# 2. DevTools > Performance tab
# 3. Record page load
# 4. Analyze metrics:
#    - First Contentful Paint (FCP)
#    - Largest Contentful Paint (LCP)
#    - Time to Interactive (TTI)
```

## Next Steps

1. **Extract modals** to enable lazy loading
2. **Fix mixed imports** to enable code splitting
3. **Add performance monitoring** to track improvements
4. **Implement virtual scrolling** for large encounters

## References

- [Web.dev Performance Guide](https://web.dev/performance/)
- [Vite Code Splitting Docs](https://vitejs.dev/guide/features.html#dynamic-import)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

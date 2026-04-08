# Documentation Maintenance Guide

## Purpose

This guide ensures documentation stays accurate and current as the codebase evolves.

---

## 🔄 When to Update Documentation

### **Always Update When:**

1. **Adding/Removing Features**
   - Update README.md feature list
   - Add to CHANGELOG.md
   - Update API.md if adding new methods
   - Update ARCHITECTURE.md if changing structure

2. **Refactoring Code**
   - Update file paths in all docs
   - Update code examples
   - Update architecture diagrams/descriptions

3. **Changing APIs**
   - Update API.md with new signatures
   - Update CODE_EXAMPLES.md
   - Add migration notes to CHANGELOG.md

4. **Deprecating Features**
   - Mark as deprecated in docs (don't delete yet)
   - Add deprecation notice to CHANGELOG.md
   - Update TROUBLESHOOTING.md if needed

5. **Releasing New Version**
   - Update version in package.json
   - Update version in README.md badge
   - Add version entry to CHANGELOG.md
   - Update DEPLOYMENT.md if deployment process changed

---

## ✅ Documentation Verification Checklist

Run before every release or major commit:

```bash
# 1. Run automated verification
./scripts/verify-docs.sh

# 2. Manual checks:
```

### **Version Consistency**
- [ ] package.json version matches README.md badge
- [ ] CHANGELOG.md has entry for current version
- [ ] Latest CHANGELOG entry date is current

### **Code References**
- [ ] All file paths in docs point to existing files
- [ ] No references to deleted/renamed files
- [ ] Code examples actually work (test them!)

### **Feature Accuracy**
- [ ] README.md features list matches implemented features
- [ ] No "coming soon" or "planned" for completed features
- [ ] No documentation for removed features

### **localStorage Keys**
- [ ] Only current keys documented (not deprecated ones)
- [ ] CREATURE-STORAGE-RULES.md is current

### **Architecture**
- [ ] ARCHITECTURE.md matches actual code structure
- [ ] Module descriptions match current implementation
- [ ] No references to old refactoring work as "current"

---

## 📝 Documentation Standards

### **File Headers**

All documentation should have:
```markdown
# Title

Brief description of what this document covers.

*Last Updated: YYYY-MM-DD*
*For Version: X.X.X*
```

### **Code Examples**

Always include:
- File path where code lives
- Actual working code (test it!)
- Expected output/result
- When to use this pattern

Example:
````markdown
### Creating a New Combatant

**File**: `src/scripts/services/CombatantManager.js`

```javascript
const combatant = CombatantManager.createCombatant({
    name: "Goblin",
    type: "enemy",
    initiative: 12,
    ac: 15,
    maxHP: 7
});
```

**Result**: New combatant added to encounter and displayed in UI
````

### **Linking Between Docs**

Use relative links:
```markdown
See [Architecture Documentation](./ARCHITECTURE.md) for system design.
See [API Reference](./docs/API.md) for method signatures.
```

### **Status Indicators**

Use these consistently:
- ✅ Implemented and working
- ⏳ In progress
- 📅 Planned for future
- ⚠️ Deprecated (will be removed)
- ❌ Not implemented / won't implement

---

## 🤖 Automated Verification

### **Running the Verification Script**

```bash
./scripts/verify-docs.sh
```

This checks for:
1. References to deleted/moved files
2. Deprecated localStorage keys
3. Version conflicts
4. Non-existent feature mentions
5. Outdated file paths
6. Old architecture descriptions

### **Interpreting Results**

- **Green checkmark** ✅ = No issues found
- **Yellow warning** ⚠️ = Potential issue to review
- **Red error** ❌ = Must fix before release

Warnings are not always errors - review context to determine if update needed.

---

## 📊 Documentation Structure

### **Active Documentation** (Keep Updated)

```
/
├── README.md                    # Main entry, features, quick start
├── CHANGELOG.md                 # Version history
├── DEVELOPMENT.md               # Developer guide
├── BACKUP_INSTRUCTIONS.md       # Git procedures
├── TESTING.md                   # Testing guide
├── CREATURE-STORAGE-RULES.md    # Storage architecture rules
│
└── docs/
    ├── ARCHITECTURE.md          # System design
    ├── API.md                   # API reference
    ├── CODE_EXAMPLES.md         # Code patterns
    ├── CREATURE.md              # Data models
    ├── DEPLOYMENT.md            # Deployment guide
    ├── TROUBLESHOOTING.md       # Common issues
    └── DOCUMENTATION-MAINTENANCE.md  # This file
```

### **Historical Documentation** (For Reference)

```
docs/
└── archive/
    ├── ARCHIVE-CODE_OPTIMIZATION_PLAN.md
    ├── REFACTORING-LOG.md
    └── TEST-STATUS.md
```

### **Future Features** (Planned Work)

```
docs/
└── future-features/
    └── CHALLENGE-CALCULATOR-SPEC.md
```

---

## 🎯 Quick Reference

### **Before Committing**
1. Run `./scripts/verify-docs.sh`
2. Update CHANGELOG.md if adding features
3. Check version numbers match

### **Before Releasing**
1. Run full verification checklist
2. Update all version numbers
3. Finalize CHANGELOG.md entry
4. Test all code examples

### **After Major Refactor**
1. Update ARCHITECTURE.md
2. Update file paths in all docs
3. Update CODE_EXAMPLES.md
4. Archive old refactoring logs

---

## 💡 Tips

### **Keep It DRY**
- Don't duplicate information across multiple docs
- Link to canonical source instead
- Example: API details go in API.md, link from README.md

### **Test Your Examples**
- Actually run code examples before committing
- Use exact file paths and code from the repo
- Include expected output

### **Use Clear Dates**
- Always include "Last Updated" in doc headers
- Use YYYY-MM-DD format for sortability
- Reference version numbers for context

### **Document the "Why"**
- Explain design decisions, not just "what"
- Future you (or others) will thank you
- CREATURE-STORAGE-RULES.md is a good example

---

## 📞 Questions?

If you're unsure whether to update docs:
- **Yes, update it** - Better to over-document than under
- When in doubt, add a note to CHANGELOG.md
- Small updates prevent big doc debt later

---

*Last Updated: 2026-03-03*
*For Version: 2.0.0*

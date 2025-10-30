# Git Version Control & Backup Instructions

## Current Status ✅

Your D&D Encounter Manager project is now under git version control:

- ✅ Git repository initialized
- ✅ Comprehensive `.gitignore` file created
- ✅ Initial commit created with all current files (28 files, 18,836 lines)
- ✅ Branch renamed from `master` to `main`
- ✅ Commit hash: `7bc00ee`

## Local Backup Strategy

### 1. Regular Commits
Create commits for each logical change:

```bash
# After making changes
git add .
git commit -m "Description of changes"

# Example commit messages:
git commit -m "Refactor: Break down event-handlers.js into modules"
git commit -m "Docs: Add JSDoc comments to CombatantCard class"
git commit -m "Fix: Resolve tooltip persistence bug"
```

### 2. Feature Branches
Create branches for major changes:

```bash
# Create and switch to a new branch
git checkout -b feature/event-handler-refactor

# Work on your changes...
git add .
git commit -m "WIP: Split event handlers into modules"

# Switch back to main when done
git checkout main
git merge feature/event-handler-refactor
```

### 3. Tags for Milestones
Tag important versions:

```bash
git tag -a v1.0.0 -m "Initial stable version"
git tag -a v1.1.0 -m "Event handler refactoring complete"
```

## Remote Repository Setup (Recommended)

### Option 1: GitHub (Recommended)

1. **Create GitHub Repository:**
   - Go to [github.com](https://github.com)
   - Click "New repository"
   - Name: `dnd-encounter-manager`
   - Keep it private if needed
   - Don't initialize with README (we already have files)

2. **Connect Local to Remote:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/dnd-encounter-manager.git
   git push -u origin main
   ```

3. **Future pushes:**
   ```bash
   git push  # Pushes to origin/main automatically
   ```

### Option 2: Other Git Hosts

**GitLab:**
```bash
git remote add origin https://gitlab.com/YOUR_USERNAME/dnd-encounter-manager.git
git push -u origin main
```

**Bitbucket:**
```bash
git remote add origin https://bitbucket.org/YOUR_USERNAME/dnd-encounter-manager.git
git push -u origin main
```

## Backup Workflow for Optimization Project

### Before Starting Each Phase:

```bash
# Create a backup branch
git checkout -b backup/pre-phase-1
git push origin backup/pre-phase-1

# Switch back to main for work
git checkout main
```

### During Development:

```bash
# Commit frequently (every hour or logical change)
git add .
git commit -m "Progress: Extracted combat events from event-handlers.js"

# Push to remote daily
git push
```

### Phase Completion:

```bash
# Create milestone tag
git tag -a phase-1-complete -m "Architecture refactoring complete"
git push --tags
```

## Emergency Recovery

### If You Break Something:

```bash
# See recent commits
git log --oneline

# Go back to a previous commit
git checkout COMMIT_HASH

# Create a new branch from that point
git checkout -b recovery/back-to-working

# Or reset main to a previous commit (DANGEROUS)
git reset --hard COMMIT_HASH
```

### Stash Work in Progress:

```bash
# Save current work without committing
git stash save "WIP: halfway through modal refactor"

# List stashes
git stash list

# Restore stashed work
git stash pop
```

## File Recovery

### Recover Deleted Files:
```bash
# See what files were in the last commit
git ls-tree -r HEAD --name-only

# Restore a specific file
git checkout HEAD -- src/scripts/event-handlers.js
```

### Compare Changes:
```bash
# See what changed since last commit
git diff

# See changes in a specific file
git diff src/scripts/event-handlers.js

# See changes between commits
git diff 7bc00ee HEAD
```

## Automated Backup Script

Create `backup.sh` in project root:

```bash
#!/bin/bash
# Daily backup script

echo "🔄 Creating daily backup..."

# Commit any current changes
git add .
git commit -m "Daily backup: $(date)"

# Push to remote
git push

# Create daily tag
git tag -a "backup-$(date +%Y-%m-%d)" -m "Daily backup"
git push --tags

echo "✅ Backup complete!"
```

Make it executable: `chmod +x backup.sh`

## Best Practices

### 1. Commit Messages
Use conventional commit format:
```
type(scope): description

feat(combatant): add new status effect system
fix(tooltip): prevent tooltip from persisting after close
docs(readme): update installation instructions
refactor(events): split event-handlers.js into modules
```

### 2. .gitignore Maintenance
Your `.gitignore` already covers:
- `node_modules/` - Dependencies
- `dist/` - Build outputs
- `.env*` - Environment files
- `.DS_Store` - Mac OS files
- `Misc/` - Your misc folder

### 3. What to Commit
✅ **Always commit:**
- Source code changes
- Configuration updates
- Documentation updates
- Package.json changes

❌ **Never commit:**
- `node_modules/`
- Build outputs
- API keys or secrets
- Personal IDE settings
- Temporary files

## Next Steps

1. **Set up remote repository** (GitHub recommended)
2. **Push initial commit** to remote
3. **Before starting optimization:** Create `backup/pre-optimization` branch
4. **During optimization:** Commit every logical change
5. **Test each commit** to ensure application still works

---

**Ready to begin optimization!** Your code is now safely backed up and version controlled. You can confidently start the refactoring process knowing you can always revert to this working baseline.
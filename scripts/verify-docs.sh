#!/bin/bash

# Documentation Verification Script
# Checks for common signs of outdated documentation

echo "🔍 D&D Encounter Manager - Documentation Verification"
echo "======================================================"
echo ""

ISSUES_FOUND=0

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to check for issues
check_issue() {
    local file=$1
    local pattern=$2
    local description=$3

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  $file${NC}"
        echo "   Issue: $description"
        echo "   Found: $(grep -n "$pattern" "$file" | head -1 | cut -d: -f1):$(grep "$pattern" "$file" | head -1)"
        echo ""
        ((ISSUES_FOUND++))
    fi
}

echo "1️⃣  Checking for references to deleted/moved files..."
echo "---------------------------------------------------"

# Check for references to old monolithic file
for doc in README.md DEVELOPMENT.md docs/*.md; do
    check_issue "$doc" "event-handlers.js" "References old monolithic event-handlers.js (now modularized)"
    check_issue "$doc" "6,873" "References old monolithic line count"
    check_issue "$doc" "6873" "References old monolithic line count"
done

echo ""
echo "2️⃣  Checking for deprecated localStorage keys..."
echo "----------------------------------------------"

for doc in README.md DEVELOPMENT.md docs/*.md CREATURE-STORAGE-RULES.md; do
    check_issue "$doc" "dnd-custom-creatures" "References deprecated 'dnd-custom-creatures' key (now 'dnd-creature-database')"
    check_issue "$doc" "base.*custom.*separate" "Mentions separate base/custom databases (now unified)"
done

echo ""
echo "3️⃣  Checking for version conflicts..."
echo "-----------------------------------"

# Extract versions from different files
readme_version=$(grep -o "version-[0-9.]*" README.md | head -1 | cut -d- -f2)
changelog_version=$(grep -o "\[.*\]" CHANGELOG.md | head -1 | tr -d '[]')
package_version=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)

echo "README.md version: $readme_version"
echo "CHANGELOG.md version: $changelog_version"
echo "package.json version: $package_version"

if [[ "$readme_version" != "$changelog_version" ]] || [[ "$readme_version" != "$package_version" ]]; then
    echo -e "${YELLOW}⚠️  Version mismatch detected!${NC}"
    echo ""
    ((ISSUES_FOUND++))
else
    echo -e "${GREEN}✅ Versions are consistent${NC}"
fi

echo ""
echo "4️⃣  Checking for references to non-existent features..."
echo "----------------------------------------------------"

# Check if docs mention features that don't exist in code
for doc in README.md docs/API.md; do
    # Death saves UI mentioned but not implemented
    if grep -qi "death save.*UI\|death save.*button\|death save.*interface" "$doc" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  $doc${NC}"
        echo "   Issue: Mentions death save UI (data model only, no UI)"
        echo ""
        ((ISSUES_FOUND++))
    fi
done

echo ""
echo "5️⃣  Checking for outdated file paths..."
echo "------------------------------------"

# Check if mentioned files actually exist
for doc in README.md DEVELOPMENT.md docs/*.md; do
    if [ ! -f "$doc" ]; then
        continue
    fi

    # Extract potential file paths (simple heuristic)
    grep -oE "src/[a-zA-Z0-9/_-]+\.js" "$doc" 2>/dev/null | while read filepath; do
        if [ ! -f "$filepath" ]; then
            echo -e "${YELLOW}⚠️  $doc${NC}"
            echo "   Issue: References non-existent file: $filepath"
            echo ""
            ((ISSUES_FOUND++))
        fi
    done
done

echo ""
echo "6️⃣  Checking for outdated architecture descriptions..."
echo "---------------------------------------------------"

for doc in docs/ARCHITECTURE.md; do
    check_issue "$doc" "planned\|TODO\|to be implemented\|coming soon" "Contains 'planned' or 'TODO' items that may be completed"
done

echo ""
echo "7️⃣  Checking documentation dates..."
echo "--------------------------------"

# Find docs with embedded dates and check if they're old
for doc in $(find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/docs/archive/*"); do
    dates=$(grep -oE "(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2},? 20[0-9]{2}" "$doc" 2>/dev/null)
    if [ ! -z "$dates" ]; then
        echo "📅 $doc"
        echo "$dates" | head -3
        echo ""
    fi
done

echo ""
echo "=========================================================="
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No issues found! Documentation appears current.${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ISSUES_FOUND potential issue(s) to review.${NC}"
    echo ""
    echo "These are warnings, not errors. Review each to determine if updates are needed."
fi
echo "=========================================================="

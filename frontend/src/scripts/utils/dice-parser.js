/**
 * Dice Parser Utility
 *
 * Parses dice notation from text and extracts:
 * - Dice expressions (e.g., "1d8+3", "2d6")
 * - Damage types (e.g., "piercing", "fire")
 * - Multiple dice rolls in compound expressions
 *
 * Supported formats:
 * - Standard: 1d6, 2d8+3, 3d10-2
 * - With average: 7 (1d8 + 3)
 * - Compound: 1d8 + 2d6
 * - With damage types: 1d8 piercing, 2d6 fire damage
 *
 * @module DiceParser
 * @version 1.0.0
 */

export class DiceParser {
    /**
     * Regular expression patterns for dice notation
     */
    static PATTERNS = {
        // Matches: 1d6, 2d8, 3d10, etc.
        simpleDice: /(\d+)d(\d+)/gi,

        // Matches: +3, -2, + 4, - 1
        modifier: /([+\-])\s*(\d+)/,

        // Matches: (1d8 + 3), (2d6), etc. - dice in parentheses
        diceInParens: /\(([^)]*\d+d\d+[^)]*)\)/gi,

        // Matches damage types (common D&D 5e types)
        damageType: /\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s*(damage)?/gi,

        // Full dice expression: captures number, dice average in parens, and damage type
        // Example: "7 (1d8 + 3) piercing damage"
        fullExpression: /(\d+)?\s*\(([^)]*\d+d\d+[^)]*)\)\s*([a-z]+(?:\s+damage)?)?/gi
    };

    /**
     * Parse a dice expression from text
     * @param {string} text - Text containing dice notation
     * @returns {Object|null} Parsed dice data or null if no valid dice found
     */
    static parseDiceExpression(text) {
        if (!text || typeof text !== 'string') return null;

        // Try to match full expression first (with average and damage type)
        const fullMatch = this.PATTERNS.fullExpression.exec(text);
        if (fullMatch) {
            const [fullText, average, diceExpr, damageType] = fullMatch;
            const parsed = this.parseDiceString(diceExpr);

            if (parsed) {
                return {
                    original: fullText.trim(),
                    average: average ? parseInt(average) : null,
                    ...parsed,
                    damageType: damageType ? damageType.trim() : null
                };
            }
        }

        // Try to match dice in parentheses
        const parensMatch = text.match(this.PATTERNS.diceInParens);
        if (parensMatch) {
            const diceExpr = parensMatch[0].replace(/[()]/g, '');
            const parsed = this.parseDiceString(diceExpr);

            if (parsed) {
                // Look for damage type after the parentheses
                const damageMatch = text.match(this.PATTERNS.damageType);

                return {
                    original: parensMatch[0],
                    ...parsed,
                    damageType: damageMatch ? damageMatch[0].trim() : null
                };
            }
        }

        // Fall back to simple dice notation
        const parsed = this.parseDiceString(text);
        if (parsed) {
            const damageMatch = text.match(this.PATTERNS.damageType);
            return {
                original: text.trim(),
                ...parsed,
                damageType: damageMatch ? damageMatch[0].trim() : null
            };
        }

        return null;
    }

    /**
     * Parse a dice string into components
     * Handles: 1d8, 2d6+3, 1d8 + 2d6, etc.
     * @param {string} diceStr - Dice notation string
     * @returns {Object|null} Parsed components or null
     */
    static parseDiceString(diceStr) {
        if (!diceStr) return null;

        // Find all dice expressions (e.g., 1d8, 2d6)
        const diceMatches = [...diceStr.matchAll(this.PATTERNS.simpleDice)];
        if (diceMatches.length === 0) return null;

        // Handle multiple dice expressions (e.g., "1d8 + 2d6")
        if (diceMatches.length > 1) {
            return this.parseCompoundDice(diceStr, diceMatches);
        }

        // Handle single dice expression
        const [fullMatch, count, sides] = diceMatches[0];
        const multiplier = parseInt(count);
        const diceType = parseInt(sides);

        // Extract modifier if present
        const modifierMatch = diceStr.match(this.PATTERNS.modifier);
        const modifier = modifierMatch
            ? parseInt(modifierMatch[1] + modifierMatch[2])
            : 0;

        return {
            multiplier,
            diceType,
            modifier,
            isCompound: false,
            formula: this.buildFormula(multiplier, diceType, modifier)
        };
    }

    /**
     * Parse compound dice expressions (multiple dice types)
     * Example: "1d8 + 2d6" or "1d8 + 3"
     * @param {string} diceStr - Full dice string
     * @param {Array} diceMatches - Array of regex matches for dice
     * @returns {Object} Parsed compound dice data
     */
    static parseCompoundDice(diceStr, diceMatches) {
        const rolls = diceMatches.map(match => ({
            multiplier: parseInt(match[1]),
            diceType: parseInt(match[2])
        }));

        // Extract any flat modifier
        const modifierMatch = diceStr.match(/([+\-])\s*(\d+)(?!\s*d)/);
        const flatModifier = modifierMatch
            ? parseInt(modifierMatch[1] + modifierMatch[2])
            : 0;

        return {
            isCompound: true,
            rolls,
            modifier: flatModifier,
            formula: this.buildCompoundFormula(rolls, flatModifier),
            // For backward compatibility, use first roll as primary
            multiplier: rolls[0].multiplier,
            diceType: rolls[0].diceType
        };
    }

    /**
     * Build formula string from components
     * @param {number} multiplier - Number of dice
     * @param {number} diceType - Dice sides
     * @param {number} modifier - Modifier value
     * @returns {string} Formula string (e.g., "2d8+3")
     */
    static buildFormula(multiplier, diceType, modifier) {
        let formula = `${multiplier}d${diceType}`;
        if (modifier !== 0) {
            formula += modifier > 0 ? `+${modifier}` : `${modifier}`;
        }
        return formula;
    }

    /**
     * Build formula string for compound dice
     * @param {Array} rolls - Array of {multiplier, diceType} objects
     * @param {number} modifier - Flat modifier
     * @returns {string} Formula string
     */
    static buildCompoundFormula(rolls, modifier) {
        let formula = rolls.map(r => `${r.multiplier}d${r.diceType}`).join(' + ');
        if (modifier !== 0) {
            formula += modifier > 0 ? ` + ${modifier}` : ` ${modifier}`;
        }
        return formula;
    }

    /**
     * Find all dice notations in a text block
     * @param {string} text - Text to search
     * @returns {Array} Array of parsed dice objects with positions
     */
    static findAllDiceInText(text) {
        if (!text || typeof text !== 'string') return [];

        const candidates = [];
        const patterns = [
            // Pattern 1: Average with dice and damage type
            // "7 (1d8 + 3) piercing damage"
            /(\d+\s*\([^)]*\d+d\d+[^)]*\)(?:\s+[a-z]+(?:\s+damage)?)?)/gi,

            // Pattern 2: Just dice in parentheses with possible damage type
            // "(1d8 + 3) slashing"
            /(\([^)]*\d+d\d+[^)]*\)(?:\s+[a-z]+(?:\s+damage)?)?)/gi,

            // Pattern 3: Simple dice with damage type
            // "1d6 fire damage"
            /(\d+d\d+(?:\s*[+\-]\s*\d+)?(?:\s+[a-z]+(?:\s+damage)?)?)/gi
        ];

        // Collect all matches from all patterns
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const matchText = match[0].trim();
                const position = match.index;
                const endPosition = position + matchText.length;

                const parsed = this.parseDiceExpression(matchText);
                if (parsed) {
                    candidates.push({
                        text: matchText,
                        position,
                        endPosition,
                        ...parsed
                    });
                }
            }
        }

        // Remove overlapping matches, keeping the longest/most specific ones
        const results = this.deduplicateOverlappingMatches(candidates);

        // Sort by position
        return results.sort((a, b) => a.position - b.position);
    }

    /**
     * Remove overlapping matches, preferring longer/more complete matches
     * @param {Array} candidates - Array of candidate matches with position info
     * @returns {Array} Deduplicated array of matches
     */
    static deduplicateOverlappingMatches(candidates) {
        if (candidates.length === 0) return [];

        // Sort by position, then by length (longest first)
        const sorted = candidates.sort((a, b) => {
            if (a.position !== b.position) {
                return a.position - b.position;
            }
            return b.text.length - a.text.length;
        });

        const results = [];
        const usedRanges = [];

        for (const candidate of sorted) {
            // Check if this candidate overlaps with any already-selected match
            const overlaps = usedRanges.some(range => {
                return (candidate.position >= range.start && candidate.position < range.end) ||
                       (candidate.endPosition > range.start && candidate.endPosition <= range.end) ||
                       (candidate.position <= range.start && candidate.endPosition >= range.end);
            });

            if (!overlaps) {
                results.push(candidate);
                usedRanges.push({
                    start: candidate.position,
                    end: candidate.endPosition
                });
            }
        }

        return results;
    }
}

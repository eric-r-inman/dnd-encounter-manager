/**
 * HTML Utilities - Shared rendering utilities
 *
 * Provides common HTML generation, sanitization, and formatting utilities
 * used across all renderer modules with XSS prevention.
 *
 * @module renderers/html-utils
 * @version 1.1.0
 */

import { Sanitizer } from '../utils/validation.js';

/**
 * Escape HTML special characters to prevent XSS attacks
 *
 * This function sanitizes user input by converting special characters
 * that have meaning in HTML to their HTML entity equivalents.
 *
 * @param {string|number|null|undefined} text - Text to escape
 * @returns {string} Escaped HTML-safe text
 *
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 */
export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    if (typeof text === 'number') return String(text);
    if (typeof text !== 'string') return '';

    // Use centralized sanitizer for consistency
    return Sanitizer.escapeHtml(text);
}

/**
 * Format ability modifier with + or - sign
 * @param {number} modifier - Modifier value
 * @returns {string} Formatted modifier (e.g., "+3", "-1")
 */
export function formatModifier(modifier) {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 * @param {number|string} num - Number to get suffix for
 * @returns {string} Number with ordinal suffix
 */
export function getOrdinalSuffix(num) {
    const n = parseInt(num);
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Calculate ability modifier from ability score
 * @param {number} score - Ability score (1-30)
 * @returns {number} Modifier value
 */
export function calculateModifier(score) {
    return Math.floor((score - 10) / 2);
}

/**
 * Wrap text content in HTML element
 * @param {string} tag - HTML tag name
 * @param {string} content - Content to wrap
 * @param {Object} attributes - Optional attributes (e.g., {class: 'my-class', id: 'my-id'})
 * @returns {string} HTML string
 */
export function wrapInTag(tag, content, attributes = {}) {
    const attrs = Object.entries(attributes)
        .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
        .join(' ');

    const attrString = attrs ? ` ${attrs}` : '';
    return `<${tag}${attrString}>${content}</${tag}>`;
}

/**
 * Create an HTML paragraph element
 * @param {string} content - Paragraph content
 * @param {Object} attributes - Optional attributes
 * @returns {string} HTML paragraph
 */
export function createParagraph(content, attributes = {}) {
    return wrapInTag('p', content, attributes);
}

/**
 * Create a labeled value display (e.g., "AC 15", "HP 45")
 * @param {string} label - Label text
 * @param {string|number} value - Value to display
 * @returns {string} HTML string with strong label
 */
export function createLabeledValue(label, value) {
    return `<p><strong>${escapeHtml(label)}</strong> ${escapeHtml(String(value))}</p>`;
}

/**
 * Split text into paragraphs and wrap each in <p> tags
 * @param {string} text - Text with newlines
 * @returns {string} HTML paragraphs
 */
export function textToParagraphs(text) {
    return text
        .split('\n')
        .filter(line => line.trim())
        .map(line => createParagraph(escapeHtml(line)))
        .join('');
}

/**
 * Create a styled action/trait entry (bold italic name followed by description)
 * @param {string} name - Action/trait name
 * @param {string} description - Description text
 * @param {Object} options - Optional settings
 * @param {string} options.suffix - Suffix after name (default: ".")
 * @param {boolean} options.bold - Make name bold (default: true)
 * @param {boolean} options.italic - Make name italic (default: true)
 * @returns {string} HTML paragraph
 */
export function createActionEntry(name, description, options = {}) {
    const { suffix = '.', bold = true, italic = true } = options;

    let nameHtml = escapeHtml(name) + suffix;
    if (italic) nameHtml = `<em>${nameHtml}</em>`;
    if (bold) nameHtml = `<strong>${nameHtml}</strong>`;

    return `<p>${nameHtml} ${escapeHtml(description)}</p>`;
}

/**
 * Create a section heading
 * @param {string} text - Heading text
 * @param {number} level - Heading level (1-6)
 * @param {Object} attributes - Optional attributes
 * @returns {string} HTML heading
 */
export function createHeading(text, level = 4, attributes = {}) {
    const defaultClass = 'stat-block-heading';
    const attrs = {
        class: attributes.class || defaultClass,
        ...attributes
    };
    return wrapInTag(`h${level}`, escapeHtml(text), attrs);
}

/**
 * Build ability scores table HTML
 * @param {Object} abilities - Abilities object with STR, DEX, CON, INT, WIS, CHA
 * @returns {string} HTML table
 */
export function buildAbilityScoresTable(abilities) {
    if (!abilities) return '';

    const abilityNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

    let html = '<table class="ability-scores-table"><thead><tr>';
    abilityNames.forEach(ability => {
        html += `<th>${ability}</th>`;
    });
    html += '</tr></thead><tbody><tr>';

    abilityNames.forEach(ability => {
        const score = abilities[ability.toLowerCase()] || 10;
        const modifier = calculateModifier(score);
        html += `<td>${score} (${formatModifier(modifier)})</td>`;
    });

    html += '</tr></tbody></table>';
    return html;
}

/**
 * Format speed object into readable text
 * @param {Object} speed - Speed object with walk, fly, swim, etc.
 * @returns {string} Formatted speed text
 */
export function formatSpeed(speed) {
    if (!speed) return '';

    const speeds = [];
    if (speed.walk) speeds.push(`${speed.walk} ft.`);
    if (speed.burrow) speeds.push(`burrow ${speed.burrow} ft.`);
    if (speed.climb) speeds.push(`climb ${speed.climb} ft.`);
    if (speed.fly) {
        const flySpeed = `fly ${speed.fly} ft.${speed.hover ? ' (hover)' : ''}`;
        speeds.push(flySpeed);
    }
    if (speed.swim) speeds.push(`swim ${speed.swim} ft.`);

    return speeds.join(', ');
}

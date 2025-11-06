/**
 * Dice Link Converter Utility
 *
 * Converts dice notation in HTML text to clickable links
 * that trigger dice rolls in the dice roller module.
 *
 * Features:
 * - Finds all dice notations in text
 * - Replaces them with clickable spans
 * - Preserves surrounding HTML structure
 * - Attaches data attributes for roll parameters
 *
 * @module DiceLinkConverter
 * @version 1.0.0
 */

import { DiceParser } from './dice-parser.js';

export class DiceLinkConverter {
    /**
     * Convert dice notation in HTML text to clickable links
     * @param {string} htmlText - HTML text containing dice notation
     * @returns {string} HTML with dice notation converted to clickable spans
     */
    static convertDiceToLinks(htmlText) {
        if (!htmlText || typeof htmlText !== 'string') return htmlText;

        // Create a temporary DOM element to parse HTML properly
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;

        // Process all text nodes in the DOM tree
        this.processTextNodes(tempDiv);

        return tempDiv.innerHTML;
    }

    /**
     * Recursively process text nodes in a DOM tree
     * @param {Node} node - DOM node to process
     */
    static processTextNodes(node) {
        // If this is a text node, process it
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const diceRolls = DiceParser.findAllDiceInText(text);

            if (diceRolls.length > 0) {
                // Create a document fragment with converted text
                const fragment = this.createFragmentWithDiceLinks(text, diceRolls);
                node.parentNode.replaceChild(fragment, node);
            }
            return;
        }

        // Skip dice-roll-link elements to avoid double-processing
        if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('dice-roll-link')) {
            return;
        }

        // Recursively process child nodes
        // Convert to array to avoid issues with live NodeList during modification
        const children = Array.from(node.childNodes);
        children.forEach(child => this.processTextNodes(child));
    }

    /**
     * Create a document fragment with dice notation converted to links
     * @param {string} text - Original text
     * @param {Array} diceRolls - Array of parsed dice with positions
     * @returns {DocumentFragment} Fragment with converted elements
     */
    static createFragmentWithDiceLinks(text, diceRolls) {
        const fragment = document.createDocumentFragment();

        // Sort by position
        const sorted = [...diceRolls].sort((a, b) => a.position - b.position);

        let lastIndex = 0;

        for (const dice of sorted) {
            // Add text before this dice notation
            if (dice.position > lastIndex) {
                const beforeText = text.substring(lastIndex, dice.position);
                fragment.appendChild(document.createTextNode(beforeText));
            }

            // Add dice link span
            const span = this.createClickableSpanElement(dice);
            fragment.appendChild(span);

            lastIndex = dice.position + dice.text.length;
        }

        // Add remaining text after last dice notation
        if (lastIndex < text.length) {
            const afterText = text.substring(lastIndex);
            fragment.appendChild(document.createTextNode(afterText));
        }

        return fragment;
    }

    /**
     * Create a clickable span element for a dice roll
     * @param {Object} dice - Parsed dice data
     * @returns {HTMLElement} Span element with dice roll data
     */
    static createClickableSpanElement(dice) {
        const span = document.createElement('span');
        span.className = 'dice-roll-link';
        span.textContent = dice.text;

        // Set data attributes
        span.dataset.multiplier = String(dice.multiplier || 1);
        span.dataset.diceType = String(dice.diceType);
        span.dataset.modifier = String(dice.modifier || 0);
        span.dataset.formula = dice.formula || '';
        span.dataset.damageType = dice.damageType || '';
        span.dataset.isCompound = String(dice.isCompound || false);
        span.dataset.action = 'roll-dice-from-stat-block';

        // If compound, store the roll data
        if (dice.isCompound && dice.rolls) {
            span.dataset.rolls = JSON.stringify(dice.rolls);
        }

        return span;
    }

    /**
     * Create a clickable span for a dice roll (HTML string version)
     * @param {Object} dice - Parsed dice data
     * @returns {string} HTML span element
     * @deprecated Use createClickableSpanElement instead
     */
    static createClickableSpan(dice) {
        // Encode data for HTML attributes
        const data = {
            multiplier: dice.multiplier || 1,
            diceType: dice.diceType,
            modifier: dice.modifier || 0,
            formula: dice.formula,
            damageType: dice.damageType || '',
            isCompound: dice.isCompound || false
        };

        // If compound, store the roll data
        if (dice.isCompound && dice.rolls) {
            data.rolls = JSON.stringify(dice.rolls);
        }

        // Build data attributes - use simple string escaping for attributes
        const dataAttrs = Object.entries(data)
            .map(([key, value]) => `data-${this.camelToKebab(key)}="${this.escapeAttribute(String(value))}"`)
            .join(' ');

        // Escape the display text
        const escapedText = this.escapeAttribute(dice.text);

        return `<span class="dice-roll-link" ${dataAttrs} data-action="roll-dice-from-stat-block">${escapedText}</span>`;
    }

    /**
     * Convert dice notation in a DOM element
     * Modifies the element's innerHTML in place
     * @param {HTMLElement} element - DOM element to process
     */
    static convertDiceInElement(element) {
        if (!element) return;

        const original = element.innerHTML;
        const converted = this.convertDiceToLinks(original);

        if (converted !== original) {
            element.innerHTML = converted;
        }
    }

    /**
     * Convert dice notation in multiple DOM elements
     * @param {string} selector - CSS selector for elements to process
     * @param {HTMLElement} container - Container to search within (default: document)
     */
    static convertDiceInElements(selector, container = document) {
        const elements = container.querySelectorAll(selector);
        elements.forEach(el => this.convertDiceInElement(el));
    }

    /**
     * Convert camelCase to kebab-case
     * @param {string} str - CamelCase string
     * @returns {string} Kebab-case string
     */
    static camelToKebab(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Escape HTML special characters for attribute values
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeAttribute(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Extract roll data from a clicked dice link element
     * @param {HTMLElement} element - Clicked dice link element
     * @returns {Object} Roll data object
     */
    static extractRollData(element) {
        return {
            multiplier: parseInt(element.dataset.multiplier) || 1,
            diceType: parseInt(element.dataset.diceType),
            modifier: parseInt(element.dataset.modifier) || 0,
            formula: element.dataset.formula || '',
            damageType: element.dataset.damageType || '',
            isCompound: element.dataset.isCompound === 'true',
            rolls: element.dataset.rolls ? JSON.parse(element.dataset.rolls) : null,
            originalText: element.textContent
        };
    }
}

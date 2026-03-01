/**
 * Application Constants
 *
 * Centralized configuration and magic strings used throughout the application.
 * This improves maintainability and prevents typos in string literals.
 *
 * @version 1.0.0
 */

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * Keys used for localStorage and sessionStorage
 */
export const STORAGE_KEYS = {
    // LocalStorage keys
    COMBATANT_INSTANCES: 'dnd-combatant-instances',
    CREATURE_DATABASE: 'dnd-creature-database',  // Working creature database (unified system v2.0+)
    CUSTOM_CREATURES: 'dnd-custom-creatures',    // @deprecated v2.0 - Use CREATURE_DATABASE instead
    HIDDEN_CREATURES: 'dnd-hidden-creatures',
    RECENT_EFFECTS: 'recentEffects',

    // SessionStorage keys
    EDITING_CREATURE_ID: 'editing-creature-id'  // @deprecated v2.0 - No longer used
};

// ============================================================================
// Modal Names
// ============================================================================

/**
 * Modal identifiers used with ModalSystem
 */
export const MODAL_NAMES = {
    ADD_COMBATANT: 'add-combatant',
    COMBATANT_NOTE: 'combatant-note',
    CONDITION: 'condition',
    CREATURE_DATABASE: 'creature-database',
    CREATURE_FORM: 'creature-form',
    CREATURE_TYPE_SELECTION: 'creature-type-selection',
    EFFECT: 'effect',
    HP_MODIFICATION: 'hp-modification',
    PLACEHOLDER_TIMER: 'placeholder-timer',
    PLAYER_FORM: 'player-form',
    STAT_BLOCK_PARSER: 'stat-block-parser'
};

// ============================================================================
// Timing Constants
// ============================================================================

/**
 * Timing values in milliseconds
 */
export const TIMING = {
    // Auto-save interval for combatant instances (5 seconds)
    AUTOSAVE_INTERVAL: 5000,

    // Delay between modal close and open for smooth transitions
    MODAL_TRANSITION_DELAY: 150,

    // Toast notification durations
    TOAST_SHORT: 2000,
    TOAST_LONG: 3000,
    TOAST_EXTRA_LONG: 4000,

    // Animation and debounce delays
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 250
};

// ============================================================================
// Creature Types
// ============================================================================

/**
 * Valid creature types in the system
 */
export const CREATURE_TYPES = {
    PLAYER: 'player',
    ENEMY: 'enemy',
    NPC: 'npc',
    PLACEHOLDER: 'placeholder'
};

// ============================================================================
// D&D 5e Constants
// ============================================================================

/**
 * D&D 5e character classes
 */
export const DND_CLASSES = [
    'Barbarian',
    'Bard',
    'Cleric',
    'Druid',
    'Fighter',
    'Monk',
    'Paladin',
    'Ranger',
    'Rogue',
    'Sorcerer',
    'Warlock',
    'Wizard'
];

/**
 * D&D 5e ability scores
 */
export const ABILITY_SCORES = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma'
];

/**
 * D&D 5e skills mapped to their ability scores
 */
export const SKILLS = {
    acrobatics: 'dexterity',
    animalhandling: 'wisdom',
    arcana: 'intelligence',
    athletics: 'strength',
    deception: 'charisma',
    history: 'intelligence',
    insight: 'wisdom',
    intimidation: 'charisma',
    investigation: 'intelligence',
    medicine: 'wisdom',
    nature: 'intelligence',
    perception: 'wisdom',
    performance: 'charisma',
    persuasion: 'charisma',
    religion: 'intelligence',
    sleightofhand: 'dexterity',
    stealth: 'dexterity',
    survival: 'wisdom'
};

/**
 * Skill display names for proper formatting
 */
export const SKILL_DISPLAY_NAMES = {
    acrobatics: 'Acrobatics',
    animalhandling: 'Animal Handling',
    arcana: 'Arcana',
    athletics: 'Athletics',
    deception: 'Deception',
    history: 'History',
    insight: 'Insight',
    intimidation: 'Intimidation',
    investigation: 'Investigation',
    medicine: 'Medicine',
    nature: 'Nature',
    perception: 'Perception',
    performance: 'Performance',
    persuasion: 'Persuasion',
    religion: 'Religion',
    sleightofhand: 'Sleight of Hand',
    stealth: 'Stealth',
    survival: 'Survival'
};

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default values used throughout the application
 */
export const DEFAULTS = {
    // Initiative defaults
    INITIATIVE: 1,
    PLACEHOLDER_INITIATIVE: 0,

    // Character level constraints
    MIN_LEVEL: 1,
    MAX_LEVEL: 20,

    // Combat values
    DEFAULT_AC: 10,
    DEFAULT_HP: 1,

    // Placeholder creature
    PLACEHOLDER_NAME: 'Placeholder',

    // Performance thresholds
    BATCH_UPDATE_THRESHOLD: 0.3 // Re-render all if > 30% need updates
};

// ============================================================================
// Data Paths
// ============================================================================

/**
 * File paths for data resources
 */
export const DATA_PATHS = {
    CREATURE_DATABASE: '/src/data/creatures/creature-database.json'
};

// ============================================================================
// UI Constants
// ============================================================================

/**
 * UI-related constants
 */
export const UI = {
    // Maximum line length for display
    MAX_DISPLAY_LINES: 2000,

    // Rendering constants
    MIN_COMBATANTS_FOR_FRAGMENT: 5,

    // Toast types
    TOAST_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    }
};

// ============================================================================
// Game Mechanics Constants
// ============================================================================

/**
 * Initiative value constraints
 */
export const INITIATIVE_CONSTRAINTS = {
    MIN: 0,
    MAX: 99
};

/**
 * Flying height constraints and increment
 */
export const FLYING_HEIGHT = {
    MIN: 0,
    MAX: 999,
    INCREMENT: 5
};

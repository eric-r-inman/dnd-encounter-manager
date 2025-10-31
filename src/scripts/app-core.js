import { CombatEvents } from './events/combat-events.js';

export class AppCore {
    async init() {
        console.log('📱 App Core initialized');
    }

    async initializePostDOM() {
        console.log('📱 Post-DOM initialization complete');
    }

    advanceToNextTurn() {
        // Delegate to CombatEvents module
        CombatEvents.handleNextTurn();
    }

    resetCombat() {
        // Delegate to CombatEvents module
        CombatEvents.handleResetCombat();
    }
}
/**
 * RecentItems - Recent effects and notes tracking
 *
 * Manages localStorage-based tracking of recently used effects and notes
 * to provide autocomplete suggestions in modals
 *
 * @version 1.0.0
 */

export class RecentItems {
    /**
     * Populate recent effects dropdown
     */
    static populateRecentEffectsDropdown() {
        const dropdown = document.getElementById('effect-dropdown');
        if (!dropdown) return;

        // Get recent effects from localStorage
        const recentEffects = this.getRecentEffects();

        // Clear existing options (except the first placeholder)
        while (dropdown.children.length > 1) {
            dropdown.removeChild(dropdown.lastChild);
        }

        // Add recent effects
        recentEffects.forEach(effect => {
            const option = document.createElement('option');
            option.value = effect;
            option.textContent = effect;
            dropdown.appendChild(option);
        });
    }

    /**
     * Get recent effects from localStorage
     * @returns {Array} Array of recent effect names
     */
    static getRecentEffects() {
        try {
            const stored = localStorage.getItem('recentEffects');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to load recent effects:', error);
            return [];
        }
    }

    /**
     * Populate the datalist with recent effects for suggestions
     */
    static populateRecentEffectsDatalist() {
        const datalist = document.getElementById('recent-effects-list');
        if (!datalist) return;

        const recentEffects = this.getRecentEffects();

        // Clear existing options
        datalist.innerHTML = '';

        // Add recent effects as options
        recentEffects.forEach(effect => {
            const option = document.createElement('option');
            option.value = effect;
            datalist.appendChild(option);
        });
    }

    /**
     * Add effect to recent effects list
     * @param {string} effectName - Name of the effect to add
     */
    static addToRecentEffects(effectName) {
        if (!effectName) return;

        const recentEffects = this.getRecentEffects();

        // Remove if already exists (to move to front)
        const existingIndex = recentEffects.indexOf(effectName);
        if (existingIndex !== -1) {
            recentEffects.splice(existingIndex, 1);
        }

        // Add to front
        recentEffects.unshift(effectName);

        // Limit to 12 recent effects
        const limitedEffects = recentEffects.slice(0, 12);

        // Save back to localStorage
        try {
            localStorage.setItem('recentEffects', JSON.stringify(limitedEffects));
        } catch (error) {
            console.warn('Failed to save recent effects:', error);
        }
    }

    /**
     * Get recent notes from localStorage
     * @param {string} noteType - Type of note ('name' or 'general')
     * @returns {Array} Array of recent note texts
     */
    static getRecentNotes(noteType) {
        try {
            const storageKey = noteType === 'name' ? 'recentNameNotes' : 'recentGeneralNotes';
            const stored = localStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn(`Failed to load recent ${noteType} notes:`, error);
            return [];
        }
    }

    /**
     * Populate the datalist with recent notes for suggestions
     * @param {string} noteType - Type of note ('name' or 'general')
     */
    static populateRecentNotesDatalist(noteType) {
        const datalist = document.getElementById('recent-notes-list');
        if (!datalist) return;

        const recentNotes = this.getRecentNotes(noteType);

        // Clear existing options
        datalist.innerHTML = '';

        // Add recent notes as options
        recentNotes.forEach(note => {
            const option = document.createElement('option');
            option.value = note;
            datalist.appendChild(option);
        });
    }

    /**
     * Add note to recent notes list
     * @param {string} noteText - Text of the note to add
     * @param {string} noteType - Type of note ('name' or 'general')
     */
    static addToRecentNotes(noteText, noteType) {
        if (!noteText) return;

        const storageKey = noteType === 'name' ? 'recentNameNotes' : 'recentGeneralNotes';
        const recentNotes = this.getRecentNotes(noteType);

        // Remove if already exists (to move to front)
        const existingIndex = recentNotes.indexOf(noteText);
        if (existingIndex !== -1) {
            recentNotes.splice(existingIndex, 1);
        }

        // Add to front
        recentNotes.unshift(noteText);

        // Limit to 12 recent notes
        const limitedNotes = recentNotes.slice(0, 12);

        // Save back to localStorage
        try {
            localStorage.setItem(storageKey, JSON.stringify(limitedNotes));
        } catch (error) {
            console.warn(`Failed to save recent ${noteType} notes:`, error);
        }
    }
}

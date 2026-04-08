/**
 * Services - Service Layer Coordinator
 *
 * Central hub for all service modules providing:
 * - Unified service interface
 * - Service initialization and lifecycle
 * - Cross-service coordination
 * - Service health monitoring
 * - Error handling and recovery
 * - Service dependency management
 *
 * @version 1.0.0
 */

import { CombatantService } from './combatant-service.js';
import { CombatService } from './combat-service.js';
import { StorageService } from './storage-service.js';
import { ValidationService } from './validation-service.js';
import { CalculationService } from './calculation-service.js';

export class Services {
    static isInitialized = false;
    static services = {
        combatant: CombatantService,
        combat: CombatService,
        storage: StorageService,
        validation: ValidationService,
        calculation: CalculationService
    };

    /**
     * Initialize all services
     * @returns {Promise<boolean>} Success status
     */
    static async init() {
        if (this.isInitialized) {
            console.warn('Services already initialized');
            return true;
        }

        try {
            console.log('🔧 Services initializing...');

            // Services don't require explicit initialization currently
            // but this provides a hook for future initialization needs

            this.isInitialized = true;
            console.log('✅ Services initialized successfully');

            return true;
        } catch (error) {
            console.error('❌ Failed to initialize services:', error);
            return false;
        }
    }

    /**
     * Get service by name
     * @param {string} serviceName - Name of service to get
     * @returns {Object|null} Service class or null if not found
     */
    static getService(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            console.warn(`Service not found: ${serviceName}`);
            return null;
        }
        return service;
    }

    /**
     * Check if all services are healthy
     * @returns {Promise<Object>} Health check results
     */
    static async healthCheck() {
        const results = {
            overall: 'healthy',
            services: {},
            timestamp: new Date().toISOString()
        };

        let hasErrors = false;

        // Check each service
        for (const [name, service] of Object.entries(this.services)) {
            try {
                // Basic functionality test for each service
                const health = await this.checkServiceHealth(name, service);
                results.services[name] = health;

                if (health.status !== 'healthy') {
                    hasErrors = true;
                }
            } catch (error) {
                results.services[name] = {
                    status: 'error',
                    error: error.message
                };
                hasErrors = true;
            }
        }

        results.overall = hasErrors ? 'degraded' : 'healthy';
        return results;
    }

    /**
     * Check individual service health
     * @param {string} name - Service name
     * @param {Object} service - Service class
     * @returns {Promise<Object>} Service health status
     * @private
     */
    static async checkServiceHealth(name, service) {
        const health = { status: 'healthy', checks: [] };

        switch (name) {
            case 'combatant':
                // Test basic combatant operations
                try {
                    const testData = { name: 'Test', type: 'enemy', initiative: 10, ac: 10, maxHP: 1, currentHP: 1, tempHP: 0 };
                    const validation = ValidationService.validateCombatant(testData);
                    health.checks.push({ name: 'validation', status: validation.isValid ? 'pass' : 'fail' });
                } catch (error) {
                    health.status = 'error';
                    health.checks.push({ name: 'validation', status: 'error', error: error.message });
                }
                break;

            case 'combat':
                // Test combat state validation
                try {
                    const stats = service.getCombatStats();
                    health.checks.push({ name: 'stats', status: stats ? 'pass' : 'fail' });
                } catch (error) {
                    health.status = 'error';
                    health.checks.push({ name: 'stats', status: 'error', error: error.message });
                }
                break;

            case 'storage':
                // Test storage operations
                try {
                    const info = await service.getStorageInfo();
                    health.checks.push({ name: 'storage_access', status: info ? 'pass' : 'fail' });
                } catch (error) {
                    health.status = 'error';
                    health.checks.push({ name: 'storage_access', status: 'error', error: error.message });
                }
                break;

            case 'validation':
                // Test validation functions
                try {
                    const result = service.validateCombatant({ name: 'Test' });
                    health.checks.push({ name: 'combatant_validation', status: result ? 'pass' : 'fail' });
                } catch (error) {
                    health.status = 'error';
                    health.checks.push({ name: 'combatant_validation', status: 'error', error: error.message });
                }
                break;

            case 'calculation':
                // Test calculation functions
                try {
                    const testCombatant = { currentHP: 10, maxHP: 20, tempHP: 5 };
                    const result = service.calculateDamage(testCombatant, 3);
                    health.checks.push({ name: 'damage_calculation', status: result ? 'pass' : 'fail' });
                } catch (error) {
                    health.status = 'error';
                    health.checks.push({ name: 'damage_calculation', status: 'error', error: error.message });
                }
                break;
        }

        return health;
    }

    /**
     * Get service usage statistics
     * @returns {Object} Usage statistics
     */
    static getUsageStats() {
        return {
            initialized: this.isInitialized,
            serviceCount: Object.keys(this.services).length,
            availableServices: Object.keys(this.services),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Destroy all services
     */
    static destroy() {
        console.log('🔧 Destroying services...');

        // Services don't require explicit cleanup currently
        // but this provides a hook for future cleanup needs

        this.isInitialized = false;
        console.log('✅ Services destroyed');
    }

    // Convenience getters for direct service access
    static get combatant() {
        return this.services.combatant;
    }

    static get combat() {
        return this.services.combat;
    }

    static get storage() {
        return this.services.storage;
    }

    static get validation() {
        return this.services.validation;
    }

    static get calculation() {
        return this.services.calculation;
    }
}

// Export individual services for direct import
export { CombatantService } from './combatant-service.js';
export { CombatService } from './combat-service.js';
export { StorageService } from './storage-service.js';
export { ValidationService } from './validation-service.js';
export { CalculationService } from './calculation-service.js';
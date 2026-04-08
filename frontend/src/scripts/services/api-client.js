/**
 * ApiClient - Thin wrapper around fetch() for communicating with the Rust server API.
 *
 * All data persistence goes through this client instead of localStorage.
 *
 * @module services/api-client
 */

export class ApiClient {
    static BASE_URL = '/api';

    /**
     * GET request
     * @param {string} path - API path (e.g., '/creatures')
     * @returns {Promise<any>} Parsed JSON response
     */
    static async get(path) {
        const response = await fetch(`${this.BASE_URL}${path}`);
        if (!response.ok) {
            throw new Error(`API GET ${path} failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * POST request
     * @param {string} path - API path
     * @param {any} data - Request body (will be JSON-serialized)
     * @returns {Promise<any>} Parsed JSON response
     */
    static async post(path, data) {
        const response = await fetch(`${this.BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`API POST ${path} failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * PUT request
     * @param {string} path - API path
     * @param {any} data - Request body (will be JSON-serialized)
     * @returns {Promise<any>} Parsed JSON response
     */
    static async put(path, data) {
        const response = await fetch(`${this.BASE_URL}${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`API PUT ${path} failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * DELETE request
     * @param {string} path - API path
     * @returns {Promise<boolean>} true on success
     */
    static async delete(path) {
        const response = await fetch(`${this.BASE_URL}${path}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`API DELETE ${path} failed: ${response.status} ${response.statusText}`);
        }
        return true;
    }

    /**
     * Fire-and-forget beacon for beforeunload saves.
     * @param {string} path - API path
     * @param {any} data - Request body
     * @returns {boolean} Whether the beacon was queued
     */
    static beacon(path, data) {
        return navigator.sendBeacon(
            `${this.BASE_URL}${path}`,
            new Blob([JSON.stringify(data)], { type: 'application/json' })
        );
    }
}

import { execSync } from 'child_process';

const packageManager = {
    /**
     * List of package managers
     */
    managers: [
        { name: 'npm', installCmd: 'npm install', runCmd: 'npm run' },
        { name: 'yarn', installCmd: 'yarn install', runCmd: 'yarn run' },
        { name: 'pnpm', installCmd: 'pnpm install', runCmd: 'pnpm run' },
        { name: 'bun', installCmd: 'bun install', runCmd: 'bun run' },
        { name: 'deno', installCmd: 'deno install', runCmd: 'deno run' },
    ],

    /**
     * Detect package manager installed in the system
     * @param {string} packageName
     * @returns {boolean}
     */
    detect: (packageName) => {
        try {
            execSync(`${packageName} --version`, { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    },

    getManagerNames: () => {
        return packageManager.managers.map((pm) => pm.name);
    },

    getManagerByName: (name) => {
        const manager = packageManager.managers.find((pm) => pm.name === name) || null;
        const isIntsalled = packageManager.detect(name);
        if (!isIntsalled) {
            throw new Error(`${name} is not installed. Please install it first.`);
        }
        return manager;
    },
};

export default packageManager;

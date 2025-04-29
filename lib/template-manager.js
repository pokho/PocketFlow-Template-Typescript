import path from 'path';
import fs from 'fs-extra';

const templateManager = {
    /**
     * Get available templates names
     * @param {string} templatesDir
     * @returns {string[]} available templates names
     */
    getAvailableTemplates: (templatesDir) => {
        try {
            return fs.readdirSync(templatesDir).filter((file) => {
                return fs.statSync(path.join(templatesDir, file)).isDirectory();
            });
        } catch (error) {
            return [];
        }
    },

    /**
     * Copy template to target directory
     * @param {string} templatePath
     * @param {string} targetDir
     * @returns {Promise<void>}
     */
    copyTemplate: async (templatePath, targetDir) => {
        return await fs.copy(templatePath, targetDir);
    },

    /**
     * Update package.json in target directory
     * @param {string} targetDir
     * @param {Object} updates fields to update in package.json
     * @returns {Promise<void>}
     */
    updatePackageJson: async (targetDir, updates) => {
        const pkgJsonPath = path.join(targetDir, 'package.json');

        if (await fs.pathExists(pkgJsonPath)) {
            const pkgJson = await fs.readJson(pkgJsonPath);
            const updatedPkgJson = { ...pkgJson, ...updates };
            await fs.writeJson(pkgJsonPath, updatedPkgJson, { spaces: 2 });
        }
    },
};

export default templateManager;

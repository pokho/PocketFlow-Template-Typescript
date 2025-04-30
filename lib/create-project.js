import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import logger from './utils/logger.js';
import templateManager from './template-manager.js';
import { formatAvailableTemplates } from './utils/format.js';
import pakageManager from './package-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a new project
 * @param {string} projectDir Project Dir and Project Name
 * @returns {Promise<void>}
 */
async function createProject(projectDir) {
    try {
        // Ask for project name if not provided
        if (!projectDir) {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'projectDir',
                    message: 'What is your project named?',
                    default: 'my-pocketflow-app',
                },
            ]);
            projectDir = answers.projectDir;
        }

        const targetDir = path.resolve(process.cwd(), projectDir);

        // Check if directory exists
        if (fs.existsSync(targetDir)) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: `Directory ${projectDir} already exists. Do you want to overwrite it?`,
                    default: false,
                },
            ]);

            if (!overwrite) {
                logger.error('Operation cancelled');
                process.exit(1);
            }

            await fs.remove(targetDir);
        }

        // Create project directory
        await fs.ensureDir(targetDir);

        // Select package manager
        const { packageName } = await inquirer.prompt([
            {
                type: 'list',
                name: 'packageName',
                message: 'Select a package manager:',
                choices: pakageManager.getManagerNames(),
                default: 'npm',
            },
        ]);

        const selectedPackageManager = pakageManager.getManagerByName(packageName);

        // Select template
        const templatesDir = path.resolve(__dirname, '../template');
        const { template } = await inquirer.prompt([
            {
                type: 'list',
                name: 'template',
                message: 'Select a template:',
                choices: formatAvailableTemplates(templateManager.getAvailableTemplates(templatesDir)),
                default: 'typescript',
            },
        ]);

        // Copy template
        const templateDir = path.join(templatesDir, template);
        logger.info(`Creating a new PocketFlow project in ${chalk.green(targetDir)}...\n`);

        await templateManager.copyTemplate(templateDir, targetDir);

        // Update package.json in the new project
        await templateManager.updatePackageJson(targetDir, {
            name: projectDir.toLowerCase().replace(/\s+/g, '-'),
        });

        // Update package scripts in the new project
        await templateManager.updatePackageScripts(targetDir, selectedPackageManager);

        logger.success(`Created ${chalk.cyan(projectDir)} at ${chalk.cyan(targetDir)}\n`);

        logger.log('Inside that directory, you can run several commands:\n');
        logger.command(selectedPackageManager.installCmd, 'Install the dependencies\n');
        logger.command(`${selectedPackageManager.runCmd} dev`, 'Start the development server\n');

        logger.log('We suggest that you begin by typing:\n');
        logger.command(`cd ${chalk.reset(projectDir)}`);
        logger.command(selectedPackageManager.installCmd);
        logger.command(`${selectedPackageManager.runCmd} dev`);
        logger.log('');

        logger.log('Happy coding!');
    } catch (error) {
        logger.error(error.message);
        process.exit(1);
    }
}

export default createProject;

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import logger from './utils/logger.js';

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
                default: 'my-pocketflow-app'
            }
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
                default: false
            }
        ]);

        if (!overwrite) {
            logger.error('Operation cancelled');
            process.exit(1);
        }

        await fs.remove(targetDir);
    }

    // Create project directory
    await fs.ensureDir(targetDir);

    // Copy template
    const templateDir = path.resolve(__dirname, '../template/typescript');
    logger.info(`Creating a new PocketFlow project in ${chalk.green(targetDir)}...\n`);

    await fs.copy(templateDir, targetDir);

    // Update package.json in the new project
    const pkgJsonPath = path.join(targetDir, 'package.json');
    const pkgJson = await fs.readJson(pkgJsonPath);
    pkgJson.name = projectDir.toLowerCase().replace(/\s+/g, '-');
    await fs.writeJson(pkgJsonPath, pkgJson, { spaces: 2 });

    logger.succuss(`Created ${chalk.cyan(projectDir)} at ${chalk.cyan(targetDir)}\n`);
    logger.log('Inside that directory, you can run several commands:\n');
    logger.command('npm install', 'Install the dependencies\n');
    logger.command('npm run dev', 'Start the development server\n');
    logger.log('We suggest that you begin by typing:\n');
    logger.command(`cd ${chalk.reset(projectDir)}`);
    logger.command('npm install');
    logger.command('npm run dev');
    logger.log('');
    logger.log('Happy coding!');
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

export default createProject
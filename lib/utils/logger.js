import chalk from 'chalk';

const logger = {
    log: (message) => {
        console.log(message);
    },

    info: (message) => {
        console.log(chalk.blue('Info: '), message);
    },

    succuss: (message) => {
        console.log(chalk.green('Success!'), message);
    },

    error: (message) => {
        console.log(chalk.red('Error:'), message);
    },

    warn: (message) => {
        console.log(chalk.yellow('Warning:'), message);
    },

    /**
     * log a command and its description
     * @param {string} command
     * @param {string} description - the description of the command, optional
     */
    command: (command, description) => {
        console.log(chalk.cyan(`  ${command}`));
        description && console.log(`    ${description}`);
    },
};

export default logger;

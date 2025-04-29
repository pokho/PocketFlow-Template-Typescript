#!/usr/bin/env node
import { program } from 'commander';
import { createProject } from '../lib/index.js'

program
    .name('create-pocketflow')
    .description('Create a new PocketFlow project')
    .argument('[project-directory]', 'Project directory name')
    .action(async (projectDir) => {
        await createProject(projectDir);
    });

program.parse(process.argv); 
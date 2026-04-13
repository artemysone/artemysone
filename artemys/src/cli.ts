#!/usr/bin/env node

import { program, Option } from 'commander';
import { setJsonMode } from './output.js';
import { login, verify, logout, whoami } from './auth.js';
import { listTags } from './commands/tags.js';
import { listProjects } from './commands/list.js';
import { createProject } from './commands/create.js';
import { updateProject } from './commands/update.js';
import { deleteProject } from './commands/delete.js';

program
  .name('artemys')
  .description('Create and manage projects on Artemys')
  .version('0.1.0')
  .option('--json', 'Output JSON instead of human-readable text')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.optsWithGlobals();
    if (opts.json) setJsonMode(true);
  });

program
  .command('login')
  .description('Authenticate with Artemys (sends a login code to your email)')
  .requiredOption('--email <email>', 'Your email address')
  .option('--password <password>', 'Your password (if using password auth)')
  .action(async (opts) => {
    await login(opts.email, opts.password);
  });

program
  .command('verify')
  .description('Complete login with the magic link or code from your email')
  .option('--link <url>', 'The magic link URL from your email')
  .option('--email <email>', 'Your email address (for OTP code)')
  .option('--token <token>', 'The 6-digit code from your email')
  .action(async (opts) => {
    await verify(opts);
  });

program
  .command('logout')
  .description('Clear stored session')
  .action(async () => {
    await logout();
  });

program
  .command('whoami')
  .description('Show current user profile')
  .action(async () => {
    await whoami();
  });

program
  .command('tags')
  .description('List available tags')
  .action(async () => {
    await listTags();
  });

program
  .command('list')
  .description('List your projects')
  .action(async () => {
    await listProjects();
  });

program
  .command('create')
  .description('Create a new project')
  .requiredOption('--title <title>', 'Project title')
  .requiredOption('--description <description>', 'Project description')
  .option('--media <path>', 'Local media file to upload')
  .addOption(new Option('--media-format <format>', 'video or gallery').choices(['video', 'gallery']).default('gallery'))
  .option('--demo-url <url>', 'Demo URL')
  .option('--repo-url <url>', 'Repository URL')
  .option('--tech-stack <items>', 'Comma-separated tech stack')
  .option('--tags <names>', 'Comma-separated tag names')
  .action(async (opts) => {
    await createProject(opts);
  });

program
  .command('update <id>')
  .description('Update an existing project')
  .option('--title <title>', 'New title')
  .option('--description <description>', 'New description')
  .option('--media <path>', 'New media file to upload')
  .addOption(new Option('--media-format <format>', 'video or gallery').choices(['video', 'gallery']))
  .option('--demo-url <url>', 'Demo URL')
  .option('--repo-url <url>', 'Repository URL')
  .option('--tech-stack <items>', 'Comma-separated tech stack')
  .option('--tags <names>', 'Comma-separated tag names')
  .action(async (id, opts) => {
    await updateProject(id, opts);
  });

program
  .command('delete <id>')
  .description('Delete a project')
  .action(async (id) => {
    await deleteProject(id);
  });

program.parse();

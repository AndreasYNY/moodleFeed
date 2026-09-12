#!/usr/bin/env bun

import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createMoodleServer } from './server';

async function main() {
  const server = createMoodleServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

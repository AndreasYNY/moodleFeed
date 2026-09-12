# Moodle MCP Server

Standalone MCP (Model Context Protocol) server that exposes Moodle web service operations as AI-callable tools. Built with TypeScript + Bun.

## Features

19 tools covering all Moodle web service operations:

| Tool | Description |
|------|-------------|
| `login` | Authenticate and get a web service token |
| `site_info` | Get current user and site info |
| `courses` | List enrolled courses |
| `assignments` | Get assignments for courses |
| `completion` | Get completion status (single course) |
| `completions` | Get completion status (multiple courses) |
| `forums` | Get forums for courses |
| `lessons` | Get lessons for courses |
| `lesson_access_info` | Get lesson access control info |
| `discussions` | Get forum discussions |
| `discussions_for_forums` | Get discussions for multiple forums |
| `posts` | Get discussion posts |
| `posts_for_discussions` | Get posts for multiple discussions |
| `reply` | Reply to a discussion post |
| `update_post` | Edit a discussion post |
| `unused_draft_item_id` | Get draft item ID for uploads |
| `submit_assignment` | Submit an assignment |
| `assignment_submission_status` | Check submission status |
| `assignment_submission_statuses` | Check statuses for multiple assignments |

## Installation

```bash
bun install
```

## Usage

### Run directly

```bash
bun run src/index.ts
```

### Set environment variables (optional defaults)

```bash
export MOODLE_BASE_URL=https://your-moodle-instance.com
export MOODLE_TOKEN=your-webservice-token
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/moodle-mcp-server/src/index.ts"],
      "env": {
        "MOODLE_BASE_URL": "https://elearning.ut.ac.id",
        "MOODLE_TOKEN": "your-webservice-token"
      }
    }
  }
}
```

### Authentication

Every tool accepts optional `baseUrl` and `token` parameters. Resolution order:
1. Per-request argument
2. `MOODLE_BASE_URL` / `MOODLE_TOKEN` environment variable
3. Error if neither provided

The `login` tool is the only exception — it takes `baseUrl`, `username`, and `password` to generate a token.

## Development

```bash
bun run dev        # Watch mode
bun run build      # Compile to standalone binary
bun run lint       # Type check
```

## Architecture

```
src/
├── index.ts        # Entry point (stdio transport)
├── server.ts       # MCP tool definitions
├── moodle.ts       # Moodle API wrapper
├── types.ts        # TypeScript interfaces
└── validation.ts   # URL validation & auth resolution
```

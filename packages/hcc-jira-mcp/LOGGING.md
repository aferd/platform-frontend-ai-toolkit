# JIRA MCP Server Logging

All server logs are written to OS-appropriate system log locations instead of console output.

## Log File Location

Logs are stored in system-standard locations based on your operating system:

- **macOS**: `~/Library/Logs/hcc-jira-mcp/jira-mcp.log`
- **Linux**: `~/.local/share/hcc-jira-mcp/logs/jira-mcp.log`
- **Windows**: `%APPDATA%\hcc-jira-mcp\logs\jira-mcp.log`

## Log Rotation

- Maximum log file size: 5MB
- When the log file exceeds 5MB, it's automatically rotated with a timestamp
- Up to 3 backup log files are kept
- Older backup files are automatically deleted

## Log Format

Each log entry includes:
- Timestamp (ISO 8601 format)
- Log level (INFO, ERROR, WARN)
- Message content

Example:
```
[2026-01-23T10:30:45.123Z] [INFO] ✓ Using JIRA credentials from environment variables
[2026-01-23T10:30:46.456Z] [ERROR] Failed to connect to JIRA: Network error
```

## Viewing Logs

To view logs in real-time:

**macOS:**
```bash
tail -f ~/Library/Logs/hcc-jira-mcp/jira-mcp.log
```

**Linux:**
```bash
tail -f ~/.local/share/hcc-jira-mcp/logs/jira-mcp.log
```

**Windows (PowerShell):**
```powershell
Get-Content "$env:APPDATA\hcc-jira-mcp\logs\jira-mcp.log" -Wait -Tail 50
```

## Troubleshooting

If you encounter issues with the MCP server, check the log file for error messages. The log file will contain detailed information about:
- Credential loading (environment variables vs keychain)
- Connection attempts to JIRA
- Tool execution and errors
- Server startup and shutdown events

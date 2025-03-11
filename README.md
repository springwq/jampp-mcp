# Jampp MCP Server

This is a Model Context Protocol (MCP) server for connecting to the Jampp advertising platform's reporting API. It allows LLMs (like Claude) to query and analyze Jampp advertising data using natural language.

## Features

This server provides the following tools:

1. `get_campaign_spend` - Get campaign spend for a specific date range
2. `get_campaign_daily_spend` - Get daily spend for a specific campaign
3. `get_campaign_performance` - Get comprehensive performance metrics for campaigns
4. `create_async_report` - Create asynchronous reports for large datasets
5. `get_async_report_status` - Check the status of asynchronous reports
6. `get_async_report_results` - Get results of completed asynchronous reports
7. `get_available_metrics_and_dimensions` - Get a list of all available metrics and dimensions

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a `.env` file and add your Jampp API credentials:
   ```
   JAMPP_CLIENT_ID=your_client_id
   JAMPP_CLIENT_SECRET=your_client_secret
   ```
4. Build the project: `npm run build`
5. Run the server: `npm start`

## Integration with Claude for Desktop

To use this server with Claude for Desktop:

1. Make sure you have installed and updated to the latest version of Claude for Desktop.
2. Open the Claude for Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3. Add the Jampp MCP server to the configuration:

```json
{
  "mcpServers": {
    "jampp": {
      "command": "node",
      "args": ["/absolute/path/to/jampp-mcp/build/index.js"],
      "env": {
        "JAMPP_CLIENT_ID": "your_client_id",
        "JAMPP_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

4. Save the file and restart Claude for Desktop.
5. You should now see the Jampp tools in Claude for Desktop.

## Example Queries

Here are some example queries you can ask Claude after connecting the MCP server:

1. "What was the total spend across all campaigns last month?"
2. "Show me the daily spend for campaign ID 12345 over the past week."
3. "What were the performance metrics for our iOS campaigns in January?"
4. "Create an async report for impressions and clicks by country for Q1."
5. "Check the status of the async report with ID 'abc123'."
6. "Get the results of the completed async report with ID 'abc123'."
7. "What metrics and dimensions are available for Jampp reporting?"

## License

MIT

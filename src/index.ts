import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "Jampp MCP Server",
  version: "1.0.0"
});

const AUTH_URL = "https://auth.jampp.com/v1/oauth/token";
const API_URL = "https://reporting-api.jampp.com/v1/graphql";

const CLIENT_ID = process.env.JAMPP_CLIENT_ID || '';
const CLIENT_SECRET = process.env.JAMPP_CLIENT_SECRET || '';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing Jampp API credentials. Please set JAMPP_CLIENT_ID and JAMPP_CLIENT_SECRET environment variables.");
  process.exit(1);
}

// Token cache
let accessToken: string | null = null;
let tokenExpiry = 0;

/**
 * Get valid Jampp API access token
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid token
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // Request new token
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;

  // Set expiry time with 5 minutes buffer
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  if (!accessToken) {
    throw new Error('Failed to get access token: Token is empty');
  }

  return accessToken;
}

/**
 * Execute GraphQL query
 */
async function executeQuery(query: string, variables: Record<string, any> = {}) {
  const token = await getAccessToken();

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Tool: Get campaign spend
server.tool("get_campaign_spend", {
  from_date: z.string().describe("Start date in YYYY-MM-DD format"),
  to_date: z.string().describe("End date in YYYY-MM-DD format"),
  campaign_id: z.number().optional().describe("Optional campaign ID"),
}, async ({ from_date, to_date, campaign_id }) => {
  try {
    let query = `
      query spendPerCampaign($from: DateTime!, $to: DateTime!${campaign_id ? ', $campaignId: Int!' : ''}) {
        spendPerCampaign: pivot(
          from: $from,
          to: $to
          ${campaign_id ? ', filter: { campaignId: { equals: $campaignId } }' : ''}
        ) {
          results {
            campaignId
            campaign
            spend
          }
        }
      }
    `;

    const variables: Record<string, any> = {
      from: from_date,
      to: to_date,
    };

    if (campaign_id) {
      variables.campaignId = campaign_id;
    }

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.spendPerCampaign.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting campaign spend: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Tool: Get campaign daily spend
server.tool("get_campaign_daily_spend", {
  campaign_id: z.number().describe("Campaign ID"),
  from_date: z.string().describe("Start date in YYYY-MM-DD format"),
  to_date: z.string().describe("End date in YYYY-MM-DD format"),
}, async ({ campaign_id, from_date, to_date }) => {
  try {
    const query = `
      query dailySpend($campaignId: Int!, $from: DateTime!, $to: DateTime!) {
        dailySpend: pivot(
          from: $from,
          to: $to,
          filter: { campaignId: { equals: $campaignId } },
          groupBy: [date]
        ) {
          results {
            date
            spend
          }
        }
      }
    `;

    const variables = {
      campaignId: campaign_id,
      from: from_date,
      to: to_date,
    };

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.dailySpend.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting campaign daily spend: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Tool: Get campaign performance metrics
server.tool("get_campaign_performance", {
  from_date: z.string().describe("Start date in YYYY-MM-DD format"),
  to_date: z.string().describe("End date in YYYY-MM-DD format"),
  campaign_id: z.number().optional().describe("Optional campaign ID"),
}, async ({ from_date, to_date, campaign_id }) => {
  try {
    let query = `
      query campaignPerformance($from: DateTime!, $to: DateTime!${campaign_id ? ', $campaignId: Int!' : ''}) {
        performance: pivot(
          from: $from,
          to: $to
          ${campaign_id ? ', filter: { campaignId: { equals: $campaignId } }' : ''}
        ) {
          results {
            campaignId
            campaign
            spend
            impressions
            clicks
            installs
            ctr
            cpi
            cvr
          }
        }
      }
    `;

    const variables: Record<string, any> = {
      from: from_date,
      to: to_date,
    };

    if (campaign_id) {
      variables.campaignId = campaign_id;
    }

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.performance.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting campaign performance metrics: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Tool: Create async report
server.tool("create_async_report", {
  from_date: z.string().describe("Start date in YYYY-MM-DD format"),
  to_date: z.string().describe("End date in YYYY-MM-DD format"),
  metrics: z.array(z.string()).describe("List of metrics to include"),
  dimensions: z.array(z.string()).describe("List of dimensions to include"),
  filters: z.record(z.any()).optional().describe("Optional filters"),
}, async ({ from_date, to_date, metrics, dimensions, filters }) => {
  try {
    const query = `
      mutation createReport($input: CreateReportInput!) {
        createReport(input: $input) {
          id
          status
        }
      }
    `;

    const variables = {
      input: {
        from: from_date,
        to: to_date,
        metrics,
        dimensions,
        filters: filters || {},
      }
    };

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.createReport, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating async report: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Tool: Get async report status
server.tool("get_async_report_status", {
  report_id: z.string().describe("Report ID"),
}, async ({ report_id }) => {
  try {
    const query = `
      query reportStatus($id: ID!) {
        report(id: $id) {
          id
          status
          createdAt
          completedAt
        }
      }
    `;

    const variables = {
      id: report_id,
    };

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.report, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting async report status: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Tool: Get async report results
server.tool("get_async_report_results", {
  report_id: z.string().describe("Report ID"),
}, async ({ report_id }) => {
  try {
    const query = `
      query reportResults($id: ID!) {
        report(id: $id) {
          id
          status
          results
        }
      }
    `;

    const variables = {
      id: report_id,
    };

    const data = await executeQuery(query, variables);

    if (data.data.report.status !== 'COMPLETED') {
      return {
        content: [
          {
            type: "text",
            text: `Report not completed yet, current status: ${data.data.report.status}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.report.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting async report results: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Tool: Get available metrics and dimensions
server.tool("get_available_metrics_and_dimensions", {}, async () => {
  try {
    const query = `
      query {
        availableMetrics
        availableDimensions
      }
    `;

    const data = await executeQuery(query);
    const availableMetrics = data.data.availableMetrics;
    const availableDimensions = data.data.availableDimensions;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            metrics: availableMetrics,
            dimensions: availableDimensions
          }, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting available metrics and dimensions: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  try {
    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jampp MCP Server started successfully");
  }
  catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

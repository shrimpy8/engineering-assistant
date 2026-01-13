/**
 * MCP Module
 *
 * Model Context Protocol client for communicating with the MCP server.
 * Based on PRD v1.4 Section 5.2
 */

export { MCPClient, createMCPClient, getMCPClient, disconnectAllClients } from './client';
export { MCPProtocolError, MCPErrorCodes } from './protocol';
export * from './types';

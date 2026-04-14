package mcp

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
)

// JSON-RPC 2.0 types
type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *RPCError   `json:"error,omitempty"`
}

type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type Tool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema interface{} `json:"inputSchema"`
}

var serverInfo = ServerInfo{
	Name:    "taskflow-mcp",
	Version: "1.0.0",
}

var apiURL string
var authToken string

// M is a convenience type for building JSON maps (avoids importing gin)
type M map[string]interface{}

func StartServer(url, token string) error {
	apiURL = url
	authToken = token

	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var req JSONRPCRequest
		if err := json.Unmarshal(line, &req); err != nil {
			sendError(nil, -32700, "Parse error")
			continue
		}

		handleRequest(req)
	}

	return scanner.Err()
}

func handleRequest(req JSONRPCRequest) {
	switch req.Method {
	case "initialize":
		sendResult(req.ID, M{
			"protocolVersion": "2024-11-05",
			"capabilities": M{
				"tools": M{},
			},
			"serverInfo": serverInfo,
		})
	case "notifications/initialized":
		// No response needed for notifications
	case "tools/list":
		sendResult(req.ID, M{
			"tools": getTools(),
		})
	case "tools/call":
		handleToolCall(req)
	default:
		sendError(req.ID, -32601, fmt.Sprintf("Method not found: %s", req.Method))
	}
}

func sendResult(id interface{}, result interface{}) {
	if id == nil {
		return
	}
	resp := JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      id,
		Result:  result,
	}
	writeJSON(resp)
}

func sendError(id interface{}, code int, message string) {
	if id == nil {
		return
	}
	resp := JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      id,
		Error: &RPCError{
			Code:    code,
			Message: message,
		},
	}
	writeJSON(resp)
}

func writeJSON(v interface{}) {
	data, _ := json.Marshal(v)
	fmt.Println(string(data))
}

package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/kongxinshitou/taskflow/config"
	"github.com/kongxinshitou/taskflow/mcp"
	"github.com/kongxinshitou/taskflow/models"
	"github.com/kongxinshitou/taskflow/router"
)

func main() {
	// Parse flags
	mcpMode := flag.Bool("mcp", false, "Run as MCP server (stdio)")
	apiURL := flag.String("api-url", "http://localhost:8080", "API URL for MCP server")
	mcpToken := flag.String("token", "", "Auth token for MCP server")
	flag.Parse()

	if *mcpMode {
		log.Println("[MCP] Starting TaskFlow MCP Server...")
		if err := mcp.StartServer(*apiURL, *mcpToken); err != nil {
			log.Fatalf("[MCP] Error: %v", err)
		}
		return
	}

	// Load config
	config.Load()

	// Initialize database
	models.InitDB(config.AppConfig.DBPath)

	// Setup router
	r := router.SetupRouter()

	// Start server
	addr := fmt.Sprintf(":%s", config.AppConfig.Port)
	log.Printf("[Server] TaskFlow API starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[Server] Failed to start: %v", err)
	}
}

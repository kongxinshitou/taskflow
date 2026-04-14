package mcp

func getTools() []Tool {
	return []Tool{
		{
			Name:        "taskflow_list_todos",
			Description: "List all incomplete TODOs. Optionally filter by project_id or status.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"project_id": map[string]interface{}{
						"type":        "string",
						"description": "Filter by project ID",
					},
					"status": map[string]interface{}{
						"type":        "string",
						"enum":        []string{"todo", "in_progress", "done"},
						"description": "Filter by status",
					},
				},
			},
		},
		{
			Name:        "taskflow_search_todos",
			Description: "Search TODOs by keyword. Returns matching tasks sorted by relevance.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "Search keyword",
					},
					"status": map[string]interface{}{
						"type":        "string",
						"enum":        []string{"todo", "in_progress", "done"},
						"description": "Filter by status (optional)",
					},
				},
				"required": []string{"query"},
			},
		},
		{
			Name:        "taskflow_update_todo_status",
			Description: "Update a TODO's status (e.g., mark as done).",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"task_id": map[string]interface{}{
						"type":        "string",
						"description": "The task ID to update",
					},
					"status": map[string]interface{}{
						"type":        "string",
						"enum":        []string{"todo", "in_progress", "done"},
						"description": "New status",
					},
				},
				"required": []string{"task_id", "status"},
			},
		},
		{
			Name:        "taskflow_add_activity",
			Description: "Add a completed activity record (not necessarily linked to a TODO).",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"title": map[string]interface{}{
						"type":        "string",
						"description": "Activity title",
					},
					"description": map[string]interface{}{
						"type":        "string",
						"description": "Detailed description (optional)",
					},
					"project_id": map[string]interface{}{
						"type":        "string",
						"description": "Associated project ID (optional)",
					},
					"tags": map[string]interface{}{
						"type":        "array",
						"items":       map[string]string{"type": "string"},
						"description": "Tags for categorization (optional)",
					},
				},
				"required": []string{"title"},
			},
		},
		{
			Name:        "taskflow_session_sync",
			Description: "Sync Claude Code session results to TaskFlow. Matches completed tasks against existing TODOs and creates activity records.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"session_summary": map[string]interface{}{
						"type":        "string",
						"description": "Summary of what was accomplished in this session",
					},
					"tasks_done": map[string]interface{}{
						"type":        "array",
						"description": "List of completed tasks",
						"items": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"title": map[string]interface{}{
									"type":        "string",
									"description": "Task description",
								},
								"description": map[string]interface{}{
									"type":        "string",
									"description": "Detailed explanation",
								},
								"tags": map[string]interface{}{
									"type":        "array",
									"items":       map[string]string{"type": "string"},
									"description": "Tags (e.g., ['refactor', 'backend'])",
								},
							},
							"required": []string{"title"},
						},
					},
				},
				"required": []string{"session_summary", "tasks_done"},
			},
		},
		{
			Name:        "taskflow_get_summary",
			Description: "Get a summary of completed work for a given time period.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"period": map[string]interface{}{
						"type":        "string",
						"enum":        []string{"day", "week", "month"},
						"description": "Time period (default: day)",
					},
					"date": map[string]interface{}{
						"type":        "string",
						"description": "Base date in ISO format (e.g., 2026-04-12). Default: today",
					},
				},
			},
		},
	}
}

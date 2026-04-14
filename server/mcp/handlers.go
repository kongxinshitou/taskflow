package mcp

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

)

func handleToolCall(req JSONRPCRequest) {
	var params struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	}
	if err := json.Unmarshal(req.Params, &params); err != nil {
		sendError(req.ID, -32602, "Invalid params")
		return
	}

	var result interface{}
	var err error

	switch params.Name {
	case "taskflow_list_todos":
		result, err = handleListTodos(params.Arguments)
	case "taskflow_search_todos":
		result, err = handleSearchTodos(params.Arguments)
	case "taskflow_update_todo_status":
		result, err = handleUpdateTodoStatus(params.Arguments)
	case "taskflow_add_activity":
		result, err = handleAddActivity(params.Arguments)
	case "taskflow_session_sync":
		result, err = handleSessionSync(params.Arguments)
	case "taskflow_get_summary":
		result, err = handleGetSummary(params.Arguments)
	default:
		sendError(req.ID, -32601, fmt.Sprintf("Unknown tool: %s", params.Name))
		return
	}

	if err != nil {
		sendResult(req.ID, M{
			"content": []M{
				{"type": "text", "text": fmt.Sprintf("Error: %s", err.Error())},
			},
			"isError": true,
		})
		return
	}

	sendResult(req.ID, M{
		"content": []M{
			{"type": "text", "text": resultToString(result)},
		},
	})
}

func resultToString(v interface{}) string {
	data, _ := json.MarshalIndent(v, "", "  ")
	return string(data)
}

// API helper: make authenticated HTTP request
func apiRequest(method, path string, body io.Reader) (*http.Response, error) {
	url := strings.TrimRight(apiURL, "/") + path
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+authToken)
	req.Header.Set("Content-Type", "application/json")
	return http.DefaultClient.Do(req)
}

func handleListTodos(args json.RawMessage) (interface{}, error) {
	var input struct {
		ProjectID string `json:"project_id"`
		Status    string `json:"status"`
	}
	json.Unmarshal(args, &input)

	path := "/api/tasks?status=todo"
	if input.Status != "" {
		path = "/api/tasks?status=" + input.Status
	}
	if input.ProjectID != "" {
		path += "&project_id=" + input.ProjectID
	}

	resp, err := apiRequest("GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tasks []interface{}
	json.NewDecoder(resp.Body).Decode(&tasks)
	return tasks, nil
}

func handleSearchTodos(args json.RawMessage) (interface{}, error) {
	var input struct {
		Query  string `json:"query"`
		Status string `json:"status"`
	}
	json.Unmarshal(args, &input)

	path := "/api/tasks"
	if input.Status != "" {
		path += "?status=" + input.Status
	}

	resp, err := apiRequest("GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var allTasks []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&allTasks)

	// Client-side filtering by query keyword
	queryLower := strings.ToLower(input.Query)
	results := []map[string]interface{}{}
	for _, t := range allTasks {
		title, _ := t["title"].(string)
		if strings.Contains(strings.ToLower(title), queryLower) {
			results = append(results, t)
		}
	}

	return results, nil
}

func handleUpdateTodoStatus(args json.RawMessage) (interface{}, error) {
	var input struct {
		TaskID string `json:"task_id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(args, &input); err != nil {
		return nil, err
	}

	body := fmt.Sprintf(`{"status":"%s"}`, input.Status)
	resp, err := apiRequest("PUT", "/api/tasks/"+input.TaskID, strings.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

func handleAddActivity(args json.RawMessage) (interface{}, error) {
	var input struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		ProjectID   string   `json:"project_id"`
		Tags        []string `json:"tags"`
	}
	if err := json.Unmarshal(args, &input); err != nil {
		return nil, err
	}

	tagsJSON := "[]"
	if len(input.Tags) > 0 {
		items := make([]string, len(input.Tags))
		for i, t := range input.Tags {
			items[i] = fmt.Sprintf(`"%s"`, t)
		}
		tagsJSON = "[" + strings.Join(items, ",") + "]"
	}

	bodyMap := map[string]interface{}{
		"title":       input.Title,
		"description": input.Description,
		"source":      "claude_session",
		"tags":        tagsJSON,
	}
	if input.ProjectID != "" {
		bodyMap["project_id"] = input.ProjectID
	}
	body, _ := json.Marshal(bodyMap)

	resp, err := apiRequest("POST", "/api/activities", strings.NewReader(string(body)))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

func handleSessionSync(args json.RawMessage) (interface{}, error) {
	var input struct {
		SessionSummary string `json:"session_summary"`
		TasksDone      []struct {
			Title       string   `json:"title"`
			Description string   `json:"description"`
			Tags        []string `json:"tags"`
		} `json:"tasks_done"`
	}
	if err := json.Unmarshal(args, &input); err != nil {
		return nil, err
	}

	// Get all non-done tasks
	resp, err := apiRequest("GET", "/api/tasks?status=todo", nil)
	if err != nil {
		return nil, err
	}
	var todoTasks []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&todoTasks)
	resp.Body.Close()

	resp2, err := apiRequest("GET", "/api/tasks?status=in_progress", nil)
	if err != nil {
		return nil, err
	}
	var inProgressTasks []map[string]interface{}
	json.NewDecoder(resp2.Body).Decode(&inProgressTasks)
	resp2.Body.Close()

	allTasks := append(todoTasks, inProgressTasks...)

	report := struct {
		Summary        string   `json:"summary"`
		UpdatedTodos   []string `json:"updated_todos"`
		NewActivities  []string `json:"new_activities"`
	}{
		Summary: input.SessionSummary,
	}

	// For each completed task, try to match against existing todos
	activities := []map[string]interface{}{}
	for _, done := range input.TasksDone {
		matched := false
		doneLower := strings.ToLower(done.Title)

		for _, task := range allTasks {
			title, _ := task["title"].(string)
			if strings.Contains(strings.ToLower(title), doneLower) ||
				strings.Contains(doneLower, strings.ToLower(title)) {
				// Update this task to done
				taskID, _ := task["id"].(string)
				body := fmt.Sprintf(`{"status":"done"}`)
				apiRequest("PUT", "/api/tasks/"+taskID, strings.NewReader(body))
				report.UpdatedTodos = append(report.UpdatedTodos, title)
				matched = true
				break
			}
		}

		if !matched {
			// Create new activity
			tagsJSON := "[]"
			if len(done.Tags) > 0 {
				items := make([]string, len(done.Tags))
				for i, t := range done.Tags {
					items[i] = fmt.Sprintf(`"%s"`, t)
				}
				tagsJSON = "[" + strings.Join(items, ",") + "]"
			}

			activity := map[string]interface{}{
				"title":       done.Title,
				"description": done.Description,
				"source":      "claude_session",
				"tags":        tagsJSON,
				"session_id":  fmt.Sprintf("session-%d", time.Now().Unix()),
			}
			activities = append(activities, activity)
			report.NewActivities = append(report.NewActivities, done.Title)
		}
	}

	// Batch create unmatched activities
	if len(activities) > 0 {
		batchBody, _ := json.Marshal(map[string]interface{}{
			"activities": activities,
		})
		apiRequest("POST", "/api/activities/batch", strings.NewReader(string(batchBody)))
	}

	return report, nil
}

func handleGetSummary(args json.RawMessage) (interface{}, error) {
	var input struct {
		Period string `json:"period"`
		Date   string `json:"date"`
	}
	json.Unmarshal(args, &input)

	if input.Period == "" {
		input.Period = "day"
	}
	if input.Date == "" {
		input.Date = time.Now().Format("2006-01-02")
	}

	path := fmt.Sprintf("/api/export?period=%s&date=%s&format=json&type=all", input.Period, input.Date)
	resp, err := apiRequest("GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	// Build summary
	summary := map[string]interface{}{}
	if tasks, ok := result["tasks"].([]interface{}); ok {
		done := 0
		for _, t := range tasks {
			if m, ok := t.(map[string]interface{}); ok {
				if m["status"] == "done" {
					done++
				}
			}
		}
		summary["total_tasks"] = len(tasks)
		summary["done_tasks"] = done
	}
	if activities, ok := result["activities"].([]interface{}); ok {
		summary["total_activities"] = len(activities)
	}
	summary["period"] = input.Period
	summary["date"] = input.Date

	return summary, nil
}


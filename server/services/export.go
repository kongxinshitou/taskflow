package services

import (
	"time"

	"github.com/google/uuid"
	"github.com/kongxinshitou/taskflow/models"
)

// SessionSyncResult records the outcome of a session sync
type SessionSyncResult struct {
	UpdatedTasks  []string // Task IDs that were updated to done
	NewActivities []string // Activity IDs that were newly created
	Report        string
}

// SessionSync processes a Claude Code session summary and syncs with TaskFlow
func SessionSync(userID string, tasksDone []struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
}, sessionSummary string) (*SessionSyncResult, error) {
	result := &SessionSyncResult{}

	// Get all non-done tasks for the user
	var todos []models.Task
	models.DB.Where("user_id = ? AND status != 'done'", userID).Find(&todos)

	for _, done := range tasksDone {
		matches := MatchTasks(done.Title, todos)

		if len(matches) > 0 && matches[0].Confidence >= 0.6 {
			// Update matched task to done
			matched := matches[0]
			models.DB.Model(&matched.Task).Update("status", "done")
			result.UpdatedTasks = append(result.UpdatedTasks, matched.Task.ID)
		} else {
			// Create new activity
			tagsStr := "[]"
			if len(done.Tags) > 0 {
				tagItems := ""
				for i, t := range done.Tags {
					if i > 0 {
						tagItems += ","
					}
					tagItems += `"` + t + `"`
				}
				tagsStr = "[" + tagItems + "]"
			}

			now := time.Now().UnixMilli()
			activity := models.Activity{
				ID:          uuid.New().String(),
				UserID:      userID,
				Title:       done.Title,
				Description: done.Description,
				Source:      "claude_session",
				Tags:        tagsStr,
				DoneAt:      now,
			}
			models.DB.Create(&activity)
			result.NewActivities = append(result.NewActivities, activity.ID)
		}
	}

	return result, nil
}

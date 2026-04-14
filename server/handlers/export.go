package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kongxinshitou/taskflow/middleware"
	"github.com/kongxinshitou/taskflow/models"
)

func ExportData(c *gin.Context) {
	userID := middleware.GetUserID(c)
	period := c.DefaultQuery("period", "month")
	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	format := c.DefaultQuery("format", "json")
	dataType := c.DefaultQuery("type", "all")

	baseDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	var startMs, endMs int64
	switch period {
	case "day":
		startMs = baseDate.UnixMilli()
		endMs = startMs + 24*60*60*1000
	case "week":
		weekday := int(baseDate.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		startOfWeek := baseDate.AddDate(0, 0, -(weekday - 1))
		startMs = time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day(), 0, 0, 0, 0, startOfWeek.Location()).UnixMilli()
		endMs = startMs + 7*24*60*60*1000
	case "month":
		startOfMonth := time.Date(baseDate.Year(), baseDate.Month(), 1, 0, 0, 0, 0, baseDate.Location())
		endOfMonth := startOfMonth.AddDate(0, 1, 0)
		startMs = startOfMonth.UnixMilli()
		endMs = endOfMonth.UnixMilli()
	case "year":
		startOfYear := time.Date(baseDate.Year(), 1, 1, 0, 0, 0, 0, baseDate.Location())
		endOfYear := startOfYear.AddDate(1, 0, 0)
		startMs = startOfYear.UnixMilli()
		endMs = endOfYear.UnixMilli()
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period"})
		return
	}

	result := gin.H{}

	if dataType == "all" || dataType == "tasks" {
		var tasks []models.Task
		models.DB.Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, startMs, endMs).
			Order("sort_order ASC").Find(&tasks)
		result["tasks"] = tasks
	}

	if dataType == "all" || dataType == "activities" {
		var activities []models.Activity
		models.DB.Where("user_id = ? AND done_at >= ? AND done_at < ?", userID, startMs, endMs).
			Order("done_at DESC").Find(&activities)
		result["activities"] = activities
	}

	if dataType == "all" {
		var projects []models.Project
		models.DB.Where("user_id = ?", userID).Order("sort_order ASC").Find(&projects)
		result["projects"] = projects
	}

	switch format {
	case "csv":
		writeCSV(c, result, dataType)
	case "markdown":
		writeMarkdown(c, result, dataType, period, dateStr)
	default:
		c.JSON(http.StatusOK, result)
	}
}

func writeCSV(c *gin.Context, data gin.H, dataType string) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=taskflow_export.csv")

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	if tasks, ok := data["tasks"]; ok {
		writer.Write([]string{"Type", "ID", "Title", "Status", "Priority", "Due Date", "Created At"})
		for _, t := range tasks.([]models.Task) {
			dueDate := ""
			if t.DueDate != nil {
				dueDate = time.UnixMilli(*t.DueDate).Format("2006-01-02")
			}
			writer.Write([]string{
				"task", t.ID, t.Title, t.Status, t.Priority, dueDate,
				time.UnixMilli(t.CreatedAt).Format("2006-01-02 15:04:05"),
			})
		}
	}

	if activities, ok := data["activities"]; ok {
		if _, exists := data["tasks"]; exists {
			writer.Write([]string{})
		}
		writer.Write([]string{"Type", "ID", "Title", "Source", "Done At"})
		for _, a := range activities.([]models.Activity) {
			writer.Write([]string{
				"activity", a.ID, a.Title, a.Source,
				time.UnixMilli(a.DoneAt).Format("2006-01-02 15:04:05"),
			})
		}
	}
}

func writeMarkdown(c *gin.Context, data gin.H, dataType string, period string, date string) {
	c.Header("Content-Type", "text/markdown")
	c.Header("Content-Disposition", "attachment; filename=taskflow_export.md")

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# TaskFlow Export (%s - %s)\n\n", period, date))

	if tasks, ok := data["tasks"]; ok {
		sb.WriteString("## Tasks\n\n")
		for _, t := range tasks.([]models.Task) {
			statusIcon := "[ ]"
			if t.Status == "done" {
				statusIcon = "[x]"
			}
			sb.WriteString(fmt.Sprintf("- %s %s (%s, %s)\n", statusIcon, t.Title, t.Status, t.Priority))
		}
		sb.WriteString("\n")
	}

	if activities, ok := data["activities"]; ok {
		sb.WriteString("## Activities\n\n")
		for _, a := range activities.([]models.Activity) {
			sb.WriteString(fmt.Sprintf("- %s (%s)\n", a.Title, a.Source))
		}
	}

	c.String(http.StatusOK, sb.String())
}

func ImportData(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var input struct {
		Projects   []models.Project  `json:"projects"`
		Tasks      []models.Task     `json:"tasks"`
		Activities []models.Activity `json:"activities"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	imported := gin.H{
		"projects":   0,
		"tasks":      0,
		"activities": 0,
	}

	for _, p := range input.Projects {
		var existing models.Project
		if err := models.DB.Where("id = ?", p.ID).First(&existing).Error; err != nil {
			p.UserID = userID
			models.DB.Create(&p)
			imported["projects"] = imported["projects"].(int) + 1
		}
	}

	for _, t := range input.Tasks {
		var existing models.Task
		if err := models.DB.Where("id = ?", t.ID).First(&existing).Error; err != nil {
			t.UserID = userID
			models.DB.Create(&t)
			imported["tasks"] = imported["tasks"].(int) + 1
		}
	}

	for _, a := range input.Activities {
		var existing models.Activity
		if err := models.DB.Where("id = ?", a.ID).First(&existing).Error; err != nil {
			a.UserID = userID
			models.DB.Create(&a)
			imported["activities"] = imported["activities"].(int) + 1
		}
	}

	c.JSON(http.StatusOK, imported)
}

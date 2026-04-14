package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kongxinshitou/taskflow/middleware"
	"github.com/kongxinshitou/taskflow/models"
)

func ListTasks(c *gin.Context) {
	userID := middleware.GetUserID(c)
	query := models.DB.Where("user_id = ?", userID)

	if projectID := c.Query("project_id"); projectID != "" {
		query = query.Where("project_id = ?", projectID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if parentID := c.Query("parent_id"); parentID != "" {
		if parentID == "null" || parentID == "none" {
			query = query.Where("parent_id IS NULL")
		} else {
			query = query.Where("parent_id = ?", parentID)
		}
	}

	var tasks []models.Task
	query.Order("sort_order ASC, created_at ASC").Find(&tasks)
	c.JSON(http.StatusOK, tasks)
}

func CreateTask(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var input models.CreateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task := models.Task{
		ID:        uuid.New().String(),
		UserID:    userID,
		ProjectID: input.ProjectID,
		ParentID:  input.ParentID,
		Title:     input.Title,
		Notes:     input.Notes,
		DueDate:   input.DueDate,
		SortOrder: input.SortOrder,
	}
	if input.Priority != "" {
		task.Priority = input.Priority
	}
	if input.Status != "" {
		task.Status = input.Status
	}

	if err := models.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func UpdateTask(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	var task models.Task
	if err := models.DB.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var input models.UpdateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Notes != nil {
		updates["notes"] = *input.Notes
	}
	if input.DueDate != nil {
		updates["due_date"] = *input.DueDate
	}
	if input.Priority != nil {
		updates["priority"] = *input.Priority
	}
	if input.ParentID != nil {
		updates["parent_id"] = *input.ParentID
	}
	if input.SortOrder != nil {
		updates["sort_order"] = *input.SortOrder
	}

	// Handle status change
	if input.Status != nil {
		newStatus := *input.Status
		updates["status"] = newStatus

		// When status changes to done, set completed_at and create Activity
		if newStatus == "done" && task.Status != "done" {
			now := time.Now().UnixMilli()
			updates["completed_at"] = now

			// Auto-create Activity
			activity := models.Activity{
				ID:        uuid.New().String(),
				UserID:    userID,
				ProjectID: &task.ProjectID,
				TaskID:    &task.ID,
				Title:     task.Title,
				Source:    "todo_completion",
				DoneAt:    now,
			}
			models.DB.Create(&activity)
		}
	}

	if len(updates) > 0 {
		models.DB.Model(&task).Updates(updates)
	}

	models.DB.Where("id = ?", id).First(&task)
	c.JSON(http.StatusOK, task)
}

func DeleteTask(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	result := models.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Task{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Cascade delete sub-tasks
	models.DB.Where("parent_id = ?", id).Delete(&models.Task{})

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}

func ReorderTasks(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var input models.ReorderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i, id := range input.IDs {
		models.DB.Model(&models.Task{}).Where("id = ? AND user_id = ?", id, userID).Update("sort_order", i)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tasks reordered"})
}

func GetTodayTasks(c *gin.Context) {
	userID := middleware.GetUserID(c)
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).UnixMilli()

	var tasks []models.Task
	// Tasks due today or overdue, not done, no parent (root tasks)
	models.DB.Where(
		"user_id = ? AND parent_id IS NULL AND status != 'done' AND due_date IS NOT NULL AND due_date <= ?",
		userID, startOfDay+24*60*60*1000,
	).Order("due_date ASC, priority ASC").Find(&tasks)

	c.JSON(http.StatusOK, tasks)
}

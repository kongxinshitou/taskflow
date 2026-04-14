package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kongxinshitou/taskflow/middleware"
	"github.com/kongxinshitou/taskflow/models"
)

func ListActivities(c *gin.Context) {
	userID := middleware.GetUserID(c)
	query := models.DB.Where("user_id = ?", userID)

	if startDate := c.Query("start_date"); startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("done_at >= ?", t.UnixMilli())
		}
	}
	if endDate := c.Query("end_date"); endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			query = query.Where("done_at <= ?", t.UnixMilli()+24*60*60*1000)
		}
	}
	if projectID := c.Query("project_id"); projectID != "" {
		query = query.Where("project_id = ?", projectID)
	}
	if source := c.Query("source"); source != "" {
		query = query.Where("source = ?", source)
	}

	var activities []models.Activity
	query.Order("done_at DESC, created_at DESC").Find(&activities)
	c.JSON(http.StatusOK, activities)
}

func CreateActivity(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var input models.CreateActivityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	activity := models.Activity{
		ID:          uuid.New().String(),
		UserID:      userID,
		ProjectID:   input.ProjectID,
		TaskID:      input.TaskID,
		Title:       input.Title,
		Description: input.Description,
		Source:      input.Source,
		SessionID:   input.SessionID,
		Tags:        input.Tags,
	}
	if activity.Source == "" {
		activity.Source = "manual"
	}
	if input.DoneAt != nil {
		activity.DoneAt = *input.DoneAt
	} else {
		activity.DoneAt = time.Now().UnixMilli()
	}

	if err := models.DB.Create(&activity).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create activity"})
		return
	}

	c.JSON(http.StatusCreated, activity)
}

func UpdateActivity(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	var activity models.Activity
	if err := models.DB.Where("id = ? AND user_id = ?", id, userID).First(&activity).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Activity not found"})
		return
	}

	var input models.UpdateActivityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.ProjectID != nil {
		updates["project_id"] = *input.ProjectID
	}
	if input.Tags != nil {
		updates["tags"] = *input.Tags
	}
	if input.DoneAt != nil {
		updates["done_at"] = *input.DoneAt
	}

	if len(updates) > 0 {
		models.DB.Model(&activity).Updates(updates)
	}

	models.DB.Where("id = ?", id).First(&activity)
	c.JSON(http.StatusOK, activity)
}

func DeleteActivity(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	result := models.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Activity{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Activity not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Activity deleted"})
}

func BatchCreateActivities(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var input models.BatchActivityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	activities := make([]models.Activity, 0, len(input.Activities))
	for _, item := range input.Activities {
		activity := models.Activity{
			ID:          uuid.New().String(),
			UserID:      userID,
			ProjectID:   item.ProjectID,
			TaskID:      item.TaskID,
			Title:       item.Title,
			Description: item.Description,
			Source:      item.Source,
			SessionID:   item.SessionID,
			Tags:        item.Tags,
		}
		if activity.Source == "" {
			activity.Source = "claude_session"
		}
		if item.DoneAt != nil {
			activity.DoneAt = *item.DoneAt
		} else {
			activity.DoneAt = time.Now().UnixMilli()
		}
		activities = append(activities, activity)
	}

	if err := models.DB.Create(&activities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create activities"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"count":      len(activities),
		"activities": activities,
	})
}

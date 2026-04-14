package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kongxinshitou/taskflow/middleware"
	"github.com/kongxinshitou/taskflow/models"
)

func ListProjects(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var projects []models.Project
	models.DB.Where("user_id = ?", userID).Order("sort_order ASC, created_at ASC").Find(&projects)
	c.JSON(http.StatusOK, projects)
}

func CreateProject(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var input models.CreateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project := models.Project{
		ID:          uuid.New().String(),
		UserID:      userID,
		Name:        input.Name,
		Color:       input.Color,
		Description: input.Description,
	}
	if project.Color == "" {
		project.Color = "#1677ff"
	}

	if err := models.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	c.JSON(http.StatusCreated, project)
}

func UpdateProject(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	var project models.Project
	if err := models.DB.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var input models.UpdateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Color != nil {
		updates["color"] = *input.Color
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.SortOrder != nil {
		updates["sort_order"] = *input.SortOrder
	}

	if len(updates) > 0 {
		models.DB.Model(&project).Updates(updates)
	}

	models.DB.Where("id = ?", id).First(&project)
	c.JSON(http.StatusOK, project)
}

func DeleteProject(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id := c.Param("id")

	result := models.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Project{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Cascade delete tasks and activities
	models.DB.Where("project_id = ?", id).Delete(&models.Task{})
	models.DB.Where("project_id = ?", id).Delete(&models.Activity{})

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted"})
}

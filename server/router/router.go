package router

import (
	"github.com/gin-gonic/gin"
	"github.com/kongxinshitou/taskflow/handlers"
	"github.com/kongxinshitou/taskflow/middleware"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// Global middleware
	r.Use(middleware.CORSMiddleware())

	// API group
	api := r.Group("/api")
	{
		// Auth (public)
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.GET("/me", middleware.AuthMiddleware(), handlers.GetMe)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// Projects
			protected.GET("/projects", handlers.ListProjects)
			protected.POST("/projects", handlers.CreateProject)
			protected.PUT("/projects/:id", handlers.UpdateProject)
			protected.DELETE("/projects/:id", handlers.DeleteProject)

			// Tasks
			protected.GET("/tasks", handlers.ListTasks)
			protected.POST("/tasks", handlers.CreateTask)
			protected.PUT("/tasks/:id", handlers.UpdateTask)
			protected.DELETE("/tasks/:id", handlers.DeleteTask)
			protected.PUT("/tasks/reorder", handlers.ReorderTasks)
			protected.GET("/tasks/today", handlers.GetTodayTasks)

			// Activities
			protected.GET("/activities", handlers.ListActivities)
			protected.POST("/activities", handlers.CreateActivity)
			protected.PUT("/activities/:id", handlers.UpdateActivity)
			protected.DELETE("/activities/:id", handlers.DeleteActivity)
			protected.POST("/activities/batch", handlers.BatchCreateActivities)

			// Export / Import
			protected.GET("/export", handlers.ExportData)
			protected.POST("/import", handlers.ImportData)
		}
	}

	return r
}

package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kongxinshitou/taskflow/config"
	"github.com/kongxinshitou/taskflow/handlers"
	"github.com/kongxinshitou/taskflow/middleware"
	"github.com/kongxinshitou/taskflow/models"
)

var testDBCounter = 0

func nextTestDB() string {
	testDBCounter++
	return "test_taskflow_" + string(rune('0'+testDBCounter)) + ".db"
}

func setupTestRouter() (*gin.Engine, string) {
	gin.SetMode(gin.TestMode)
	dbPath := nextTestDB()

	config.AppConfig = &config.Config{
		Port:      "8080",
		DBPath:    dbPath,
		JWTSecret: "test-secret",
	}

	models.InitDB(dbPath)

	r := gin.Default()

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.GET("/me", middleware.AuthMiddleware(), handlers.GetMe)
		}

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/projects", handlers.ListProjects)
			protected.POST("/projects", handlers.CreateProject)
			protected.PUT("/projects/:id", handlers.UpdateProject)
			protected.DELETE("/projects/:id", handlers.DeleteProject)

			protected.GET("/tasks", handlers.ListTasks)
			protected.POST("/tasks", handlers.CreateTask)
			protected.PUT("/tasks/:id", handlers.UpdateTask)
			protected.DELETE("/tasks/:id", handlers.DeleteTask)
			protected.PUT("/tasks/reorder", handlers.ReorderTasks)
			protected.GET("/tasks/today", handlers.GetTodayTasks)

			protected.GET("/activities", handlers.ListActivities)
			protected.POST("/activities", handlers.CreateActivity)
			protected.PUT("/activities/:id", handlers.UpdateActivity)
			protected.DELETE("/activities/:id", handlers.DeleteActivity)
			protected.POST("/activities/batch", handlers.BatchCreateActivities)

			protected.GET("/export", handlers.ExportData)
			protected.POST("/import", handlers.ImportData)
		}
	}

	return r, dbPath
}

func TestRegisterAndLogin(t *testing.T) {
	router, dbPath := setupTestRouter()
	defer os.Remove(dbPath)

	// Register
	body, _ := json.Marshal(map[string]string{
		"username": "testuser",
		"password": "password123",
	})
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Register failed: %d %s", w.Code, w.Body.String())
	}

	var regResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &regResp)
	token, _ := regResp["token"].(string)
	if token == "" {
		t.Fatal("No token returned from register")
	}

	// Login
	req, _ = http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Login failed: %d %s", w.Code, w.Body.String())
	}

	// Get Me
	req, _ = http.NewRequest("GET", "/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GetMe failed: %d", w.Code)
	}
}

func TestProjectCRUD(t *testing.T) {
	router, dbPath := setupTestRouter()
	defer os.Remove(dbPath)

	token := getTestToken(router)

	// Create
	body, _ := json.Marshal(map[string]string{"name": "Test Project"})
	req := authRequest("POST", "/api/projects", body, token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Create project failed: %d %s", w.Code, w.Body.String())
	}

	var project map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &project)
	projectID, _ := project["id"].(string)

	// List
	req = authRequest("GET", "/api/projects", nil, token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("List projects failed: %d", w.Code)
	}

	// Update
	body, _ = json.Marshal(map[string]string{"name": "Updated Project"})
	req = authRequest("PUT", "/api/projects/"+projectID, body, token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Update project failed: %d", w.Code)
	}

	// Delete
	req = authRequest("DELETE", "/api/projects/"+projectID, nil, token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Delete project failed: %d", w.Code)
	}
}

func TestTaskCRUD(t *testing.T) {
	router, dbPath := setupTestRouter()
	defer os.Remove(dbPath)

	token := getTestToken(router)
	projectID := createTestProject(router, token)

	// Create task
	body, _ := json.Marshal(map[string]interface{}{
		"project_id": projectID,
		"title":      "Test Task",
		"priority":   "high",
	})
	req := authRequest("POST", "/api/tasks", body, token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Create task failed: %d %s", w.Code, w.Body.String())
	}

	var task map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &task)
	taskID, _ := task["id"].(string)

	// List tasks
	req = authRequest("GET", "/api/tasks?project_id="+projectID, nil, token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("List tasks failed: %d", w.Code)
	}

	// Update task (mark as done)
	body, _ = json.Marshal(map[string]string{"status": "done"})
	req = authRequest("PUT", "/api/tasks/"+taskID, body, token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Update task failed: %d", w.Code)
	}

	// Verify activity was auto-created
	req = authRequest("GET", "/api/activities", nil, token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var activities []map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &activities)

	found := false
	for _, a := range activities {
		if a["task_id"] == taskID {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("Activity was not auto-created when task was marked done")
	}
}

func getTestToken(router *gin.Engine) string {
	body, _ := json.Marshal(map[string]string{
		"username": "testuser",
		"password": "password123",
	})
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return resp["token"].(string)
}

func createTestProject(router *gin.Engine, token string) string {
	body, _ := json.Marshal(map[string]string{"name": "Test Project"})
	req := authRequest("POST", "/api/projects", body, token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return resp["id"].(string)
}

func authRequest(method, path string, body []byte, token string) *http.Request {
	var buf *bytes.Buffer
	if body != nil {
		buf = bytes.NewBuffer(body)
	} else {
		buf = bytes.NewBuffer(nil)
	}
	req, _ := http.NewRequest(method, path, buf)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

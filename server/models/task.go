package models

type Task struct {
	ID          string  `gorm:"primaryKey" json:"id"`
	UserID      string  `gorm:"index;not null" json:"user_id"`
	ProjectID   string  `gorm:"index;not null" json:"project_id"`
	ParentID    *string `json:"parent_id,omitempty"`
	Title       string  `gorm:"not null" json:"title"`
	Notes       string  `json:"notes,omitempty"`
	DueDate     *int64  `json:"due_date,omitempty"`
	Priority    string  `gorm:"default:'medium'" json:"priority"`
	Status      string  `gorm:"default:'todo'" json:"status"`
	SortOrder   int     `gorm:"default:0" json:"sort_order"`
	Notified1d  bool    `gorm:"default:false" json:"notified_1d"`
	Notified0d  bool    `gorm:"default:false" json:"notified_0d"`
	CompletedAt *int64  `json:"completed_at,omitempty"`
	CreatedAt   int64   `gorm:"autoCreateTime:milli" json:"created_at"`
	UpdatedAt   int64   `gorm:"autoUpdateTime:milli" json:"updated_at"`
}

func (Task) TableName() string {
	return "tasks"
}

type CreateTaskInput struct {
	ProjectID string  `json:"project_id" binding:"required"`
	ParentID  *string `json:"parent_id"`
	Title     string  `json:"title" binding:"required"`
	Notes     string  `json:"notes"`
	DueDate   *int64  `json:"due_date"`
	Priority  string  `json:"priority"`
	Status    string  `json:"status"`
	SortOrder int     `json:"sort_order"`
}

type UpdateTaskInput struct {
	Title     *string `json:"title"`
	Notes     *string `json:"notes"`
	DueDate   *int64  `json:"due_date"`
	Priority  *string `json:"priority"`
	Status    *string `json:"status"`
	ParentID  *string `json:"parent_id"`
	SortOrder *int    `json:"sort_order"`
}

type ReorderInput struct {
	IDs []string `json:"ids" binding:"required"`
}

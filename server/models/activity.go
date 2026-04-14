package models

type Activity struct {
	ID          string  `gorm:"primaryKey" json:"id"`
	UserID      string  `gorm:"index;not null" json:"user_id"`
	ProjectID   *string `json:"project_id,omitempty"`
	TaskID      *string `json:"task_id,omitempty"`
	Title       string  `gorm:"not null" json:"title"`
	Description string  `json:"description,omitempty"`
	Source      string  `gorm:"default:'manual'" json:"source"`
	SessionID   string  `json:"session_id,omitempty"`
	Tags        string  `json:"tags,omitempty"`
	DoneAt      int64   `gorm:"not null" json:"done_at"`
	CreatedAt   int64   `gorm:"autoCreateTime:milli" json:"created_at"`
	UpdatedAt   int64   `gorm:"autoUpdateTime:milli" json:"updated_at"`
}

func (Activity) TableName() string {
	return "activities"
}

type CreateActivityInput struct {
	ProjectID   *string `json:"project_id"`
	TaskID      *string `json:"task_id"`
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Source      string  `json:"source"`
	SessionID   string  `json:"session_id"`
	Tags        string  `json:"tags"`
	DoneAt      *int64  `json:"done_at"`
}

type UpdateActivityInput struct {
	ProjectID   *string `json:"project_id"`
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Tags        *string `json:"tags"`
	DoneAt      *int64  `json:"done_at"`
}

type BatchActivityInput struct {
	Activities []CreateActivityInput `json:"activities" binding:"required"`
}

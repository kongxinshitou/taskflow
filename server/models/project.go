package models

type Project struct {
	ID          string `gorm:"primaryKey" json:"id"`
	UserID      string `gorm:"index;not null" json:"user_id"`
	Name        string `gorm:"not null" json:"name"`
	Color       string `gorm:"default:'#1677ff'" json:"color"`
	Description string `json:"description,omitempty"`
	SortOrder   int    `gorm:"default:0" json:"sort_order"`
	CreatedAt   int64  `gorm:"autoCreateTime:milli" json:"created_at"`
	UpdatedAt   int64  `gorm:"autoUpdateTime:milli" json:"updated_at"`
}

func (Project) TableName() string {
	return "projects"
}

type CreateProjectInput struct {
	Name        string `json:"name" binding:"required"`
	Color       string `json:"color"`
	Description string `json:"description"`
}

type UpdateProjectInput struct {
	Name        *string `json:"name"`
	Color       *string `json:"color"`
	Description *string `json:"description"`
	SortOrder   *int    `json:"sort_order"`
}

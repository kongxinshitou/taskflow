package models

type User struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"uniqueIndex;not null" json:"username"`
	Password  string    `gorm:"not null" json:"-"`
	Email     string    `json:"email,omitempty"`
	CreatedAt int64     `gorm:"autoCreateTime:milli" json:"created_at"`
	UpdatedAt int64     `gorm:"autoUpdateTime:milli" json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}

type RegisterInput struct {
	Username string `json:"username" binding:"required,min=2,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	Email    string `json:"email" binding:"omitempty,email"`
}

type LoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email,omitempty"`
}

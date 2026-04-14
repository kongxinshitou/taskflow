package models

import (
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(dbPath string) {
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("[DB] Failed to connect: %v", err)
	}

	// Enable WAL mode and foreign keys
	DB.Exec("PRAGMA journal_mode=WAL")
	DB.Exec("PRAGMA foreign_keys=ON")

	// Auto migrate all models
	if err := DB.AutoMigrate(&User{}, &Project{}, &Task{}, &Activity{}); err != nil {
		log.Fatalf("[DB] AutoMigrate failed: %v", err)
	}

	log.Println("[DB] Initialized at:", dbPath)
}

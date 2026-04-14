package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port     string
	DBPath   string
	JWTSecret string
}

var AppConfig *Config

func Load() {
	AppConfig = &Config{
		Port:      getEnv("PORT", "8080"),
		DBPath:    getEnv("DB_PATH", "taskflow.db"),
		JWTSecret: getEnv("JWT_SECRET", "taskflow-default-secret-change-me"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if n, err := strconv.Atoi(val); err == nil {
			return n
		}
	}
	return fallback
}

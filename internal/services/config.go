package services

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/fossinvoice/fossinvoice/internal/i18n"
)

// AppConfig holds user-level application settings.
type AppConfig struct {
	Language string `json:"language"`
}

type ConfigService struct{}

func configDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "FOSSInvoice"), nil
}

func configPath() (string, error) {
	d, err := configDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(d, "config.json"), nil
}

func loadConfig() (AppConfig, error) {
	var cfg AppConfig
	p, err := configPath()
	if err != nil {
		return cfg, err
	}
	b, err := os.ReadFile(p)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return cfg, nil // default empty config
		}
		return cfg, err
	}
	if len(b) == 0 {
		return cfg, nil
	}
	if err := json.Unmarshal(b, &cfg); err != nil {
		return cfg, err
	}
	return cfg, nil
}

func saveConfig(cfg AppConfig) error {
	p, err := configPath()
	if err != nil {
		return err
	}
	if err := ensureDir(filepath.Dir(p)); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o600)
}

// GetLanguage returns the persisted language or empty string if not set.
func (s *ConfigService) GetLanguage() (string, error) {
	cfg, err := loadConfig()
	if err != nil {
		return "", err
	}
	lang := strings.TrimSpace(cfg.Language)
	if lang == "" {
		return "", nil
	}
	return i18n.Normalize(lang), nil
}

// SetLanguage persists the application language.
func (s *ConfigService) SetLanguage(lang string) (bool, error) {
	cfg, err := loadConfig()
	if err != nil {
		return false, err
	}
	cfg.Language = i18n.Normalize(lang)
	if err := saveConfig(cfg); err != nil {
		return false, err
	}
	return true, nil
}

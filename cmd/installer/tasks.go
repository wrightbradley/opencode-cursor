// cmd/installer/tasks.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

func (m model) startInstallation() (tea.Model, tea.Cmd) {
	m.step = stepInstalling

	m.tasks = []installTask{
		{name: "Check prerequisites", description: "Verifying bun and cursor-agent", execute: checkPrerequisites, status: statusPending},
		{name: "Build plugin", description: "Running bun install && bun run build", execute: buildPlugin, status: statusPending},
		{name: "Install ACP SDK", description: "Adding @agentclientprotocol/sdk to opencode", execute: installAcpSdk, status: statusPending},
		{name: "Create symlink", description: "Linking to OpenCode plugin directory", execute: createSymlink, status: statusPending},
		{name: "Update config", description: "Adding cursor-acp provider to opencode.json", execute: updateConfig, status: statusPending},
		{name: "Validate config", description: "Checking JSON syntax", execute: validateConfig, status: statusPending},
		{name: "Verify plugin loads", description: "Checking if plugin appears in opencode", execute: verifyPostInstall, optional: true, status: statusPending},
	}

	m.currentTaskIndex = 0
	m.tasks[0].status = statusRunning
	return m, tea.Batch(m.spinner.Tick, executeTaskCmd(0, &m))
}

func executeTaskCmd(index int, m *model) tea.Cmd {
	return func() tea.Msg {
		if index >= len(m.tasks) {
			return taskCompleteMsg{index: index, success: true}
		}

		task := &m.tasks[index]
		err := task.execute(m)

		if err != nil {
			return taskCompleteMsg{
				index:   index,
				success: false,
				err:     err.Error(),
			}
		}

		return taskCompleteMsg{index: index, success: true}
	}
}

func checkPrerequisites(m *model) error {
	if !commandExists("bun") {
		return fmt.Errorf("bun not found - install with: curl -fsSL https://bun.sh/install | bash")
	}
	if !commandExists("cursor-agent") {
		return fmt.Errorf("cursor-agent not found - install with: curl -fsS https://cursor.com/install | bash")
	}
	return nil
}

func removeOldCursorAcpProvider(m *model) error {
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	var config map[string]interface{}
	json.Unmarshal(data, &config)

	providers, ok := config["provider"].(map[string]interface{})
	if !ok {
		return nil
	}

	oldProvider, exists := providers["cursor-acp"]
	if !exists {
		return nil
	}

	if oldNpm, ok := oldProvider.(map[string]interface{})["npm"].(string); ok && oldNpm == "@ai-sdk/openai-compatible" {
		delete(providers, "cursor-acp")

		output, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to serialize config: %w", err)
		}

		if err := os.WriteFile(m.configPath, output, 0644); err != nil {
			return fmt.Errorf("failed to write config: %w", err)
		}

		return nil
	}

	return nil
}

func validateConfigAfterUninstall(m *model) error {
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	var config map[string]interface{}
	json.Unmarshal(data, &config)

	providers, ok := config["provider"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("provider section missing from config")
	}

	return nil
}

func validateConfig(m *model) error {
	if err := validateJSON(m.configPath); err != nil {
		return fmt.Errorf("config validation failed: %w", err)
	}

	return nil
}
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	var config map[string]interface{}
	json.Unmarshal(data, &config)

	providers, ok := config["provider"].(map[string]interface{})
	if !ok {
		return nil
	}

	oldProvider, exists := providers["cursor-acp"]
	if !exists {
		return nil
	}

	if oldNpm, ok := oldProvider.(map[string]interface{})["npm"].(string); ok && oldNpm == "@ai-sdk/openai-compatible" {
		delete(providers, "cursor-acp")

		output, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to write config: %w", err)
		}

		if err := os.WriteFile(m.configPath, output, 0644); err != nil {
			return fmt.Errorf("failed to write config: %w", err)
		}

		fmt.Println("Removed old cursor-acp provider (was using @ai-sdk/openai-compatible)")
	}

	return nil
}

func removeOldCursorAcpProvider(m *model) error {
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	var config map[string]interface{}
	json.Unmarshal(data, &config)

	providers, ok := config["provider"].(map[string]interface{})
	if !ok {
		return nil // No provider section is OK
	}

	// Check if old cursor-acp exists
	oldProvider, exists := providers["cursor-acp"]
	if !exists {
		return nil // No old provider to remove
	}

	// Check if it's using the old wrong npm package
	if oldNpm, ok := oldProvider.(map[string]interface{})["npm"].(string); ok && oldNpm == "@ai-sdk/openai-compatible" {
		// Remove the old provider
		delete(providers, "cursor-acp")

		// Write back
		output, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to serialize config: %w", err)
		}

		if err := os.WriteFile(m.configPath, output, 0644); err != nil {
			return fmt.Errorf("failed to write config: %w", err)
		}

		fmt.Println("Removed old cursor-acp provider (was using @ai-sdk/openai-compatible)")
	}

	return nil
}

// Verify cursor-acp provider exists in config
func validateConfig(m *model) error {
	if err := validateJSON(m.configPath); err != nil {
		return fmt.Errorf("config validation failed: %w", err)
	}

	return nil
}

func verifyPlugin(m *model) error {
	// Try to load plugin with node to catch syntax/import errors
	pluginPath := filepath.Join(m.projectDir, "dist", "index.js")
	cmd := exec.Command("node", "-e", fmt.Sprintf(`require("%s")`, pluginPath))
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("plugin failed to load: %w", err)
	}

	// Check cursor-agent responds
	cmd = exec.Command("cursor-agent", "--version")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("cursor-agent not responding")
	}

	return nil
}

func verifyPostInstall(m *model) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "opencode", "models")
	output, err := cmd.CombinedOutput()

	cancel()

	if err != nil {
		return fmt.Errorf("failed to run opencode models: %w. Output: %s", err, string(output))
	}

	if strings.Contains(string(output), "cursor-acp") {
		return nil
	}

	return fmt.Errorf("cursor-acp provider not found - plugin may not be installed correctly. OpenCode output: %s", string(output))
}

// Backup and restore functions
func createBackup(m *model, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("failed to read file for backup: %w", err)
	}

	m.backupFiles[path] = data
	return nil
}

func restoreBackup(m *model, path string) error {
	if backupData, exists := m.backupFiles[path]; exists {
		if err := os.WriteFile(path, backupData, 0644); err != nil {
			return fmt.Errorf("failed to restore backup: %w", err)
		}
		delete(m.backupFiles, path)
	}
	return nil
}

func restoreAllBackups(m *model) error {
	for path, data := range m.backupFiles {
		if err := os.WriteFile(path, data, 0644); err != nil {
			return fmt.Errorf("failed to restore %s: %w", path, err)
		}
	}
	m.backupFiles = make(map[string][]byte)
	return nil
}

func cleanupBackups(m *model) {
	for path := range m.backupFiles {
		os.Remove(path)
	}
	m.backupFiles = make(map[string][]byte)
}

// Uninstall functions
func (m model) startUninstallation() (tea.Model, tea.Cmd) {
	m.step = stepUninstalling
	m.isUninstall = true

	m.tasks = []installTask{
		{name: "Remove plugin symlink", description: "Removing cursor-acp.js from plugin directory", execute: removeSymlink, status: statusPending},
		{name: "Remove ACP SDK", description: "Removing @agentclientprotocol/sdk from opencode", execute: removeAcpSdk, status: statusPending},
		{name: "Remove provider config", description: "Removing cursor-acp from opencode.json", execute: removeProviderConfig, status: statusPending},
		{name: "Remove old plugin", description: "Removing opencode-cursor-auth if present", execute: removeOldPlugin, status: statusPending},
		{name: "Validate config", description: "Checking JSON syntax", execute: validateConfigAfterUninstall, status: statusPending},
	}

	m.currentTaskIndex = 0
	m.tasks[0].status = statusRunning
	return m, tea.Batch(m.spinner.Tick, executeTaskCmd(0, &m))
}

func removeSymlink(m *model) error {
	symlinkPath := filepath.Join(m.pluginDir, "cursor-acp.js")

	// Check if symlink exists
	if _, err := os.Lstat(symlinkPath); os.IsNotExist(err) {
		// Symlink doesn't exist, that's fine - already uninstalled
		return nil
	}

	// Remove symlink
	if err := os.Remove(symlinkPath); err != nil {
		return fmt.Errorf("failed to remove symlink: %w", err)
	}

	return nil
}

func removeAcpSdk(m *model) error {
	configDir, _ := getConfigDir()
	opencodeConfigDir := filepath.Join(configDir, "opencode")
	acpPath := filepath.Join(opencodeConfigDir, "node_modules", "@agentclientprotocol", "sdk")

	if _, err := os.Stat(acpPath); os.IsNotExist(err) {
		return nil
	}

	packageJsonPath := filepath.Join(opencodeConfigDir, "package.json")
	if _, err := os.Stat(packageJsonPath); err == nil {
		if err := createBackup(m, packageJsonPath); err != nil {
			return fmt.Errorf("failed to backup package.json: %w", err)
		}

		data, err := os.ReadFile(packageJsonPath)
		if err != nil {
			return fmt.Errorf("failed to read package.json: %w", err)
		}

		var packageJson map[string]interface{}
		if err := json.Unmarshal(data, &packageJson); err != nil {
			return fmt.Errorf("failed to parse package.json: %w", err)
		}

		if dependencies, ok := packageJson["dependencies"].(map[string]interface{}); ok {
			if _, hasAcpSdk := dependencies["@agentclientprotocol/sdk"]; hasAcpSdk {
				delete(dependencies, "@agentclientprotocol/sdk")
				packageJson["dependencies"] = dependencies

				output, err := json.MarshalIndent(packageJson, "", "  ")
				if err != nil {
					return fmt.Errorf("failed to serialize package.json: %w", err)
				}

				if err := os.WriteFile(packageJsonPath, output, 0644); err != nil {
					return fmt.Errorf("failed to write package.json: %w", err)
				}
			}
		}
	}

	if err := os.RemoveAll(filepath.Join(opencodeConfigDir, "node_modules", "@agentclientprotocol")); err != nil {
		return fmt.Errorf("failed to remove ACP SDK: %w", err)
	}

	return nil
}

func removeProviderConfig(m *model) error {
	if err := createBackup(m, m.configPath); err != nil {
		return fmt.Errorf("failed to backup config: %w", err)
	}

	// Read existing config
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("failed to read config: %w", err)
	}

	var config map[string]interface{}
	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("failed to parse config: %w", err)
	}

	// Remove cursor-acp provider
	if providers, ok := config["provider"].(map[string]interface{}); ok {
		if _, exists := providers["cursor-acp"]; exists {
			delete(providers, "cursor-acp")
		}
	}

	// Write config back
	output, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to serialize config: %w", err)
	}

	if err := os.WriteFile(m.configPath, output, 0644); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	return nil
}

func removeOldCursorAcpProvider(m *model) error {
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	var config map[string]interface{}
	json.Unmarshal(data, &config)

	providers, ok := config["provider"].(map[string]interface{})
	if !ok {
		return nil
	}

	oldProvider, exists := providers["cursor-acp"]
	if !exists {
		return nil
	}

	if oldNpm, ok := oldProvider.(map[string]interface{})["npm"].(string); ok && oldNpm == "@ai-sdk/openai-compatible" {
		delete(providers, "cursor-acp")

		output, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to serialize config: %w", err)
		}

		if err := os.WriteFile(m.configPath, output, 0644); err != nil {
			return fmt.Errorf("failed to write config: %w", err)
		}

		return nil
	}

	return nil
}

func validateConfig(m *model) error {
	if err := validateJSON(m.configPath); err != nil {
		return fmt.Errorf("config validation failed: %w", err)
	}

	// Verify cursor-acp provider is removed
	data, _ := os.ReadFile(m.configPath)
	var config map[string]interface{}
	json.Unmarshal(data, &config)

	if providers, ok := config["provider"].(map[string]interface{}); ok {
		if _, exists := providers["cursor-acp"]; exists {
			return fmt.Errorf("cursor-acp provider still exists in config")
		}
	}

	return nil
}

func removeOldPlugin(m *model) error {
	configDir, _ := getConfigDir()
	configPath := filepath.Join(configDir, "opencode", "opencode.json")

	if err := createBackup(m, configPath); err != nil {
		return fmt.Errorf("failed to backup config: %w", err)
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("failed to read config: %w", err)
	}

	var config map[string]interface{}
	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("failed to parse config: %w", err)
	}

	if plugins, ok := config["plugin"].([]interface{}); ok {
		var newPlugins []interface{}
		for _, p := range plugins {
			pluginStr, ok := p.(string)
			if !ok {
				continue
			}
			if !strings.HasPrefix(pluginStr, "opencode-cursor-auth") {
				newPlugins = append(newPlugins, pluginStr)
			}
		}
		config["plugin"] = newPlugins
	}

	output, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to serialize config: %w", err)
	}

	if err := os.WriteFile(configPath, output, 0644); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	cacheDir := filepath.Join(os.Getenv("HOME"), ".cache", "opencode", "node_modules")
	oldPluginPath := filepath.Join(cacheDir, "opencode-cursor-auth")
	if _, err := os.Stat(oldPluginPath); err == nil {
		if err := os.RemoveAll(oldPluginPath); err != nil {
			return fmt.Errorf("failed to remove old plugin from cache: %w", err)
		}
	}

	return nil
}

func (m model) handleTaskComplete(msg taskCompleteMsg) (tea.Model, tea.Cmd) {
	if msg.index >= len(m.tasks) {
		m.step = stepComplete
		return m, nil
	}

	task := &m.tasks[msg.index]

	if msg.success {
		task.status = statusComplete
	} else {
		task.status = statusFailed
		task.errorDetails = &errorInfo{
			message: msg.err,
			logFile: m.logFile.Name(),
		}

		if !task.optional && len(m.backupFiles) > 0 && !m.isUninstall {
			if err := restoreAllBackups(&m); err != nil {
				m.errors = append(m.errors, msg.err+" (rollback failed: "+err.Error())
			} else {
				m.errors = append(m.errors, msg.err+" (rolled back)")
			}
		}

		if !task.optional {
			m.errors = append(m.errors, msg.err)
			m.step = stepComplete
			return m, nil
		}
	}

	// Move to next task
	m.currentTaskIndex++
	if m.currentTaskIndex >= len(m.tasks) {
		cleanupBackups(&m)
		m.step = stepComplete
		return m, nil
	}

	m.tasks[m.currentTaskIndex].status = statusRunning
	return m, executeTaskCmd(m.currentTaskIndex, &m)
}

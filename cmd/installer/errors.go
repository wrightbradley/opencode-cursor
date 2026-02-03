package main

import (
	"fmt"
	"strings"
)

type InstallerError struct {
	Category    string
	Message     string
	Details     string
	RawOutput   string
	Cause       error
	Recoverable bool
}

func (e *InstallerError) Error() string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("[%s] %s", e.Category, e.Message))
	if e.Details != "" {
		b.WriteString(fmt.Sprintf(": %s", e.Details))
	}
	if e.Cause != nil {
		b.WriteString(fmt.Sprintf(" (cause: %v)", e.Cause))
	}
	return b.String()
}

func (e *InstallerError) Unwrap() error {
	return e.Cause
}

func NewParseError(msg, rawOutput string, cause error) *InstallerError {
	return &InstallerError{
		Category:    "PARSE",
		Message:     msg,
		RawOutput:   rawOutput,
		Cause:       cause,
		Recoverable: false,
	}
}

func NewConfigError(msg, path string, cause error) *InstallerError {
	return &InstallerError{
		Category:    "CONFIG",
		Message:     msg,
		Details:     path,
		Cause:       cause,
		Recoverable: true,
	}
}

func NewExecError(msg, output string, cause error) *InstallerError {
	return &InstallerError{
		Category:    "EXEC",
		Message:     msg,
		RawOutput:   output,
		Cause:       cause,
		Recoverable: false,
	}
}

func NewValidationError(msg, details string, cause error) *InstallerError {
	return &InstallerError{
		Category:    "VALIDATE",
		Message:     msg,
		Details:     details,
		Cause:       cause,
		Recoverable: true,
	}
}

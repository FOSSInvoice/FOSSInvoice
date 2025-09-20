package services

import (
	"github.com/wailsapp/wails/v3/pkg/application"
)

type DialogResponse struct {
	Path  string
	Error error
}

type DialogsService struct{}

// OpenFile opens a file dialog and returns the selected file path. If cancelled path is empty.
func (ds *DialogsService) OpenFolder(basePath string) DialogResponse {
	dialog := application.OpenFileDialog()
	dialog.SetTitle("Select a folder")
	dialog.SetOptions(&application.OpenFileDialogOptions{
		CanChooseFiles:       false,
		CanChooseDirectories: true,
		Directory:            basePath,
	})

	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		// capture the error if the user cancels the dialog
		if err.Error() == "cancelled by user" {
			return DialogResponse{}
		}
		return DialogResponse{Error: err}
	}
	return DialogResponse{Path: path}
}

func (ds *DialogsService) SelectFile(basePath string, displayName string, pattern string) DialogResponse {
	dialog := application.OpenFileDialog()
	dialog.SetTitle("Select a folder")
	dialog.SetOptions(&application.OpenFileDialogOptions{
		CanChooseFiles:          true,
		AllowsMultipleSelection: false,
		CanChooseDirectories:    false,
		Directory:               basePath,
		Filters: []application.FileFilter{
			{
				DisplayName: displayName,
				Pattern:     pattern,
			}},
	})

	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		// capture the error if the user cancels the dialog
		if err.Error() == "cancelled by user" {
			return DialogResponse{}
		}
		return DialogResponse{Error: err}
	}
	return DialogResponse{Path: path}
}

func (ds *DialogsService) SelectSaveFile(basePath string, displayName string, pattern string) DialogResponse {
	dialog := application.SaveFileDialog()
	dialog.SetOptions(&application.SaveFileDialogOptions{
		CanCreateDirectories: true,
		Directory:            basePath,
		Filters: []application.FileFilter{
			{
				DisplayName: displayName,
				Pattern:     pattern,
			}},
	})

	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		// capture the error if the user cancels the dialog
		if err.Error() == "cancelled by user" {
			return DialogResponse{}
		}
		return DialogResponse{Error: err}
	}
	return DialogResponse{Path: path}
}

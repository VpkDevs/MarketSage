# Files to keep
$keep_files = @(
    "documentation/consolidated/project_overview.md",
    ".gitignore"
)

# Remove redundant documentation
Remove-Item -Path "documentation/TODO.md" -Force
Remove-Item -Path "documentation/project_improvement_plan.md" -Force
Remove-Item -Path "documentation/improvement_checklist.md" -Force
Remove-Item -Path "documentation/project_progress.txt" -Force
Remove-Item -Path "documentation/PBTs.md" -Force
Remove-Item -Path "documentation/SynergyShop_README.md" -Force
Remove-Item -Path "documentation/SynergyShop_Idea_Rewrite.md" -Force
Remove-Item -Path "documentation/week1_tasks.md" -Force
Remove-Item -Path "documentation/planning/development_plan.md" -Force
Remove-Item -Path "documentation/consolidated_documentation.md" -Force
Remove-Item -Path "documentation/project_structure.md" -Force
Remove-Item -Path "PBTs.md" -Force
Remove-Item -Path "TODO.md" -Force

# Clean up empty directories
Get-ChildItem -Path "documentation" -Directory -Recurse | 
    Where-Object { (Get-ChildItem -Path $_.FullName -Recurse -File).Count -eq 0 } |
    Remove-Item -Recurse -Force

Write-Host "Documentation cleanup complete. Only consolidated project overview remains."
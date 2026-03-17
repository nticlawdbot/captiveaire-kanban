# CaptiveAire Kanban Board

Interactive kanban board for managing CaptiveAire sales pipeline, project execution, and operations tasks.

## Features

- ✅ **Drag-and-drop** cards between columns
- 👤 **Team assignment** (Mike, Joe, Dan, Austin)
- 📊 **Multiple workflows:**
  - Sales Pipeline: Backlog → Qualified → Proposed → Won
  - Project Execution: Pre-Kickoff → In Progress → Awaiting Client → Complete
  - Operations: To Do → In Progress → Blocked → Done
- 🔄 **On-demand Smartsheet sync** (pull live data)
- 💾 **Local storage** persists cards across sessions
- 🎯 **Manual card management** (add, edit, delete)

## Live URL

Visit: **[https://nticlawdbot.github.io/captiveaire-kanban](https://nticlawdbot.github.io/captiveaire-kanban)**

## How to Use

### Adding a Task
1. Click the **"+ Add Card"** button in the header
2. Fill in column, company, location, job #, and assignee
3. Click **Add Card**

### Moving Cards
- **Drag and drop** cards between columns
- Assignee stays with the card

### Assigning to Team
- Use the **dropdown** on each card to assign to: Mike, Joe, Dan, or Austin

### Syncing Smartsheet
- Click **"🔄 Sync Smartsheet"** to pull live project data
- Data merges with your existing cards
- Smartsheet becomes the source of truth for active projects

## Integration (Coming Soon)

### Smartsheet Sync
- Sheet ID: `3675420223295364`
- Pull active projects by STATUS + Milestone column
- Auto-map to kanban lanes

### Pipedrive Integration  
- Pull deals from stages: Qualified, Proposed, Won, Active Project
- Map to sales pipeline columns
- Expected Q1 2026

## Data Storage

- **Cards**: Stored in browser localStorage (survives page refreshes)
- **Sync**: On-demand via Smartsheet API
- **Backup**: Commit/push changes to GitHub for version control

## Team Access

Share this URL with your team:
- Mike
- Joe  
- Dan
- Austin

All changes are local to each user's browser unless you sync with Smartsheet.

## Development

Built with vanilla HTML/CSS/JavaScript. No dependencies, no build process.

To run locally:
```bash
git clone https://github.com/nticlawdbot/captiveaire-kanban.git
cd captiveaire-kanban
open index.html
```

## Next Steps

1. ✅ Review kanban layout and workflows
2. ⏳ Connect Smartsheet API for live data sync
3. ⏳ Add Pipedrive integration
4. ⏳ Set up automated daily updates (cron)
5. ⏳ Add project templates for faster task creation

---

**Built for:** CaptiveAire Sales Team  
**Last Updated:** February 15, 2026

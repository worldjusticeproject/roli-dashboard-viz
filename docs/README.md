# Documentation

This folder contains all project documentation organized by role.

## 📁 Structure

```
docs/
├── designer/          # Documentation for designers
│   ├── START_HERE.md                    # 🎯 Quick setup guide (START HERE!)
│   ├── CLAUDE_CODE_SETUP.md             # How to use Claude Code locally
│   ├── DESIGNER_README.md               # Designer role context for Claude Code
│   ├── DESIGN_GUIDE.md                  # Complete design workflow
│   ├── DESIGN_FILES_REFERENCE.md        # File-by-file reference
│   └── EMAIL_TEMPLATE_DESIGNER.md       # Onboarding email template
│
├── maintainer/        # Documentation for main user/maintainer
│   ├── SYNC_GUIDE.md                    # Branch synchronization guide
│   └── MAIN_USER_WORKFLOW.md            # Daily workflow reference
│
└── security/          # Security documentation
    └── SECURITY.md                      # Security measures and policies
```

## 🎨 For Designers

**Start here:** [`designer/START_HERE.md`](designer/START_HERE.md)

This guide will walk you through:
- Initial setup (Git, Node.js, VS Code)
- Installing Claude Code (your AI assistant)
- Understanding your workflow
- Making your first design changes

**Other useful guides:**
- **Claude Code Setup:** [`designer/CLAUDE_CODE_SETUP.md`](designer/CLAUDE_CODE_SETUP.md)
- **Complete Workflow:** [`designer/DESIGN_GUIDE.md`](designer/DESIGN_GUIDE.md)
- **File Reference:** [`designer/DESIGN_FILES_REFERENCE.md`](designer/DESIGN_FILES_REFERENCE.md)

## 🔧 For Main User/Maintainer

**2026 data release and future updates:** [`maintainer/DATA_UPDATES.md`](maintainer/DATA_UPDATES.md)

**Daily workflow:** [`maintainer/MAIN_USER_WORKFLOW.md`](maintainer/MAIN_USER_WORKFLOW.md)

**Branch synchronization:** [`maintainer/SYNC_GUIDE.md`](maintainer/SYNC_GUIDE.md)

## 🔒 Security

**Security documentation:** [`security/SECURITY.md`](security/SECURITY.md)

This guide covers:
- HTTP security headers (CSP, X-Frame-Options, etc.)
- Dependency vulnerability management
- Code security practices
- Security audit commands
- Known limitations and mitigations

## 📚 Main Project Documentation

For technical documentation about the project architecture, see the root-level files:
- [`../CLAUDE.md`](../CLAUDE.md) — Claude Code guidance and project context
- [`../README.md`](../README.md) — Project overview and setup

## 🤝 Collaboration Model

This project uses a two-branch workflow:
- **`main`** — Production branch (protected, requires PR approval)
- **`design`** — Designer's working branch

**Workflow:**
1. Designer makes changes on `design` branch
2. Designer creates Pull Request to `main`
3. Main user reviews and merges
4. Main user syncs `design` branch with `main`
5. Designer pulls latest changes and continues work

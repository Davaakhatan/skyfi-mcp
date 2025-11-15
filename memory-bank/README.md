# SkyFi MCP Memory Bank

This directory contains the Memory Bank for the SkyFi MCP project - a comprehensive knowledge base that persists across AI sessions.

## Structure

The Memory Bank consists of six core files that build upon each other:

```
projectbrief.md → Foundation document defining core requirements
    ├── productContext.md → Why the project exists, problems it solves
    ├── systemPatterns.md → Architecture and design patterns
    └── techContext.md → Technologies, setup, constraints
        └── activeContext.md → Current work focus and next steps
            └── progress.md → What works, what's left, status
```

## Core Files

### 1. projectbrief.md
**Foundation document** - The source of truth for project scope
- Project overview and mission
- Primary objectives
- Problem statement and solution
- Success metrics
- Project scope (in/out)
- Timeline and stakeholders

### 2. productContext.md
**Product vision** - Why this project exists
- Problems it solves for each user persona
- How it should work (user flows)
- User experience goals
- Key value propositions
- Success indicators

### 3. systemPatterns.md
**Architecture documentation** - Technical design patterns
- System architecture overview
- Key technical decisions
- Design patterns in use
- Component relationships
- Data flow patterns
- Integration patterns

### 4. techContext.md
**Technical specifications** - Technologies and constraints
- Technologies used
- Development setup
- Technical constraints
- Dependencies
- API specifications
- Deployment options

### 5. activeContext.md
**Current state** - What's happening now
- Current work focus
- Recent changes
- Next steps
- Active decisions and considerations
- Blockers and risks
- Key questions to resolve

### 6. progress.md
**Status tracking** - What's done and what's left
- Project status
- What works (completed)
- What's left to build
- Current status by component
- Known issues
- Milestones and metrics

## Usage

These files are read at the start of every AI session to provide context. They should be updated:
- When discovering new project patterns
- After implementing significant changes
- When explicitly requested with "update memory bank"
- When context needs clarification

## Maintenance

- **Review Frequency**: Weekly during active development
- **Update Triggers**: Major milestones, architecture changes, new requirements
- **Ownership**: Product and Engineering teams

---

**Last Updated**: January 2025


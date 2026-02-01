---
name: 1k-agent-session
description: AI Agent Authorization & Session Management for OneKey. Use when implementing AI agent authorization, session keys, vault contracts, sub-wallet isolation, or when working with AI → Skill → App flow. Agent session. AI authorization. Session key. Vault contract.
allowed-tools: Read, Grep, Glob, Write
---

# AI Agent Session & Authorization

Guides for implementing AI Agent authorization and session management in OneKey App.

## Quick Reference

| Feature | Guide | Key Files |
|---------|-------|-----------|
| Agent Session Skill | [agent-session-skill.md](references/rules/agent-session-skill.md) | `packages/kit/src/views/AgentSession/skills/` |
| Authorization Modes | [authorization-modes.md](references/rules/authorization-modes.md) | `packages/kit/src/views/AgentSession/utils/modeSelection.ts` |
| AI → Skill → App Flow | [ai-to-app-flow.md](references/rules/ai-to-app-flow.md) | `packages/kit/src/views/AgentSession/` |

## Agent Session Skill

See: [references/rules/agent-session-skill.md](references/rules/agent-session-skill.md)

**Core functions:**
- `demoAuthorizationScenario()` - Entry function for demo scenarios
- `chooseMode(chainId, action)` - Automatic mode selection (A/B/C)
- `runModeA()` - Isolated sub-wallet execution
- `runModeB()` - Vault contract execution
- `runModeC()` - AA + Session Key execution

## Authorization Modes

See: [references/rules/authorization-modes.md](references/rules/authorization-modes.md)

**Three authorization modes:**
- **Mode A**: Isolated Sub-Wallet - Dedicated wallet with fixed balance
- **Mode B**: Vault Contract - Smart contract with spending limits
- **Mode C**: Session Key (AA) - Account Abstraction with scoped permissions

**Automatic selection logic:**
- Ethereum + swap → Mode C (Session Key)
- Polygon + transfer → Mode B (Vault Contract)
- Non-AA chain → Mode A (Isolated Sub-Wallet)

## AI → Skill → App Flow

See: [references/rules/ai-to-app-flow.md](references/rules/ai-to-app-flow.md)

**Flow:**
1. AI receives user intent
2. AI calls Skill function with parameters
3. Skill analyzes chain capabilities and action type
4. Skill selects appropriate authorization mode
5. Skill calls OneKey App API
6. App displays authorization modal (1Password-style)
7. User confirms/rejects
8. App executes transaction if confirmed
9. Result returned to AI via Skill

## Related Skills

- `/1k-feature-guides` - General feature development guides
- `/1k-coding-patterns` - React and TypeScript patterns
- `/1k-state-management` - Jotai state management

# OneKey Agent Session Demo Task

You are in the patrickchoo/app-monorepo repository, on branch feat/agent-session.

## Goal

Introduce an **AI Agent Authorization & Execution Demo** inside OneKey App that demonstrates:

- AI can call OneKey App via Skills
- OneKey App is the **authorization, risk, and signing authority**
- No manual A/B/C mode switching in UI
- Authorization mode is **automatically selected by AI + Skill logic**

## Authorization Modes

### Mode A — Isolated Sub‑Wallet
- Create an isolated wallet for AI
- Transfer a fixed amount (e.g. 0.1 ETH) from the main wallet
- AI can only spend the balance of this wallet

### Mode B — Vault Contract
- Funds are deposited into a Vault smart contract
- Vault enforces rules: Spending limits, Contract/method whitelist
- AI executes transactions through the Vault

### Mode C — Account Abstraction + Session Key
- Use AA wallet (ERC‑4337 or native AA)
- Generate a **Session Key** for AI with: Method scope, Spending limit, TTL
- AI can auto-execute within scope

## Core Design Principles

1. No manual mode switch in settings
2. Skill decides which mode to use
3. OneKey App: Authorization center, Risk engine, Signing authority
4. Skill: Bridge between AI and OneKey App, Capability & chain-aware router

## What to Generate

### 1️⃣ OneKey App Changes
- Add Agent Session / AI Authorization Demo module
- Display: Active AI authorizations, Remaining allowance, Authorization source, Chosen mode
- Show confirmation modal on authorization request (1Password style)

### 2️⃣ Skill Generation
Create Skill code with:
- demoAuthorizationScenario() - entry function
- chooseMode() - automatic mode selection
- runModeA(), runModeB(), runModeC() - execution functions

### 3️⃣ Documentation
Document the AI Agent → Skill → OneKey App flow in README

### 4️⃣ Demo Scenarios
- Ethereum + swap → Mode C
- Polygon + transfer → Mode B  
- Non‑AA chain → Mode A

## Output Rules
- Generate actual code inside this repo
- Include App changes, Skill code, README
- Commit your changes when done

When completely finished, run: clawdbot gateway wake --text "Done: OneKey Agent Session Demo completed" --mode now

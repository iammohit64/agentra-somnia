<div align="center">

<img src="https://img.shields.io/badge/Somnia-Testnet-6C3AFF?style=for-the-badge&logo=ethereum&logoColor=white"/>
<img src="https://img.shields.io/badge/OpenZeppelin-4.x-4E5EE4?style=for-the-badge&logo=openzeppelin&logoColor=white"/>
<img src="https://img.shields.io/badge/Solidity-0.8.x-363636?style=for-the-badge&logo=solidity&logoColor=white"/>
<img src="https://img.shields.io/badge/Foundry-Deployed-orange?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Somnia-Reactivity-00E5FF?style=for-the-badge"/>

<br/><br/>

# ⚡ Agentra
### *The Autonomous AI Agent Economy — Powered by Somnia Reactivity*

**A permissionless, natively reactive infrastructure protocol that lets developers monetize AI agents on-chain — where every user action triggers instant, trustless, decentralized reactions. No backends. No cron jobs. Pure on-chain autonomy.**

<br/>

[🚀 Live Demo](https://agentra-somnia.vercel.app/) &nbsp;·&nbsp; [🎬 Watch Demo](https://canva.link/l81k8kuq5uwrqgf) &nbsp;·&nbsp; [📦 GitHub Repo](https://github.com/iammohit64/agentra-somnia.git) &nbsp;·&nbsp; [🔗 Marketplace Contract](https://shannon.explorer.somnia.network/address/0x37bF6Fa744faf5E1d5eb563559818373901d4499) &nbsp;·&nbsp; [🪙 AGT Token](https://shannon.explorer.somnia.network/address/0x04c293572ADea2d3D52A623C4B49D4C6fEdA569d) &nbsp;·&nbsp; [⚡ Reactor Contract](https://shannon.explorer.somnia.network/address/0x24e656c6bb05F36F255Eb72CD86562E6b4704D94)

</div>
---

## The Real Problem Nobody Is Solving

There are thousands of developers right now building genuinely brilliant AI workflows — automating research, coding, customer support, data pipelines — using tools like LangChain, AutoGen, and MCP. They share them on GitHub, maybe tweet about them, and then... nothing. No way to charge for them. No distribution. No trust layer.

Meanwhile, users who want to access these agents are scattered across 10 different SaaS dashboards with 10 different subscriptions, zero guarantees about uptime or quality, and no way to verify if an agent actually does what it claims.

This is a coordination failure. And it's fixable.

The existing "solutions" — OpenAI's GPT Store, Hugging Face Spaces — are walled gardens. The developer doesn't control pricing. The platform takes the lion's share. Users are locked in. There's no transparency on performance, and there's certainly no on-chain accountability.

**Agentra is the open alternative.** Not just a marketplace — a fully reactive, autonomous infrastructure layer for the AI agent economy.

---

## What Changed: The Somnia Reactivity Pivot

Before Somnia, Agentra was a good Web3 marketplace. After Somnia, it became something fundamentally different: **a self-governing, autonomous protocol that reacts to user actions in real time without any centralized server controlling its state.**

Here's the old architecture:

> User upvotes agent → Frontend calls backend → Backend listens to EVM events via cron job → Backend calculates logic → Backend issues centralized transaction → State updates

Here's the new architecture:

> User upvotes agent → `AgentUpvoted` event emits on-chain → **Somnia Reactor instantly executes** → Agent auto-upgrades autonomously → UI reflects sub-second finality

One of these architectures has a single point of failure. One doesn't. One requires a server to stay online. One doesn't. One can be censored. One can't.

**That's the paradigm shift Somnia's Native On-Chain Reactivity enables — and that's exactly what Agentra is built to demonstrate.**

---

## ⚡ How Somnia Reactivity Powers Agentra

### The AgentraReactor — The Protocol's Brain

We deployed a dedicated reactive smart contract, `AgentraReactor.sol`, that natively listens to events emitted by the main marketplace and responds autonomously. No backend. No oracle. No external trigger.

**Reactive Behavior 1: Auto-Tier Upgrades**

When the `AgentUpvoted` event fires and the upvote count hits 50, the Reactor doesn't wait for a human transaction. It instantly executes `autoUpgradeTier()` on the marketplace contract, upgrading the agent to the Professional tier on-chain. The creator wakes up to a better tier. They didn't have to do anything.

**Reactive Behavior 2: Loyalty VIP Badges**

When the `AccessPurchased` event fires with the `isLifetime` flag set to `true`, the Reactor instantly calls `mintLoyaltyReward()` and issues an on-chain Loyalty VIP Badge to the buyer's wallet. The badge is minted in the same block as the purchase. On Somnia's sub-second finality, this is effectively instant from the user's perspective.

### The `onlyReactor` Security Model

We didn't just add a Reactor and call it a day. We secured the core marketplace contract against human interference on these new functions.

```solidity
modifier onlyReactor() {
    require(msg.sender == reactorAddress, "AgentraMarketplace: caller is not the Reactor");
    _;
}

function autoUpgradeTier(uint256 agentId) external onlyReactor {
    // Only the Somnia Reactor can call this
    // No admin, no owner, no developer can bypass this
}

function mintLoyaltyReward(address recipient) external onlyReactor {
    // Loyalty rewards are 100% governed by on-chain reactivity
    // The protocol's state is trustless by construction
}
```

This is the key design insight: **the `onlyReactor` modifier means the protocol's gamification logic is now enforced by Somnia's network, not by a company's server.** A compromised backend, a downed server, or a malicious admin cannot manipulate tier upgrades or loyalty rewards. The rules live on-chain.

---

## ⚙️ Architecture: From Web2-Dependent to Fully Autonomous

### The Architectural Pivot in Full

| Layer | Before Somnia | After Somnia |
|---|---|---|
| **Tier Upgrades** | Backend cron job watching events | Somnia Reactor fires autonomously |
| **Loyalty Rewards** | Centralized backend transaction | On-chain Reactor, sub-second |
| **State Authority** | Node.js backend owns state | Smart contracts own state |
| **Failure Point** | Backend goes down → no upgrades | No backend → protocol keeps running |
| **Trust Model** | Trust the company's server | Trust the Somnia network |

### Trustless Backend Pruning

We stripped the gamification execution logic from `blockchainService.js` entirely. The backend is now strictly read-only — it syncs `AgentTierUpgraded` and `LoyaltyBadgeAwarded` events from the Reactor into our Prisma/MongoDB database purely for fast frontend loading. The backend **reads** state. It no longer **controls** state.

This is the correct architecture for a trustless protocol. The source of truth is the blockchain.

### Real-Time UX Built for Sub-Second Finality

Somnia's sub-second finality isn't just a spec sheet number — it changes what's possible in the UI. We rebuilt the frontend experience around it:

**Reactivity Progress Bars** — Agent cards now display live upvote progress trackers:
```
⚡ Somnia Auto-Upgrade: 49/50 Upvotes
```

**Optimistic Instant Updates** — When the 50th upvote lands, the UI instantly transitions the agent to Premium tier before the user can blink, paired with a confirmation toast:
```
⚡ Reactivity Triggered: Agent automatically upgraded on-chain!
```

**VIP Badge Display** — Lifetime subscribers see their on-chain loyalty badge rendered immediately in their dashboard, issued by the Reactor in the same block as their purchase.

---

## 🏗️ Smart Contract Architecture

```
contracts/
├── src/
│   ├── AgentToken.sol          # $AGT — ERC20Permit + ERC20Burnable + AccessControl
│   ├── AgentraMarketplace.sol  # Core protocol — SafeERC20, Pausable, AccessControl, onlyReactor
│   └── AgentraReactor.sol      # Somnia Reactive Contract — listens, reacts, executes
├── script/
│   └── Deploy.s.sol            # Foundry deployment script
└── format_deployments.js       # Auto-syncs ABIs + addresses → frontend config
```

### OpenZeppelin Integration

The entire contract architecture is built on composing OpenZeppelin's production-grade primitives:

**`SafeERC20`** — Wraps every token interaction so silent transfer failures (common in non-standard ERC20 implementations) never cause a user to lose funds without getting access.

**`AccessControl` over `Ownable`** — Three distinct roles prevent a single compromised key from being catastrophic:
- `DEFAULT_ADMIN_ROLE` — emergency pauses only. Cold storage.
- `FEE_MANAGER_ROLE` — tier pricing and listing fees. Operational.
- `MINTER_ROLE` — scoped to the token contract exclusively.

**`Pausable`** — `deployAgent`, `purchaseAccess`, and `upvote` are all pause-guarded. In an emergency, a single transaction stops all user fund movement protocol-wide.

**`ERC20Permit` + `ERC20Burnable` on `$AGT`** — Permit enables future gasless approval flows. Burnable enables deflationary tokenomics where protocol fees can be burned, linking usage directly to token value.

---

## 🌍 Live Deployments

Deployed on **Somnia Testnet** (Chain ID: `50312`)

| Contract | Address |
|---|---|
| **AgentToken ($AGT)** | [`0x04c293572ADea2d3D52A623C4B49D4C6fEdA569d`](https://shannon.explorer.somnia.network/address/0x04c293572ADea2d3D52A623C4B49D4C6fEdA569d) |
| **Agentra Marketplace** | [`0x37bF6Fa744faf5E1d5eb563559818373901d4499`](https://shannon.explorer.somnia.network/address/0x37bF6Fa744faf5E1d5eb563559818373901d4499) |
| **Agentra Reactor** | [`0x24e656c6bb05F36F255Eb72CD86562E6b4704D94`](https://shannon.explorer.somnia.network/address/0x24e656c6bb05F36F255Eb72CD86562E6b4704D94) |

> Network: Somnia Testnet · RPC: `https://dream-rpc.somnia.network` · Chain ID: `50312`

### Custom Deployment Flow

Because Somnia testnet processes transactions at extremely high speed, standard Foundry batch deployments (`forge script`) hit RPC rate limits. We executed a sequential manual deployment:

1. Deployed `AgentToken.sol`
2. Deployed `AgentraMarketplace.sol`
3. Deployed `AgentraReactor.sol`
4. Used `cast send` to register the Reactor's address into the Marketplace, completing the trustless authorization loop

This wasn't a workaround — it's the correct deployment pattern for high-throughput chains where transaction ordering matters.

---

## ⚡ The Somnia Integration: Step-by-Step (0 to 1)

### 1. Network Configuration
Added Somnia Testnet (Chain ID `50312`, RPC `https://dream-rpc.somnia.network`) to `custom-chains.js` and set it as the default network. Updated `format_deployments.js` to support Somnia's chain ID, auto-pushing compiled ABIs into the React frontend on every deployment.

### 2. AgentraReactor.sol — The Reactive Contract
Wrote and deployed a native Somnia reactive contract that:
- Subscribes to `AgentUpvoted` events from the marketplace
- Subscribes to `AccessPurchased` events from the marketplace
- Autonomously calls `autoUpgradeTier()` when upvote thresholds are hit
- Autonomously calls `mintLoyaltyReward()` on qualifying lifetime purchases

### 3. AgentraMarketplace.sol — Secured for Reactivity
Added `reactorAddress` storage, `onlyReactor` modifier, and two new restricted functions (`autoUpgradeTier`, `mintLoyaltyReward`) that reject all callers except the registered Reactor contract.

### 4. Backend Pruned to Read-Only
Removed all gamification execution logic from the Node.js backend. `blockchainService.js` now only listens to `AgentTierUpgraded` and `LoyaltyBadgeAwarded` events to sync the database. Protocol state is no longer determined by the backend.

### 5. Frontend Rebuilt for Sub-Second Finality
- Added upvote progress bars toward auto-upgrade thresholds
- Implemented optimistic UI that snaps to premium tier on the 50th upvote
- Added VIP badge rendering for Reactor-issued loyalty rewards
- Configured network enforcer to gate all interactions behind Somnia Testnet connection

---

## 💰 Business Model

**Listing Fees** — Developers pay `$AGT` to list, tiered by plan (Standard / Professional / Enterprise). Filters spam, generates protocol revenue.

**Platform Cut** — 20% of every agent access purchase routes to the `feeCollector` via smart contract. No invoices. No delays. On-chain splits.

**Creator Economy** — 100% of upvote revenue goes directly to the agent creator. This is strategic: high-earning creators market themselves, which markets Agentra, which markets Somnia.

**Auto-Upgrade Flywheel** — The Reactor's tier upgrades create a visible, gamified path for creators. Hitting 50 upvotes isn't just vanity — it's an on-chain credential that the Somnia network itself issued.

---

## 🛠️ Tech Stack

| Layer | Stack |
|---|---|
| **Blockchain** | Somnia Testnet (EVM, Chain ID: 50312) |
| **Reactivity** | Somnia Native On-Chain Reactivity SDK |
| **Smart Contracts** | Solidity, Foundry, OpenZeppelin |
| **Frontend** | React, Vite, TailwindCSS, Wagmi v2, Viem, Web3Modal |
| **Backend** | Node.js, Express, Prisma, MongoDB (read-only sync) |
| **Deployment** | Sequential `cast send` flow + `format_deployments.js` ABI sync |

---

## 🚀 Run It Locally

```bash
# Clone the repo
git clone https://github.com/iammohit64/agentra-somnia.git
cd agentra-somnia

# Install frontend dependencies
cd frontend && npm install

# Configure environment
cp .env.example .env
# Add your WalletConnect Project ID
# RPC: https://dream-rpc.somnia.network
# Chain ID: 50312

# Start the frontend
npm run dev

# In a separate terminal — start the backend
cd ../backend && npm install
npm run dev
```

For smart contract deployment on Somnia:

```bash
cd contracts
forge build

# Deploy sequentially (recommended for Somnia's high-throughput RPC)
forge create src/AgentToken.sol:AgentToken \
  --rpc-url https://dream-rpc.somnia.network \
  --legacy

forge create src/AgentraMarketplace.sol:AgentraMarketplace \
  --rpc-url https://dream-rpc.somnia.network \
  --legacy

forge create src/AgentraReactor.sol:AgentraReactor \
  --rpc-url https://dream-rpc.somnia.network \
  --legacy

# Link Reactor to Marketplace
cast send <MARKETPLACE_ADDRESS> "setReactor(address)" <REACTOR_ADDRESS> \
  --rpc-url https://dream-rpc.somnia.network

# Sync addresses to frontend
node format_deployments.js 50312
```

---

## 🔮 What's Next

The contracts are deployed. The Reactor is live. The architecture is trustless. Here's the roadmap:

- **Reactive Leaderboards** — Real-time, Reactor-driven creator rankings updated automatically as upvotes land, with no backend involvement
- **Reactive SLAs** — If an agent's on-chain execution metrics drop below a threshold, the Reactor automatically flags it and pauses new subscriptions
- **Composable Reactor Pipelines** — Let the Reactor trigger other Reactors. Build complex AI agent workflows where each on-chain event cascades through a reactive pipeline
- **DAO Governance via Reactivity** — `FEE_MANAGER_ROLE` transitions to token-weighted governance where votes trigger Reactor-executed parameter changes

---

## 👨‍💻 Built For

**Somnia Reactivity Mini Hackathon 2026**

Track: **Open Track — Somnia Native On-Chain Reactivity**

---

<div align="center">

**Agentra is proof that Somnia's Reactivity isn't just a developer feature — it's a new primitive for building protocols that are genuinely autonomous, trustless, and impossible to censor.**

[🎬 Demo Video](https://canva.link/uxmz5s79nca4jxi) &nbsp;·&nbsp; [📦 GitHub](https://github.com/iammohit64/agentra-somnia.git)

</div>

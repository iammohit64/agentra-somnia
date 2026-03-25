// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Agentra.sol";

/**
 * @title AgentraReactor
 * @dev This contract acts as the Somnia On-Chain Reactor. 
 * It listens to events from Agentra and instantly triggers state changes.
 */
contract AgentraReactor {
    Agentra public agentra;
    address public owner;

    constructor(address _agentra) {
        agentra = Agentra(_agentra);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // In a real Somnia deployment, these are triggered automatically by the network 
    // when it detects the subscribed events in the mempool/blocks.
    
    function reactToUpvote(uint256 _agentId, uint256 _totalUpvotes) external {
        // Gamification: If the agent hits exactly 50 upvotes, upgrade them.
        if (_totalUpvotes == 50) {
            agentra.autoUpgradeTier(_agentId);
        }
    }

    function reactToPurchase(address _buyer, bool _isLifetime) external {
        // Loyalty: If they bought lifetime access, give them a reward instantly on-chain
        if (_isLifetime) {
            agentra.mintLoyaltyReward(_buyer);
        }
    }

    function updateAgentra(address _newAgentra) external onlyOwner {
        agentra = Agentra(_newAgentra);
    }
}
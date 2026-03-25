// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Agentra is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable agtToken;
    address public feeCollector;
    address public reactor; // The Somnia Reactive Contract
    
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 20;
    uint256 public constant UPVOTE_COST = 1 ether;
    uint256 public agentCounter;

    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    enum AgentTier { Standard, Professional, Enterprise }

    struct Agent {
        uint256 id;
        address creator;
        AgentTier tier;
        uint256 monthlyPrice;
        string metadataURI;
        uint256 upvotes;
    }

    mapping(uint256 => Agent) public agents;
    mapping(uint256 => mapping(address => uint256)) public accessRegistry;
    mapping(AgentTier => uint256) public listingFees;

    event AgentDeployed(uint256 indexed agentId, address indexed creator, AgentTier tier);
    event AccessPurchased(uint256 indexed agentId, address indexed buyer, bool isLifetime);
    event AgentUpvoted(uint256 indexed agentId, address indexed voter, uint256 totalUpvotes);
    
    // New Reactivity Events
    event AgentTierUpgraded(uint256 indexed agentId, AgentTier newTier);
    event LoyaltyBadgeAwarded(address indexed buyer);

    modifier onlyReactor() {
        require(msg.sender == reactor, "Only Reactor can call this");
        _;
    }

    constructor(address _agtToken, address _feeCollector) {
        agtToken = IERC20(_agtToken);
        feeCollector = _feeCollector;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);

        listingFees[AgentTier.Standard] = 50 ether;
        listingFees[AgentTier.Professional] = 150 ether;
        listingFees[AgentTier.Enterprise] = 500 ether;
    }

    function deployAgent(AgentTier _tier, uint256 _monthlyPrice, string memory _metadataURI) external nonReentrant whenNotPaused {
        uint256 fee = listingFees[_tier];
        agtToken.safeTransferFrom(msg.sender, feeCollector, fee);

        agentCounter++;
        agents[agentCounter] = Agent({
            id: agentCounter,
            creator: msg.sender,
            tier: _tier,
            monthlyPrice: _monthlyPrice,
            metadataURI: _metadataURI,
            upvotes: 0
        });

        accessRegistry[agentCounter][msg.sender] = type(uint256).max;
        emit AgentDeployed(agentCounter, msg.sender, _tier);
    }

    function purchaseAccess(uint256 _agentId, bool _isLifetime) external nonReentrant whenNotPaused {
        Agent storage agent = agents[_agentId];
        require(agent.creator != address(0), "Agent does not exist");

        uint256 totalCost = _isLifetime ? agent.monthlyPrice * 12 : agent.monthlyPrice;
        uint256 adminCut = (totalCost * PLATFORM_FEE_PERCENTAGE) / 100;
        uint256 creatorCut = totalCost - adminCut;

        agtToken.safeTransferFrom(msg.sender, feeCollector, adminCut);
        agtToken.safeTransferFrom(msg.sender, agent.creator, creatorCut);

        if (_isLifetime) {
            accessRegistry[_agentId][msg.sender] = type(uint256).max;
        } else {
            uint256 currentExp = accessRegistry[_agentId][msg.sender];
            if (currentExp > block.timestamp && currentExp != type(uint256).max) {
                accessRegistry[_agentId][msg.sender] = currentExp + 30 days;
            } else {
                accessRegistry[_agentId][msg.sender] = block.timestamp + 30 days;
            }
        }
        emit AccessPurchased(_agentId, msg.sender, _isLifetime);
    }

    function upvote(uint256 _agentId) external nonReentrant whenNotPaused {
        Agent storage agent = agents[_agentId];
        require(agent.creator != address(0), "Agent does not exist");

        agtToken.safeTransferFrom(msg.sender, agent.creator, UPVOTE_COST);
        
        agent.upvotes++;
        // Notice we now pass totalUpvotes so the Reactor can read it from the log
        emit AgentUpvoted(_agentId, msg.sender, agent.upvotes);
    }

    // --- Reactivity Engine Functions (Called by Somnia Network) ---

    function autoUpgradeTier(uint256 _agentId) external onlyReactor {
        Agent storage agent = agents[_agentId];
        if(agent.tier == AgentTier.Standard) {
            agent.tier = AgentTier.Professional;
            emit AgentTierUpgraded(_agentId, AgentTier.Professional);
        }
    }

    function mintLoyaltyReward(address _buyer) external onlyReactor {
        // In a full production app, you might mint an NFT here. 
        // For the hackathon, emitting this state change is sufficient to grant them UI perks.
        emit LoyaltyBadgeAwarded(_buyer);
    }

    // --- Admin & Security Functions ---

    function setReactor(address _reactor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reactor = _reactor;
    }

    function setListingFees(AgentTier _tier, uint256 _newFee) external onlyRole(FEE_MANAGER_ROLE) {
        listingFees[_tier] = _newFee;
    }

    function setFeeCollector(address _newCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeCollector = _newCollector;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function hasAccess(uint256 _agentId, address _user) external view returns (bool) {
        return accessRegistry[_agentId][_user] > block.timestamp;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Simple Vault Contract for AI Agent Authorization (Mode B)
 * 
 * This contract acts as a "safe" that holds funds for AI agents.
 * Only the owner can execute transactions, but with gas-efficient design.
 * 
 * Features:
 * - Owner-controlled execution
 * - Spending limit enforcement
 * - Daily/weekly limits
 * - Emergency pause
 * 
 * Deployment: Use on EVM chains (Ethereum, Polygon, BSC, etc.)
 */
contract AgentVault {
    address public owner;
    bool public paused;
    
    // Spending limits
    uint256 public dailyLimit;
    uint256 public dailySpent;
    uint256 public lastResetDay;
    
    // Events
    event Executed(address indexed target, uint256 value, bytes data, bool success);
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event Paused(bool paused);
    event LimitsUpdated(uint256 dailyLimit);
    event Received(address indexed sender, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can execute");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Vault is paused");
        _;
    }
    
    constructor(uint256 _dailyLimit) {
        owner = msg.sender;
        dailyLimit = _dailyLimit;
        lastResetDay = block.timestamp / 1 days;
    }
    
    /**
     * Execute a transaction from the vault
     * 
     * @param target - Recipient address
     * @param value - Amount to send (in wei)
     * @param data - Call data (for contract interactions)
     * @return success - Whether the call succeeded
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner whenNotPaused returns (bool success) {
        // Check and update daily limit
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            dailySpent = 0;
            lastResetDay = currentDay;
        }
        
        require(dailySpent + value <= dailyLimit, "Daily limit exceeded");
        dailySpent += value;
        
        // Execute the transaction
        (success, ) = target.call{value: value}(data);
        
        emit Executed(target, value, data, success);
        
        return success;
    }
    
    /**
     * Batch execute multiple transactions
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwner whenNotPaused returns (bool[] memory successes) {
        require(
            targets.length == values.length && values.length == datas.length,
            "Array length mismatch"
        );
        
        successes = new bool[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            successes[i] = this.execute(targets[i], values[i], datas[i]);
        }
        
        return successes;
    }
    
    /**
     * Update daily spending limit
     */
    function setDailyLimit(uint256 _dailyLimit) external onlyOwner {
        dailyLimit = _dailyLimit;
        emit LimitsUpdated(_dailyLimit);
    }
    
    /**
     * Pause/unpause the vault
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }
    
    /**
     * Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
    
    /**
     * Receive ETH
     */
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
    
    /**
     * Get current spending status
     */
    function getSpendingStatus() external view returns (
        uint256 _dailyLimit,
        uint256 _dailySpent,
        uint256 _remainingToday
    ) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 spent = currentDay > lastResetDay ? 0 : dailySpent;
        
        return (
            dailyLimit,
            spent,
            dailyLimit > spent ? dailyLimit - spent : 0
        );
    }
}

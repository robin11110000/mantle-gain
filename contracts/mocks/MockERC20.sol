// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev Mock ERC20 token for testing Mantle yield aggregator functionality
 */
contract MockERC20 is ERC20, Ownable {
    /**
     * @dev Constructor that gives the msg.sender all of the initial supply
     * @param name Token name (e.g., "Test USDC on Mantle", "Mock MNT Token")
     * @param symbol Token symbol (e.g., "tUSDC", "mMNT")
     * @param initialSupply Initial token supply
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Function to mint tokens for testing yield strategies
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     * @return A boolean that indicates if the operation was successful
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        _mint(to, amount);
        return true;
    }

    /**
     * @dev Function to burn tokens for testing withdrawal scenarios
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Function to burn tokens from a specific account (for testing)
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
    
    /**
     * @dev Batch mint function for testing multiple users
     * @param recipients Array of addresses to mint tokens to
     * @param amounts Array of amounts to mint to each recipient
     */
    function batchMint(address[] memory recipients, uint256[] memory amounts) public onlyOwner {
        require(recipients.length == amounts.length, "MockERC20: arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev Function to simulate token transfers for testing
     * @param from Source address
     * @param to Destination address
     * @param amount Amount to transfer
     */
    function simulateTransfer(address from, address to, uint256 amount) public onlyOwner {
        _transfer(from, to, amount);
    }
    
    /**
     * @dev Function to set approval for testing purposes
     * @param owner Token owner
     * @param spender Approved spender
     * @param amount Approval amount
     */
    function setApproval(address owner, address spender, uint256 amount) public onlyOwner {
        _approve(owner, spender, amount);
    }
}

/**
 * @title MantleTestTokens
 * @dev Helper contract to deploy common test tokens for Mantle yield aggregator testing
 */
contract MantleTestTokens {
    MockERC20 public mockUSDC;
    MockERC20 public mockUSDT;
    MockERC20 public mockWETH;
    MockERC20 public mockMNT;
    MockERC20 public mockDAI;
    
    // Events
    event TestTokensDeployed(
        address mockUSDC,
        address mockUSDT, 
        address mockWETH,
        address mockMNT,
        address mockDAI
    );
    
    constructor() {
        // Deploy common test tokens with realistic initial supplies
        mockUSDC = new MockERC20("Test USD Coin on Mantle", "tUSDC", 1000000 * 10**6);  // 1M USDC (6 decimals)
        mockUSDT = new MockERC20("Test Tether USD on Mantle", "tUSDT", 1000000 * 10**6); // 1M USDT (6 decimals)
        mockWETH = new MockERC20("Test Wrapped Ether on Mantle", "tWETH", 10000 * 10**18); // 10K WETH (18 decimals)
        mockMNT = new MockERC20("Test Mantle Token", "tMNT", 10000000 * 10**18); // 10M MNT (18 decimals)
        mockDAI = new MockERC20("Test DAI on Mantle", "tDAI", 1000000 * 10**18); // 1M DAI (18 decimals)
        
        emit TestTokensDeployed(
            address(mockUSDC),
            address(mockUSDT),
            address(mockWETH),
            address(mockMNT),
            address(mockDAI)
        );
    }
    
    /**
     * @dev Distribute test tokens to users for testing
     * @param users Array of user addresses
     * @param amounts Array of amounts (will be distributed equally across all tokens)
     */
    function distributeTestTokens(address[] memory users, uint256[] memory amounts) external {
        require(users.length == amounts.length, "MantleTestTokens: arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            // Distribute tokens with appropriate decimals
            mockUSDC.mint(users[i], amounts[i] * 10**6);   // USDC has 6 decimals
            mockUSDT.mint(users[i], amounts[i] * 10**6);   // USDT has 6 decimals  
            mockWETH.mint(users[i], amounts[i] * 10**18);  // WETH has 18 decimals
            mockMNT.mint(users[i], amounts[i] * 10**18);   // MNT has 18 decimals
            mockDAI.mint(users[i], amounts[i] * 10**18);   // DAI has 18 decimals
        }
    }
    
    /**
     * @dev Get all test token addresses
     * @return Array of all deployed test token addresses
     */
    function getAllTokenAddresses() external view returns (address[] memory) {
        address[] memory tokens = new address[](5);
        tokens[0] = address(mockUSDC);
        tokens[1] = address(mockUSDT);
        tokens[2] = address(mockWETH);
        tokens[3] = address(mockMNT);
        tokens[4] = address(mockDAI);
        return tokens;
    }
    
    /**
     * @dev Setup approvals for yield aggregator testing
     * @param user User address
     * @param spender Spender address (typically the YieldAggregator)
     * @param amount Approval amount
     */
    function setupApprovals(address user, address spender, uint256 amount) external {
        mockUSDC.setApproval(user, spender, amount * 10**6);
        mockUSDT.setApproval(user, spender, amount * 10**6);
        mockWETH.setApproval(user, spender, amount * 10**18);
        mockMNT.setApproval(user, spender, amount * 10**18);
        mockDAI.setApproval(user, spender, amount * 10**18);
    }
}
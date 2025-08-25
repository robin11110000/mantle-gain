// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ERC20Mock
 * @dev Mock ERC20 token for testing Mantle yield aggregator
 * Can represent tokens like USDC, USDT, WETH, MNT etc. on Mantle Network
 */
contract ERC20Mock is ERC20 {
    uint8 private _tokenDecimals;
    
    /**
     * @dev Constructor for creating mock tokens for Mantle testing
     * @param name Token name (e.g., "Mock USDC on Mantle", "Mock MNT", etc.)
     * @param symbol Token symbol (e.g., "mUSDC", "mMNT", etc.)
     * @param initialAccount Account to receive initial tokens
     * @param initialBalance Initial token balance
     * @param tokenDecimals Number of decimals for the token
     */
    constructor(
        string memory name,
        string memory symbol,
        address initialAccount,
        uint256 initialBalance,
        uint8 tokenDecimals
    ) ERC20(name, symbol) {
        _tokenDecimals = tokenDecimals;
        _mint(initialAccount, initialBalance);
    }
    
    /**
     * @dev Override decimals to support different token standards on Mantle
     */
    function decimals() public view virtual override returns (uint8) {
        return _tokenDecimals;
    }

    /**
     * @dev Mint tokens - useful for testing yield strategies
     * @param account Account to mint tokens to
     * @param amount Amount to mint
     */
    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    /**
     * @dev Burn tokens - useful for testing withdrawal scenarios
     * @param account Account to burn tokens from
     * @param amount Amount to burn
     */
    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }
    
    /**
     * @dev Create mock tokens for common Mantle ecosystem tokens
     */
    
    /**
     * @dev Factory function to create mock USDC for Mantle testing
     * @param initialAccount Account to receive tokens
     * @param initialBalance Initial balance
     * @return Address of created mock USDC
     */
    function createMockUSDC(address initialAccount, uint256 initialBalance) 
        external 
        returns (ERC20Mock) 
    {
        return new ERC20Mock(
            "Mock USD Coin on Mantle",
            "mUSDC",
            initialAccount,
            initialBalance,
            6
        );
    }
    
    /**
     * @dev Factory function to create mock USDT for Mantle testing
     * @param initialAccount Account to receive tokens
     * @param initialBalance Initial balance
     * @return Address of created mock USDT
     */
    function createMockUSDT(address initialAccount, uint256 initialBalance) 
        external 
        returns (ERC20Mock) 
    {
        return new ERC20Mock(
            "Mock Tether USD on Mantle",
            "mUSDT",
            initialAccount,
            initialBalance,
            6
        );
    }
    
    /**
     * @dev Factory function to create mock WETH for Mantle testing
     * @param initialAccount Account to receive tokens
     * @param initialBalance Initial balance
     * @return Address of created mock WETH
     */
    function createMockWETH(address initialAccount, uint256 initialBalance) 
        external 
        returns (ERC20Mock) 
    {
        return new ERC20Mock(
            "Mock Wrapped Ether on Mantle",
            "mWETH",
            initialAccount,
            initialBalance,
            18
        );
    }
    
    /**
     * @dev Factory function to create mock MNT for Mantle testing
     * @param initialAccount Account to receive tokens
     * @param initialBalance Initial balance
     * @return Address of created mock MNT
     */
    function createMockMNT(address initialAccount, uint256 initialBalance) 
        external 
        returns (ERC20Mock) 
    {
        return new ERC20Mock(
            "Mock Mantle Token",
            "mMNT",
            initialAccount,
            initialBalance,
            18
        );
    }
}
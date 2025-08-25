// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title IYieldStrategy
 * @dev Interface for all yield strategies deployed on Mantle Network
 * Supports lending (Lendle), farming (Agni Finance), and liquidity provision (MantleSwap) strategies
 */
interface IYieldStrategy {
    /**
     * @dev Deposit funds into the strategy
     * @param _asset Asset to deposit (USDC, USDT, WETH, MNT, etc. on Mantle)
     * @param _amount Amount to deposit
     * @return Amount of shares/tokens received from the strategy
     */
    function deposit(address _asset, uint256 _amount) external returns (uint256);
    
    /**
     * @dev Withdraw funds from the strategy
     * @param _asset Asset to withdraw (USDC, USDT, WETH, MNT, etc. on Mantle)
     * @param _amount Amount to withdraw
     * @return Amount actually withdrawn from the strategy
     */
    function withdraw(address _asset, uint256 _amount) external returns (uint256);
    
    /**
     * @dev Get current APY for a specific asset in this strategy
     * @param _asset Asset address (e.g., USDC, MNT token on Mantle)
     * @return Current APY in basis points (1% = 100)
     */
    function getAPY(address _asset) external view returns (uint256);
    
    /**
     * @dev Get total value locked in this strategy for a specific asset
     * @param _asset Asset address
     * @return Total value locked in the asset's smallest unit
     */
    function getTVL(address _asset) external view returns (uint256);
    
    /**
     * @dev Check if strategy supports a specific asset on Mantle
     * @param _asset Asset address to check
     * @return True if the asset is supported by this strategy
     */
    function supportsAsset(address _asset) external view returns (bool);
    
    /**
     * @dev Get strategy name
     * @return Human-readable strategy name (e.g., "Lendle Lending Strategy")
     */
    function getName() external view returns (string memory);
    
    /**
     * @dev Get protocol name this strategy interacts with
     * @return Protocol name (e.g., "Lendle on Mantle", "Agni Finance on Mantle")
     */
    function getProtocol() external view returns (string memory);
    
    /**
     * @dev Harvest yield from the strategy
     * Claims rewards from Mantle protocols (MNT rewards, trading fees, etc.)
     * @param _asset Asset to harvest yield for
     * @return Amount of yield harvested
     */
    function harvestYield(address _asset) external returns (uint256);
    
    /**
     * @dev Get pending yield for a specific asset
     * @param _asset Asset address
     * @return Pending yield amount that can be harvested
     */
    function getPendingYield(address _asset) external view returns (uint256);
}

/**
 * @title IMantleLendingStrategy
 * @dev Extended interface for Mantle lending strategies (Lendle, etc.)
 */
interface IMantleLendingStrategy is IYieldStrategy {
    /**
     * @dev Get the lending pool address for an asset
     * @param _asset Asset address
     * @return Lending pool address on Mantle
     */
    function getLendingPool(address _asset) external view returns (address);
    
    /**
     * @dev Get current supply rate for lending
     * @param _asset Asset address  
     * @return Supply rate in basis points
     */
    function getSupplyRate(address _asset) external view returns (uint256);
}

/**
 * @title IMantleFarmingStrategy
 * @dev Extended interface for Mantle farming strategies (Agni Finance, etc.)
 */
interface IMantleFarmingStrategy is IYieldStrategy {
    /**
     * @dev Get the farm/pool address for an asset
     * @param _asset Asset address
     * @return Farm pool address on Mantle
     */
    function getFarmPool(address _asset) external view returns (address);
    
    /**
     * @dev Get reward token address for farming
     * @param _asset Asset address
     * @return Reward token address (typically MNT or protocol token)
     */
    function getRewardToken(address _asset) external view returns (address);
    
    /**
     * @dev Get farming rewards rate
     * @param _asset Asset address
     * @return Rewards rate in basis points
     */
    function getRewardsRate(address _asset) external view returns (uint256);
}

/**
 * @title IMantleLiquidityStrategy  
 * @dev Extended interface for Mantle liquidity strategies (MantleSwap, etc.)
 */
interface IMantleLiquidityStrategy is IYieldStrategy {
    /**
     * @dev Get the pair token for liquidity provision
     * @param _asset Primary asset address
     * @return Paired token address (e.g., USDC paired with MNT)
     */
    function getPairToken(address _asset) external view returns (address);
    
    /**
     * @dev Get LP token address for the pair
     * @param _asset Primary asset address
     * @return LP token address
     */
    function getLPToken(address _asset) external view returns (address);
    
    /**
     * @dev Get trading fee rate for the liquidity pool
     * @param _asset Asset address
     * @return Fee rate in basis points
     */
    function getTradingFeeRate(address _asset) external view returns (uint256);
}

/**
 * @title IStrategyRegistry
 * @dev Interface for strategy registry on Mantle
 */
interface IStrategyRegistry {
    /**
     * @dev Register a new strategy
     * @param _strategy Strategy contract address
     * @param _strategyType Type of strategy (0=Lending, 1=Farming, 2=Liquidity)
     */
    function registerStrategy(address _strategy, uint256 _strategyType) external;
    
    /**
     * @dev Get all strategies for a specific type
     * @param _strategyType Strategy type
     * @return Array of strategy addresses
     */
    function getStrategiesByType(uint256 _strategyType) external view returns (address[] memory);
    
    /**
     * @dev Check if a strategy is registered
     * @param _strategy Strategy address
     * @return True if registered
     */
    function isRegistered(address _strategy) external view returns (bool);
}
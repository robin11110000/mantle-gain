// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title IMultiSigWallet
 * @dev Interface for MultiSigWallet contract on Mantle Network
 */
interface IMultiSigWallet {
    function isOwner(address owner) external view returns (bool);
    function getOwnerCount() external view returns (uint256);
    function submitTransaction(address target, uint256 value, bytes memory data) external returns (uint256);
}

/**
 * @title MockMultiSigWallet
 * @dev Mock MultiSigWallet contract for testing Mantle yield aggregator
 */
contract MultiSigWallet is IMultiSigWallet {
    address[] public owners;
    uint256 public required;
    address public yieldAggregator;
    
    mapping(address => bool) public isOwnerMapping;
    
    // Transaction storage for full implementation
    struct Transaction {
        address target;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
    }
    
    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    
    // Events
    event OwnerAdded(address owner);
    event OwnerRemoved(address owner);
    event TransactionSubmitted(uint256 indexed txIndex, address indexed sender, address indexed target, uint256 value, bytes data);
    event TransactionConfirmed(uint256 indexed txIndex, address indexed owner);
    event TransactionExecuted(uint256 indexed txIndex, address indexed executor);
    
    /**
     * @dev Constructor to set up the initial owners and required confirmations
     * @param _owners List of initial owners
     * @param _required Number of required confirmations
     * @param _yieldAggregator Address of the yield aggregator on Mantle
     */
    constructor(address[] memory _owners, uint256 _required, address _yieldAggregator) {
        require(_owners.length > 0, "MultiSigWallet: owners required");
        require(_required > 0 && _required <= _owners.length, "MultiSigWallet: invalid required number");
        require(_yieldAggregator != address(0), "MultiSigWallet: invalid yield aggregator");
        
        yieldAggregator = _yieldAggregator;
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            
            require(owner != address(0), "MultiSigWallet: null owner");
            require(!isOwnerMapping[owner], "MultiSigWallet: duplicate owner");
            
            isOwnerMapping[owner] = true;
            owners.push(owner);
            
            emit OwnerAdded(owner);
        }
        
        required = _required;
    }
    
    /**
     * @dev Check if an address is an owner
     * @param _owner Address to check
     * @return True if the address is an owner
     */
    function isOwner(address _owner) external view override returns (bool) {
        return isOwnerMapping[_owner];
    }
    
    /**
     * @dev Get the number of owners
     * @return Number of owners
     */
    function getOwnerCount() external view override returns (uint256) {
        return owners.length;
    }
    
    /**
     * @dev Submit a transaction for multi-signature approval
     * @param _target Target contract address
     * @param _value Value in wei to send
     * @param _data Function call data
     * @return Transaction index
     */
    function submitTransaction(
        address _target,
        uint256 _value,
        bytes memory _data
    ) external override returns (uint256) {
        require(isOwnerMapping[msg.sender], "MultiSigWallet: not an owner");
        
        uint256 txIndex = transactions.length;
        
        transactions.push(
            Transaction({
                target: _target,
                value: _value,
                data: _data,
                executed: false,
                confirmations: 0
            })
        );
        
        emit TransactionSubmitted(txIndex, msg.sender, _target, _value, _data);
        
        // Automatically confirm the transaction by the submitter
        _confirmTransaction(txIndex);
        
        return txIndex;
    }
    
    /**
     * @dev Confirm a pending transaction
     * @param _txIndex Transaction index
     */
    function confirmTransaction(uint256 _txIndex) external {
        require(isOwnerMapping[msg.sender], "MultiSigWallet: not an owner");
        require(_txIndex < transactions.length, "MultiSigWallet: tx does not exist");
        require(!transactions[_txIndex].executed, "MultiSigWallet: tx already executed");
        require(!isConfirmed[_txIndex][msg.sender], "MultiSigWallet: tx already confirmed");
        
        _confirmTransaction(_txIndex);
    }
    
    /**
     * @dev Internal function to confirm a transaction
     * @param _txIndex Transaction index
     */
    function _confirmTransaction(uint256 _txIndex) internal {
        Transaction storage transaction = transactions[_txIndex];
        transaction.confirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;
        
        emit TransactionConfirmed(_txIndex, msg.sender);
        
        // Execute if we've reached required confirmations
        if (transaction.confirmations >= required) {
            _executeTransaction(_txIndex);
        }
    }
    
    /**
     * @dev Execute a confirmed transaction
     * @param _txIndex Transaction index
     */
    function _executeTransaction(uint256 _txIndex) internal {
        Transaction storage transaction = transactions[_txIndex];
        
        require(
            transaction.confirmations >= required,
            "MultiSigWallet: not enough confirmations"
        );
        
        transaction.executed = true;
        
        (bool success, ) = transaction.target.call{value: transaction.value}(
            transaction.data
        );
        
        if (success) {
            emit TransactionExecuted(_txIndex, msg.sender);
        } else {
            transaction.executed = false; // Allow retrying the transaction
            revert("MultiSigWallet: transaction execution failed");
        }
    }
    
    /**
     * @dev Get all owners
     * @return Array of owner addresses
     */
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
    
    /**
     * @dev Get transaction count
     * @return Number of transactions
     */
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }
    
    /**
     * @dev Receive function to allow contract to receive ether (MNT on Mantle)
     */
    receive() external payable {}
}
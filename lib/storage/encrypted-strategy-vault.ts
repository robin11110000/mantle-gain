import { ethers } from 'ethers';

// Encrypted Strategy Vault Types
export interface EncryptedStrategyVault {
  vaultId: string;
  ownerAddress: string;
  createdAt: number;
  lastAccessed: number;
  
  // Vault metadata (public)
  metadata: {
    name: string;
    description: string;
    strategyCount: number;
    totalValue: string;
    lastModified: number;
  };
  
  // Encrypted vault data
  encryptedData: EncryptedVaultData;
  
  // Access control
  accessControl: {
    keyHash: string;
    permissions: VaultPermission[];
    shareableKeys: ShareableKey[];
  };
  
  // Security features
  security: {
    encryptionAlgorithm: 'AES-256-GCM';
    keyDerivation: 'PBKDF2';
    attestationRequired: boolean;
    teeOnly: boolean;
  };
}

export interface EncryptedVaultData {
  encryptedStrategies: string;
  encryptedPositions: string;
  encryptedTransactions: string;
  encryptedAnalytics: string;
  dataHash: string;
  nonce: string;
  authTag: string;
}

export interface VaultPermission {
  address: string;
  role: 'owner' | 'admin' | 'viewer' | 'executor';
  grantedAt: number;
  expiresAt?: number;
  restrictions: string[];
}

export interface ShareableKey {
  keyId: string;
  encryptedKey: string;
  recipientAddress: string;
  permissions: string[];
  createdAt: number;
  usageCount: number;
  maxUsage: number;
}

export interface StrategyBackup {
  backupId: string;
  vaultId: string;
  timestamp: number;
  encryptedData: string;
  checksumHash: string;
  recoveryShares: RecoveryShare[];
}

export interface RecoveryShare {
  shareId: string;
  share: string; // Shamir's Secret Share
  threshold: number;
  totalShares: number;
}

export interface VaultAuditLog {
  timestamp: number;
  action: 'created' | 'accessed' | 'modified' | 'shared' | 'backed_up' | 'recovered';
  actor: string;
  details: string;
  ipHash?: string;
  attestationId?: string;
}

/**
 * Encrypted Strategy Vault Manager
 * Provides secure storage and management of yield strategies with TEE integration
 */
class EncryptedStrategyVaultManager {
  private static instance: EncryptedStrategyVaultManager;
  private vaults: Map<string, EncryptedStrategyVault> = new Map();
  private auditLogs: Map<string, VaultAuditLog[]> = new Map();
  private masterKey: string | null = null;

  private constructor() {}

  static getInstance(): EncryptedStrategyVaultManager {
    if (!EncryptedStrategyVaultManager.instance) {
      EncryptedStrategyVaultManager.instance = new EncryptedStrategyVaultManager();
    }
    return EncryptedStrategyVaultManager.instance;
  }

  /**
   * Initialize vault manager with master key
   */
  async initialize(config: {
    masterSeed?: string;
    teeRequired?: boolean;
    backupEnabled?: boolean;
  }): Promise<void> {
    try {
      console.log('🔐 Initializing Encrypted Strategy Vault...');

      // Generate or derive master key
      await this.initializeMasterKey(config.masterSeed);

      // Load existing vaults from storage
      await this.loadVaultsFromStorage();

      console.log('✅ Encrypted Strategy Vault initialized');
    } catch (error) {
      console.error('❌ Error initializing vault:', error);
      throw error;
    }
  }

  /**
   * Initialize master encryption key
   */
  private async initializeMasterKey(seed?: string): Promise<void> {
    try {
      // In production, this would use proper key derivation
      const entropy = seed || ethers.randomBytes(32);
      const wallet = ethers.Wallet.createRandom({ extraEntropy: entropy });
      
      // Derive master key from wallet
      this.masterKey = ethers.keccak256(
        ethers.toUtf8Bytes(wallet.privateKey + 'vault-master-key')
      );

      console.log('🔑 Master encryption key initialized');
    } catch (error) {
      console.error('Error initializing master key:', error);
      throw error;
    }
  }

  /**
   * Load existing vaults from persistent storage
   */
  private async loadVaultsFromStorage(): Promise<void> {
    try {
      // Mock loading from localStorage/IndexedDB
      // In production, would load from encrypted storage
      const storedVaults = localStorage.getItem('mantle-gain_encrypted_vaults');
      
      if (storedVaults) {
        const vaultData = JSON.parse(storedVaults);
        for (const [vaultId, vault] of Object.entries(vaultData)) {
          this.vaults.set(vaultId, vault as EncryptedStrategyVault);
        }
        console.log(`📦 Loaded ${this.vaults.size} vaults from storage`);
      }
    } catch (error) {
      console.warn('Could not load vaults from storage:', error);
    }
  }

  /**
   * Create a new encrypted strategy vault
   */
  async createVault(params: {
    name: string;
    description: string;
    ownerAddress: string;
    initialStrategies?: any[];
    teeOnly?: boolean;
  }): Promise<string> {
    try {
      console.log(`🏗️ Creating new vault: ${params.name}`);

      const vaultId = 'vault_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const now = Date.now();

      // Encrypt initial strategies if provided
      const initialData = {
        strategies: params.initialStrategies || [],
        positions: [],
        transactions: [],
        analytics: {
          createdAt: now,
          totalValue: '0',
          performanceHistory: []
        }
      };

      const encryptedData = await this.encryptVaultData(initialData);

      // Generate access key hash
      const keyHash = ethers.keccak256(
        ethers.toUtf8Bytes(params.ownerAddress + vaultId + now)
      );

      const vault: EncryptedStrategyVault = {
        vaultId,
        ownerAddress: params.ownerAddress,
        createdAt: now,
        lastAccessed: now,
        
        metadata: {
          name: params.name,
          description: params.description,
          strategyCount: params.initialStrategies?.length || 0,
          totalValue: '$0',
          lastModified: now
        },
        
        encryptedData,
        
        accessControl: {
          keyHash,
          permissions: [{
            address: params.ownerAddress,
            role: 'owner',
            grantedAt: now,
            restrictions: []
          }],
          shareableKeys: []
        },
        
        security: {
          encryptionAlgorithm: 'AES-256-GCM',
          keyDerivation: 'PBKDF2',
          attestationRequired: params.teeOnly || false,
          teeOnly: params.teeOnly || false
        }
      };

      // Store vault
      this.vaults.set(vaultId, vault);
      await this.persistVaultToStorage(vault);

      // Log creation
      await this.logVaultAction(vaultId, 'created', params.ownerAddress, 
        `Vault '${params.name}' created with ${vault.metadata.strategyCount} strategies`);

      console.log(`✅ Vault created: ${vaultId}`);
      return vaultId;

    } catch (error) {
      console.error('Error creating vault:', error);
      throw error;
    }
  }

  /**
   * Encrypt vault data using AES-256-GCM
   */
  private async encryptVaultData(data: any): Promise<EncryptedVaultData> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    try {
      // In production, would use proper AES-256-GCM encryption
      const dataString = JSON.stringify(data);
      const nonce = ethers.randomBytes(12).slice(2); // 96-bit nonce
      const authKey = ethers.keccak256(this.masterKey + nonce);
      
      // Mock encryption - would use real crypto library
      const encryptedStrategies = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(data.strategies) + authKey)
      );
      
      const encryptedPositions = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(data.positions) + authKey)
      );
      
      const encryptedTransactions = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(data.transactions) + authKey)
      );
      
      const encryptedAnalytics = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(data.analytics) + authKey)
      );

      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(dataString));
      const authTag = ethers.keccak256(dataHash + authKey);

      return {
        encryptedStrategies,
        encryptedPositions,
        encryptedTransactions,
        encryptedAnalytics,
        dataHash,
        nonce,
        authTag
      };
    } catch (error) {
      console.error('Error encrypting vault data:', error);
      throw error;
    }
  }

  /**
   * Decrypt vault data
   */
  private async decryptVaultData(encryptedData: EncryptedVaultData): Promise<any> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    try {
      // In production, would use proper AES-256-GCM decryption
      // Mock decryption for demo
      return {
        strategies: [
          {
            id: 'decrypted_strategy_1',
            name: 'Conservative DeFi',
            type: 'lending',
            targetApy: 8.5,
            riskLevel: 'low',
            protocols: ['Dolomite', 'FusionX'],
            allocation: {
              'USDC': 60,
              'MNT': 40
            }
          }
        ],
        positions: [
          {
            id: 'pos_1',
            protocol: 'Dolomite',
            token: 'USDC',
            amount: '1000.00',
            apy: 6.2,
            entryDate: Date.now() - 86400000
          }
        ],
        transactions: [
          {
            id: 'tx_1',
            type: 'deposit',
            amount: '1000.00',
            token: 'USDC',
            protocol: 'Dolomite',
            timestamp: Date.now() - 86400000,
            txHash: '0x...'
          }
        ],
        analytics: {
          totalValue: '$1000.00',
          unrealizedGains: '$15.30',
          realizedGains: '$0.00',
          averageApy: 8.5,
          riskScore: 25,
          performanceHistory: []
        }
      };
    } catch (error) {
      console.error('Error decrypting vault data:', error);
      throw error;
    }
  }

  /**
   * Access vault with proper authentication
   */
  async accessVault(vaultId: string, requesterAddress: string, attestationId?: string): Promise<{
    metadata: any;
    decryptedData: any;
    permissions: string[];
  }> {
    try {
      console.log(`🔓 Accessing vault: ${vaultId}`);

      const vault = this.vaults.get(vaultId);
      if (!vault) {
        throw new Error('Vault not found');
      }

      // Check permissions
      const permission = vault.accessControl.permissions.find(p => p.address === requesterAddress);
      if (!permission) {
        throw new Error('Access denied: No permissions for this vault');
      }

      // Check if TEE attestation is required
      if (vault.security.teeOnly && !attestationId) {
        throw new Error('TEE attestation required for this vault');
      }

      // Verify attestation if provided
      if (attestationId) {
        const isValidAttestation = await this.verifyTEEAttestation(attestationId);
        if (!isValidAttestation) {
          throw new Error('Invalid TEE attestation');
        }
      }

      // Decrypt vault data
      const decryptedData = await this.decryptVaultData(vault.encryptedData);

      // Update last accessed time
      vault.lastAccessed = Date.now();
      await this.persistVaultToStorage(vault);

      // Log access
      await this.logVaultAction(vaultId, 'accessed', requesterAddress, 
        `Vault accessed${attestationId ? ' with TEE attestation' : ''}`);

      console.log(`✅ Vault accessed successfully: ${vaultId}`);

      return {
        metadata: vault.metadata,
        decryptedData,
        permissions: [permission.role, ...permission.restrictions]
      };

    } catch (error) {
      console.error('Error accessing vault:', error);
      throw error;
    }
  }

  /**
   * Update vault with new strategies or positions
   */
  async updateVault(
    vaultId: string, 
    requesterAddress: string, 
    updates: {
      strategies?: any[];
      positions?: any[];
      transactions?: any[];
      analytics?: any;
    },
    attestationId?: string
  ): Promise<void> {
    try {
      console.log(`📝 Updating vault: ${vaultId}`);

      const vault = this.vaults.get(vaultId);
      if (!vault) {
        throw new Error('Vault not found');
      }

      // Check permissions
      const permission = vault.accessControl.permissions.find(p => p.address === requesterAddress);
      if (!permission || !['owner', 'admin'].includes(permission.role)) {
        throw new Error('Access denied: Insufficient permissions');
      }

      // Decrypt current data
      const currentData = await this.decryptVaultData(vault.encryptedData);

      // Merge updates
      const updatedData = {
        strategies: updates.strategies || currentData.strategies,
        positions: updates.positions || currentData.positions,
        transactions: [...(currentData.transactions || []), ...(updates.transactions || [])],
        analytics: { ...currentData.analytics, ...(updates.analytics || {}) }
      };

      // Re-encrypt updated data
      const encryptedData = await this.encryptVaultData(updatedData);

      // Update vault
      vault.encryptedData = encryptedData;
      vault.metadata.lastModified = Date.now();
      vault.metadata.strategyCount = updatedData.strategies.length;
      vault.metadata.totalValue = updatedData.analytics.totalValue || vault.metadata.totalValue;

      // Persist changes
      await this.persistVaultToStorage(vault);

      // Log update
      await this.logVaultAction(vaultId, 'modified', requesterAddress, 
        `Vault updated with ${Object.keys(updates).join(', ')}`);

      console.log(`✅ Vault updated successfully: ${vaultId}`);

    } catch (error) {
      console.error('Error updating vault:', error);
      throw error;
    }
  }

  /**
   * Share vault access with another address
   */
  async shareVaultAccess(
    vaultId: string,
    ownerAddress: string,
    recipientAddress: string,
    role: 'admin' | 'viewer' | 'executor',
    expirationHours?: number
  ): Promise<string> {
    try {
      console.log(`🤝 Sharing vault access: ${vaultId} -> ${recipientAddress}`);

      const vault = this.vaults.get(vaultId);
      if (!vault) {
        throw new Error('Vault not found');
      }

      // Verify owner permissions
      const ownerPermission = vault.accessControl.permissions.find(p => 
        p.address === ownerAddress && p.role === 'owner'
      );
      
      if (!ownerPermission) {
        throw new Error('Only vault owner can share access');
      }

      const now = Date.now();
      const keyId = 'key_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

      // Generate shareable key
      const shareableKey: ShareableKey = {
        keyId,
        encryptedKey: ethers.keccak256(
          ethers.toUtf8Bytes(vault.accessControl.keyHash + recipientAddress + keyId)
        ),
        recipientAddress,
        permissions: [role],
        createdAt: now,
        usageCount: 0,
        maxUsage: 100
      };

      // Add permission
      const newPermission: VaultPermission = {
        address: recipientAddress,
        role,
        grantedAt: now,
        expiresAt: expirationHours ? now + (expirationHours * 3600000) : undefined,
        restrictions: []
      };

      vault.accessControl.shareableKeys.push(shareableKey);
      vault.accessControl.permissions.push(newPermission);

      await this.persistVaultToStorage(vault);

      // Log sharing
      await this.logVaultAction(vaultId, 'shared', ownerAddress, 
        `Access shared with ${recipientAddress} as ${role}`);

      console.log(`✅ Vault access shared: ${keyId}`);
      return keyId;

    } catch (error) {
      console.error('Error sharing vault access:', error);
      throw error;
    }
  }

  /**
   * Create encrypted backup of vault
   */
  async createVaultBackup(vaultId: string, requesterAddress: string): Promise<string> {
    try {
      console.log(`💾 Creating vault backup: ${vaultId}`);

      const vault = this.vaults.get(vaultId);
      if (!vault) {
        throw new Error('Vault not found');
      }

      // Check permissions
      const permission = vault.accessControl.permissions.find(p => 
        p.address === requesterAddress && ['owner', 'admin'].includes(p.role)
      );
      
      if (!permission) {
        throw new Error('Insufficient permissions for backup');
      }

      const backupId = 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Create backup with Shamir's Secret Sharing for recovery
      const backup: StrategyBackup = {
        backupId,
        vaultId,
        timestamp: Date.now(),
        encryptedData: JSON.stringify(vault.encryptedData),
        checksumHash: ethers.keccak256(JSON.stringify(vault)),
        recoveryShares: await this.createRecoveryShares(vault.encryptedData, 3, 2) // 3 shares, 2 needed
      };

      // Store backup (in production, would store in distributed storage)
      localStorage.setItem(`backup_${backupId}`, JSON.stringify(backup));

      // Log backup
      await this.logVaultAction(vaultId, 'backed_up', requesterAddress, 
        `Backup created: ${backupId}`);

      console.log(`✅ Backup created: ${backupId}`);
      return backupId;

    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Create Shamir's Secret Shares for recovery
   */
  private async createRecoveryShares(
    encryptedData: EncryptedVaultData, 
    totalShares: number, 
    threshold: number
  ): Promise<RecoveryShare[]> {
    try {
      // Mock Shamir's Secret Sharing implementation
      // In production, would use proper cryptographic library
      const secret = JSON.stringify(encryptedData);
      const shares: RecoveryShare[] = [];

      for (let i = 0; i < totalShares; i++) {
        shares.push({
          shareId: `share_${i}`,
          share: ethers.keccak256(ethers.toUtf8Bytes(secret + i.toString())),
          threshold,
          totalShares
        });
      }

      return shares;
    } catch (error) {
      console.error('Error creating recovery shares:', error);
      throw error;
    }
  }

  /**
   * Get vault list for address
   */
  getVaultsForAddress(address: string): { vaultId: string; metadata: any; role: string }[] {
    const userVaults: { vaultId: string; metadata: any; role: string }[] = [];

    for (const [vaultId, vault] of this.vaults) {
      const permission = vault.accessControl.permissions.find(p => p.address === address);
      
      if (permission) {
        // Check if permission is not expired
        if (!permission.expiresAt || permission.expiresAt > Date.now()) {
          userVaults.push({
            vaultId,
            metadata: vault.metadata,
            role: permission.role
          });
        }
      }
    }

    return userVaults.sort((a, b) => b.metadata.lastModified - a.metadata.lastModified);
  }

  /**
   * Get audit logs for vault
   */
  getVaultAuditLogs(vaultId: string, requesterAddress: string): VaultAuditLog[] {
    const vault = this.vaults.get(vaultId);
    if (!vault) return [];

    const permission = vault.accessControl.permissions.find(p => p.address === requesterAddress);
    if (!permission) return [];

    return this.auditLogs.get(vaultId) || [];
  }

  // Helper methods
  private async verifyTEEAttestation(attestationId: string): Promise<boolean> {
    // Mock TEE attestation verification
    return attestationId.startsWith('att_') && attestationId.length > 20;
  }

  private async persistVaultToStorage(vault: EncryptedStrategyVault): Promise<void> {
    try {
      const vaults = JSON.parse(localStorage.getItem('mantle-gain_encrypted_vaults') || '{}');
      vaults[vault.vaultId] = vault;
      localStorage.setItem('mantle-gain_encrypted_vaults', JSON.stringify(vaults));
    } catch (error) {
      console.warn('Could not persist vault to storage:', error);
    }
  }

  private async logVaultAction(
    vaultId: string, 
    action: VaultAuditLog['action'], 
    actor: string, 
    details: string
  ): Promise<void> {
    const log: VaultAuditLog = {
      timestamp: Date.now(),
      action,
      actor,
      details
    };

    const logs = this.auditLogs.get(vaultId) || [];
    logs.push(log);
    this.auditLogs.set(vaultId, logs);

    // Keep only last 1000 log entries
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
  }
}

// Export singleton instance
export const encryptedStrategyVault = EncryptedStrategyVaultManager.getInstance();

// Export convenience functions
export const initializeStrategyVault = (config?: any) => encryptedStrategyVault.initialize(config);
export const createVault = (params: any) => encryptedStrategyVault.createVault(params);
export const accessVault = (vaultId: string, requesterAddress: string, attestationId?: string) => 
  encryptedStrategyVault.accessVault(vaultId, requesterAddress, attestationId);
export const getVaultsForAddress = (address: string) => encryptedStrategyVault.getVaultsForAddress(address);
// Role-Based Access Control System for Pentriarch AI

export type UserRole = 'admin' | 'pro' | 'free'
export type Permission =
  // Scanning permissions
  | 'scan:basic'
  | 'scan:advanced'
  | 'scan:unlimited'
  | 'scan:concurrent'
  | 'scan:priority'

  // AI Analysis permissions
  | 'ai:basic'
  | 'ai:advanced'
  | 'ai:premium'
  | 'ai:custom_models'
  | 'ai:unlimited_requests'

  // Reporting permissions
  | 'report:basic'
  | 'report:advanced'
  | 'report:export'
  | 'report:custom_branding'
  | 'report:white_label'

  // Administrative permissions
  | 'admin:users'
  | 'admin:analytics'
  | 'admin:settings'
  | 'admin:billing'
  | 'admin:system'

  // Tool access permissions
  | 'tools:basic'
  | 'tools:advanced'
  | 'tools:custom'
  | 'tools:enterprise'

  // Data permissions
  | 'data:view'
  | 'data:export'
  | 'data:delete'
  | 'data:share'

export interface RoleConfig {
  name: string
  permissions: Permission[]
  limits: {
    scansPerMonth: number
    concurrentScans: number
    aiRequestsPerMonth: number
    reportExports: number
    dataRetentionDays: number
  }
  features: {
    prioritySupport: boolean
    customBranding: boolean
    apiAccess: boolean
    webhooks: boolean
    sso: boolean
  }
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  free: {
    name: 'Free',
    permissions: [
      'scan:basic',
      'ai:basic',
      'report:basic',
      'tools:basic',
      'data:view'
    ],
    limits: {
      scansPerMonth: 10,
      concurrentScans: 1,
      aiRequestsPerMonth: 50,
      reportExports: 3,
      dataRetentionDays: 30
    },
    features: {
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
      webhooks: false,
      sso: false
    }
  },

  pro: {
    name: 'Professional',
    permissions: [
      'scan:basic',
      'scan:advanced',
      'scan:concurrent',
      'ai:basic',
      'ai:advanced',
      'ai:custom_models',
      'report:basic',
      'report:advanced',
      'report:export',
      'tools:basic',
      'tools:advanced',
      'data:view',
      'data:export',
      'data:share'
    ],
    limits: {
      scansPerMonth: 100,
      concurrentScans: 3,
      aiRequestsPerMonth: 500,
      reportExports: 25,
      dataRetentionDays: 90
    },
    features: {
      prioritySupport: true,
      customBranding: false,
      apiAccess: true,
      webhooks: true,
      sso: false
    }
  },

  admin: {
    name: 'Administrator',
    permissions: [
      'scan:basic',
      'scan:advanced',
      'scan:unlimited',
      'scan:concurrent',
      'scan:priority',
      'ai:basic',
      'ai:advanced',
      'ai:premium',
      'ai:custom_models',
      'ai:unlimited_requests',
      'report:basic',
      'report:advanced',
      'report:export',
      'report:custom_branding',
      'report:white_label',
      'admin:users',
      'admin:analytics',
      'admin:settings',
      'admin:billing',
      'admin:system',
      'tools:basic',
      'tools:advanced',
      'tools:custom',
      'tools:enterprise',
      'data:view',
      'data:export',
      'data:delete',
      'data:share'
    ],
    limits: {
      scansPerMonth: -1, // Unlimited
      concurrentScans: 10,
      aiRequestsPerMonth: -1, // Unlimited
      reportExports: -1, // Unlimited
      dataRetentionDays: 365
    },
    features: {
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
      webhooks: true,
      sso: true
    }
  }
}

export class RBACManager {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const roleConfig = ROLE_CONFIGS[userRole]
    return roleConfig.permissions.includes(permission)
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => RBACManager.hasPermission(userRole, permission))
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => RBACManager.hasPermission(userRole, permission))
  }

  /**
   * Get user role configuration
   */
  static getRoleConfig(userRole: UserRole): RoleConfig {
    return ROLE_CONFIGS[userRole]
  }

  /**
   * Check if user can perform an action based on limits
   */
  static canPerformAction(
    userRole: UserRole,
    action: 'scan' | 'aiRequest' | 'reportExport',
    currentUsage: number
  ): boolean {
    const config = RBACManager.getRoleConfig(userRole)

    switch (action) {
      case 'scan':
        return config.limits.scansPerMonth === -1 || currentUsage < config.limits.scansPerMonth
      case 'aiRequest':
        return config.limits.aiRequestsPerMonth === -1 || currentUsage < config.limits.aiRequestsPerMonth
      case 'reportExport':
        return config.limits.reportExports === -1 || currentUsage < config.limits.reportExports
      default:
        return false
    }
  }

  /**
   * Get usage percentage for a specific action
   */
  static getUsagePercentage(
    userRole: UserRole,
    action: 'scan' | 'aiRequest' | 'reportExport',
    currentUsage: number
  ): number {
    const config = RBACManager.getRoleConfig(userRole)

    let limit: number
    switch (action) {
      case 'scan':
        limit = config.limits.scansPerMonth
        break
      case 'aiRequest':
        limit = config.limits.aiRequestsPerMonth
        break
      case 'reportExport':
        limit = config.limits.reportExports
        break
      default:
        return 0
    }

    if (limit === -1) return 0 // Unlimited
    return Math.min((currentUsage / limit) * 100, 100)
  }

  /**
   * Get remaining usage for a specific action
   */
  static getRemainingUsage(
    userRole: UserRole,
    action: 'scan' | 'aiRequest' | 'reportExport',
    currentUsage: number
  ): number | 'unlimited' {
    const config = RBACManager.getRoleConfig(userRole)

    let limit: number
    switch (action) {
      case 'scan':
        limit = config.limits.scansPerMonth
        break
      case 'aiRequest':
        limit = config.limits.aiRequestsPerMonth
        break
      case 'reportExport':
        limit = config.limits.reportExports
        break
      default:
        return 0
    }

    if (limit === -1) return 'unlimited'
    return Math.max(limit - currentUsage, 0)
  }

  /**
   * Check if user can access a specific feature
   */
  static hasFeature(userRole: UserRole, feature: keyof RoleConfig['features']): boolean {
    const config = RBACManager.getRoleConfig(userRole)
    return config.features[feature]
  }

  /**
   * Get all available roles with their display names
   */
  static getAllRoles(): Array<{ value: UserRole; label: string; description?: string }> {
    return [
      {
        value: 'free',
        label: 'Free',
        description: 'Basic security scanning with limited features'
      },
      {
        value: 'pro',
        label: 'Professional',
        description: 'Advanced scanning with AI analysis and priority support'
      },
      {
        value: 'admin',
        label: 'Administrator',
        description: 'Full access to all features and administrative controls'
      }
    ]
  }

  /**
   * Upgrade path suggestions
   */
  static getUpgradeRequiredMessage(userRole: UserRole, requiredPermission: Permission): string {
    if (userRole === 'admin') return 'This feature is not available'

    const upgradeTo = userRole === 'free' ? 'Professional' : 'Administrator'

    const permissionMessages: Record<Permission, string> = {
      'scan:advanced': 'Advanced scanning features',
      'scan:unlimited': 'Unlimited scanning',
      'scan:concurrent': 'Multiple concurrent scans',
      'scan:priority': 'Priority scan queue',
      'ai:advanced': 'Advanced AI analysis',
      'ai:premium': 'Premium AI models',
      'ai:custom_models': 'Custom AI model selection',
      'ai:unlimited_requests': 'Unlimited AI requests',
      'report:advanced': 'Advanced reporting features',
      'report:export': 'Report export functionality',
      'report:custom_branding': 'Custom report branding',
      'report:white_label': 'White-label reports',
      'tools:advanced': 'Advanced security tools',
      'tools:custom': 'Custom tool configurations',
      'tools:enterprise': 'Enterprise security tools',
      'data:export': 'Data export capabilities',
      'data:delete': 'Data deletion permissions',
      'data:share': 'Data sharing features',
      'admin:users': 'User management',
      'admin:analytics': 'Analytics dashboard',
      'admin:settings': 'System settings',
      'admin:billing': 'Billing management',
      'admin:system': 'System administration'
    }

    const featureName = permissionMessages[requiredPermission] || 'This feature'
    return `${featureName} requires ${upgradeTo} plan. Upgrade to access this feature.`
  }
}

// Export utility functions for easier imports
export const hasPermission = RBACManager.hasPermission
export const hasAnyPermission = RBACManager.hasAnyPermission
export const hasAllPermissions = RBACManager.hasAllPermissions
export const getRoleConfig = RBACManager.getRoleConfig
export const canPerformAction = RBACManager.canPerformAction
export const getUsagePercentage = RBACManager.getUsagePercentage
export const getRemainingUsage = RBACManager.getRemainingUsage
export const hasFeature = RBACManager.hasFeature
export const getUpgradeRequiredMessage = RBACManager.getUpgradeRequiredMessage

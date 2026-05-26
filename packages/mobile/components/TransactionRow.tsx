import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useColorScheme } from '@/components/useColorScheme'
import Colors from '@/constants/Colors'
import { BorderRadius, Spacing } from '@/constants/DesignSystem'
import CategoryIcon from '@/components/CategoryIcon'
import AccountIcon from './AccountIcon'
import { formatCurrencyCompact } from '@karsafin/shared'
import type { Transaction } from '@karsafin/shared'

const getAccountColorByName = (name: string): string => {
  const n = name.toLowerCase().trim();
  if (n.includes('bca')) return '#0051d4';
  if (n.includes('permata')) return '#009639';
  if (n.includes('gopay') || n.includes('go-pay') || n.includes('go pay')) return '#00a2e9';
  if (n.includes('shopee') || n.includes('spay')) return '#ee4d2d';
  if (n.includes('mandiri')) return '#003d79';
  if (n.includes('bni')) return '#f97316';
  if (n.includes('bri')) return '#00529b';
  if (n.includes('ovo')) return '#4c2a86';
  if (n.includes('linkaja') || n.includes('link aja')) return '#e52b27';
  if (n.includes('cash') || n.includes('tunai') || n.includes('dompet')) return '#10b981';
  return '#64748b'; // default slate color
};

const lightenColor = (r: number, g: number, b: number, factor: number) => {
  const newR = Math.min(255, Math.round(r + (255 - r) * factor));
  const newG = Math.min(255, Math.round(g + (255 - g) * factor));
  const newB = Math.min(255, Math.round(b + (255 - b) * factor));
  return '#' + 
    newR.toString(16).padStart(2, '0') + 
    newG.toString(16).padStart(2, '0') + 
    newB.toString(16).padStart(2, '0');
};

const darkenColor = (r: number, g: number, b: number, factor: number) => {
  const newR = Math.max(0, Math.round(r * (1 - factor)));
  const newG = Math.max(0, Math.round(g * (1 - factor)));
  const newB = Math.max(0, Math.round(b * (1 - factor)));
  return '#' + 
    newR.toString(16).padStart(2, '0') + 
    newG.toString(16).padStart(2, '0') + 
    newB.toString(16).padStart(2, '0');
};

const getAccountBadgeStyle = (color: string | undefined | null, theme: 'light' | 'dark', themedColors: any) => {
  if (!color) {
    return {
      backgroundColor: themedColors.inputBg,
      borderColor: themedColors.border,
      textColor: themedColors.textSecondary,
    };
  }

  let parsedColor = color.trim();
  if (/^[0-9a-fA-F]{3,6}$/.test(parsedColor)) {
    parsedColor = '#' + parsedColor;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(parsedColor)) {
    parsedColor = '#' + parsedColor[1] + parsedColor[1] + parsedColor[2] + parsedColor[2] + parsedColor[3] + parsedColor[3];
  }

  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(parsedColor);
  if (!isValidHex) {
    return {
      backgroundColor: themedColors.inputBg,
      borderColor: themedColors.border,
      textColor: themedColors.textSecondary,
    };
  }

  const r = parseInt(parsedColor.substring(1, 3), 16);
  const g = parseInt(parsedColor.substring(3, 5), 16);
  const b = parseInt(parsedColor.substring(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (theme === 'light') {
    if (brightness > 210) {
      return {
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        textColor: '#475569',
      };
    } else {
      // Darken bright colors in light mode to guarantee visual contrast/readability
      const darkenedText = brightness > 70 ? darkenColor(r, g, b, 0.35) : parsedColor;
      return {
        backgroundColor: parsedColor + '15',
        borderColor: parsedColor + '30',
        textColor: darkenedText,
      };
    }
  } else {
    if (brightness < 45) {
      return {
        backgroundColor: '#1e293b',
        borderColor: '#475569',
        textColor: '#cbd5e1',
      };
    } else {
      const lightenedColor = brightness < 150 ? lightenColor(r, g, b, 0.35) : parsedColor;
      return {
        backgroundColor: parsedColor + '20',
        borderColor: parsedColor + '50',
        textColor: lightenedColor,
      };
    }
  }
};

export default function TransactionRow({
  transaction,
  onPress,
  onLongPress,
  compact,
  workspaceType,
}: {
  transaction: Transaction
  onPress?: () => void
  onLongPress?: () => void
  compact?: boolean
  workspaceType?: 'personal' | 'family'
}) {
  const colorScheme = useColorScheme() ?? 'dark'
  const colors = Colors[colorScheme]
  const isIncome = transaction.type === 'income'
  const isSavings = transaction.type === 'savings'
  const cat = isSavings
    ? (transaction.category || (transaction.savings ? { name: transaction.savings.name, icon: '🏦', color: Colors.warning } : { name: 'Tabungan', icon: '🏦', color: Colors.warning }))
    : transaction.category

  const catColor = cat?.color || (isIncome ? Colors.success : isSavings ? Colors.warning : Colors.danger)
  const content = (
    <View style={[
      styles.row,
      compact && styles.rowCompact,
      !compact && { backgroundColor: colors.card, borderColor: colors.border },
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: catColor + '18' }]}>
        <CategoryIcon emoji={cat?.icon} size={compact ? 16 : 20} color={catColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.desc, { color: colors.text }]} numberOfLines={1}>
          {transaction.description || cat?.name || 'Lainnya'}
        </Text>
        {!compact && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
            <Text style={[styles.category, { color: colors.textMuted }]}>
              {cat?.name || 'Lainnya'}
            </Text>
            {transaction.source && (transaction.source === 'telegram' || transaction.source === 'telegram-receipt') && (
              <View style={[styles.badge, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                <Text style={[styles.badgeText, { color: '#0284c7' }]}>
                  ✈️ {transaction.sender_name || 'Telegram'}
                </Text>
              </View>
            )}
            {transaction.source && transaction.source === 'whatsapp' && (
              <View style={[styles.badge, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
                <Text style={[styles.badgeText, { color: '#166534' }]}>
                  💬 {transaction.sender_name || 'WA'}
                </Text>
              </View>
            )}
            {transaction.source === 'ai' && (
              <View style={[styles.badge, { backgroundColor: '#f3e8ff', borderColor: '#e9d5ff' }]}>
                <Text style={[styles.badgeText, { color: '#7c3aed' }]}>
                  🤖 AI Asisten
                </Text>
              </View>
            )}
            {transaction.recorderName && workspaceType === 'family' && (
              <View style={[styles.badge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                  👤 {transaction.recorderName}
                </Text>
              </View>
            )}
            {transaction.account && (() => {
              const nameColor = transaction.account.color || getAccountColorByName(transaction.account.name);
              const badgeStyle = getAccountBadgeStyle(nameColor, colorScheme, colors);
              return (
                <View style={[
                  styles.badge,
                  {
                    backgroundColor: badgeStyle.backgroundColor,
                    borderColor: badgeStyle.borderColor,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4
                  }
                ]}>
                  <AccountIcon icon={transaction.account.icon} type={transaction.account.type} size={11} color={badgeStyle.textColor} />
                  <Text style={[styles.badgeText, { color: badgeStyle.textColor }]} numberOfLines={1}>
                    {transaction.account.name}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}
        {compact && (
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </Text>
        )}
      </View>
      <Text style={[styles.amount, { color: isIncome ? Colors.success : isSavings ? Colors.warning : Colors.danger }]}>
        {isIncome ? '+' : isSavings ? '' : '-'}Rp {formatCurrencyCompact(transaction.amount)}
      </Text>
    </View>
  )

  if (!compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={{ marginBottom: Spacing.sm }}
      >
        {content}
      </TouchableOpacity>
    )
  }

  return <>{content}</>
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg - 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  rowCompact: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  desc: {
    fontSize: 14,
    fontWeight: '600',
  },
  category: {
    fontSize: 12,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 1,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
})

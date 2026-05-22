import FontAwesome from '@expo/vector-icons/FontAwesome'

const emojiToIcon: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  '💰': 'money',
  '💵': 'dollar',
  '💳': 'credit-card',
  '🏦': 'bank',
  '📊': 'bar-chart',
  '📈': 'line-chart',
  '💹': 'line-chart',
  '🍔': 'cutlery',
  '🍕': 'cutlery',
  '☕': 'coffee',
  '🛒': 'shopping-cart',
  '🛍️': 'shopping-bag',
  '🚗': 'car',
  '🚌': 'bus',
  '⛽': 'tint',
  '🏠': 'home',
  '📱': 'mobile',
  '💻': 'laptop',
  '🎮': 'gamepad',
  '📺': 'tv',
  '🎵': 'music',
  '🎬': 'film',
  '📚': 'book',
  '🎓': 'graduation-cap',
  '🏥': 'hospital-o',
  '💊': 'medkit',
  '🏋️': 'heartbeat',
  '🎁': 'gift',
  '❤️': 'heart',
  '✈️': 'plane',
  '🏖️': 'sun-o',
  '👶': 'child',
  '🐾': 'paw',
  '📄': 'file-text',
  '⚡': 'bolt',
  '💡': 'lightbulb-o',
  '🔧': 'wrench',
  '📦': 'archive',
  '💸': 'money',
  '✨': 'star',
  '🤖': 'cogs',
  '👨‍💼': 'briefcase',
  '🧾': 'file-text-o',
  '⚖️': 'balance-scale',
  '🎯': 'bullseye',
  '📅': 'calendar',
  '🔗': 'link',
  '👤': 'user',
  '👨‍👩‍👧': 'users',
  '✉️': 'envelope',
  '🎨': 'paint-brush',
  'ℹ️': 'info-circle',
  '🚪': 'sign-out',
}

const fallbackIcon = 'circle-o'

export function getCategoryIcon(emoji: string): React.ComponentProps<typeof FontAwesome>['name'] {
  return emojiToIcon[emoji] || fallbackIcon
}

export default function CategoryIcon({
  emoji,
  size = 18,
  color,
}: {
  emoji?: string | null
  size?: number
  color: string
}) {
  const iconName = getCategoryIcon(emoji || '📦')
  return <FontAwesome name={iconName} size={size} color={color} />
}

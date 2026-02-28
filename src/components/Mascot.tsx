type MascotExpression = 'happy' | 'thinking' | 'sad' | 'celebrating';

interface MascotProps {
  expression?: MascotExpression;
  size?: number;
  className?: string;
}

const EXPRESSION_EMOJI: Record<MascotExpression, string> = {
  happy:       '😛',
  thinking:    '🤔',
  sad:         '😔',
  celebrating: '🥳',
};

export default function Mascot({ expression = 'happy', size = 120, className = '' }: MascotProps) {
  return (
    <span
      style={{ fontSize: size * 0.8, lineHeight: 1 }}
      className={className}
      role="img"
      aria-label={expression}
    >
      {EXPRESSION_EMOJI[expression]}
    </span>
  );
}

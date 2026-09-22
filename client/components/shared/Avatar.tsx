export function Avatar({
  src,
  size = 'h-9 w-9',
  className = '',
  ring = false,
}: {
  src?: string | null;
  size?: string;
  className?: string;
  ring?: boolean;
}) {
  const avatarUrl = src || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop';
  return (
    <img
      src={avatarUrl}
      alt=""
      className={`${size} rounded-full object-cover ${ring ? 'ring-2 ring-white' : ''} ${className}`}
    />
  );
}
